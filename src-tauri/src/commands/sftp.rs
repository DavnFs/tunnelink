use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{Emitter, State};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

use crate::commands::profile::AppState;
use crate::db;
use crate::models::ConnectionProfile;
use crate::ssh::manager::TunnelManager;
use crate::ssh::sftp_pool::SftpManager;

const TRANSFER_CHUNK_SIZE: usize = 64 * 1024;

#[derive(Serialize)]
pub struct SftpFileEntry {
    name: String,
    path: String,
    kind: String,
    size: u64,
    modified: Option<u32>,
    permissions: Option<u32>,
}

#[derive(Serialize)]
pub struct SftpListResponse {
    path: String,
    entries: Vec<SftpFileEntry>,
}

#[derive(Clone, Serialize)]
pub struct SftpTransferEvent {
    profile_id: String,
    direction: String,
    local_path: String,
    remote_path: String,
    transferred: u64,
    total: u64,
    state: String,
}

#[derive(Serialize)]
pub struct SftpDownloadResult {
    local_path: String,
}

#[tauri::command]
pub async fn sftp_list_dir(
    profile_id: String,
    remote_path: String,
    state: State<'_, AppState>,
    tunnel_manager: State<'_, TunnelManager>,
    sftp_manager: State<'_, SftpManager>,
) -> Result<SftpListResponse, String> {
    let profile = load_sftp_profile(&profile_id, state.inner(), tunnel_manager.inner())?;
    let session = sftp_manager.get_or_connect(profile).await?;
    let mut connection = session.lock().await;
    let requested_path = normalize_remote_path(&remote_path);
    let path = connection
        .sftp
        .canonicalize(requested_path.clone())
        .await
        .unwrap_or(requested_path);
    let mut entries = Vec::new();

    for entry in connection
        .sftp
        .read_dir(path.clone())
        .await
        .map_err(|e| format!("Failed to list remote directory: {}", e))?
    {
        let metadata = entry.metadata();
        let kind = if metadata.is_dir() {
            "directory"
        } else if metadata.is_symlink() {
            "symlink"
        } else {
            "file"
        };
        let name = entry.file_name();

        entries.push(SftpFileEntry {
            path: join_remote_path(&path, &name),
            name,
            kind: kind.to_string(),
            size: metadata.len(),
            modified: metadata.mtime,
            permissions: metadata.permissions,
        });
    }

    entries.sort_by(|a, b| match (a.kind.as_str(), b.kind.as_str()) {
        ("directory", "directory") => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        ("directory", _) => std::cmp::Ordering::Less,
        (_, "directory") => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    connection.touch();

    Ok(SftpListResponse { path, entries })
}

#[tauri::command]
pub async fn sftp_mkdir(
    profile_id: String,
    remote_path: String,
    state: State<'_, AppState>,
    tunnel_manager: State<'_, TunnelManager>,
    sftp_manager: State<'_, SftpManager>,
) -> Result<(), String> {
    let path = normalize_remote_path(&remote_path);
    if path == "/" {
        return Err("Cannot create root directory.".into());
    }

    let profile = load_sftp_profile(&profile_id, state.inner(), tunnel_manager.inner())?;
    let session = sftp_manager.get_or_connect(profile).await?;
    let mut connection = session.lock().await;
    connection
        .sftp
        .create_dir(path)
        .await
        .map_err(|e| format!("Failed to create remote directory: {}", e))?;
    connection.touch();

    Ok(())
}

#[tauri::command]
pub async fn sftp_delete(
    profile_id: String,
    remote_path: String,
    is_dir: bool,
    state: State<'_, AppState>,
    tunnel_manager: State<'_, TunnelManager>,
    sftp_manager: State<'_, SftpManager>,
) -> Result<(), String> {
    let path = normalize_remote_path(&remote_path);
    if path == "/" {
        return Err("Cannot delete root directory.".into());
    }

    let profile = load_sftp_profile(&profile_id, state.inner(), tunnel_manager.inner())?;
    let session = sftp_manager.get_or_connect(profile).await?;
    let mut connection = session.lock().await;
    if is_dir {
        connection
            .sftp
            .remove_dir(path)
            .await
            .map_err(|e| format!("Failed to delete remote directory: {}", e))?;
    } else {
        connection
            .sftp
            .remove_file(path)
            .await
            .map_err(|e| format!("Failed to delete remote file: {}", e))?;
    }
    connection.touch();

    Ok(())
}

#[tauri::command]
pub async fn sftp_rename(
    profile_id: String,
    old_path: String,
    new_path: String,
    state: State<'_, AppState>,
    tunnel_manager: State<'_, TunnelManager>,
    sftp_manager: State<'_, SftpManager>,
) -> Result<(), String> {
    let old_path = normalize_remote_path(&old_path);
    let new_path = normalize_remote_path(&new_path);
    if old_path == "/" || new_path == "/" {
        return Err("Cannot rename root directory.".into());
    }

    let profile = load_sftp_profile(&profile_id, state.inner(), tunnel_manager.inner())?;
    let session = sftp_manager.get_or_connect(profile).await?;
    let mut connection = session.lock().await;
    connection
        .sftp
        .rename(old_path, new_path)
        .await
        .map_err(|e| format!("Failed to rename remote item: {}", e))?;
    connection.touch();

    Ok(())
}

#[tauri::command]
pub async fn sftp_upload(
    profile_id: String,
    local_path: String,
    remote_path: String,
    state: State<'_, AppState>,
    tunnel_manager: State<'_, TunnelManager>,
    sftp_manager: State<'_, SftpManager>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let profile = load_sftp_profile(&profile_id, state.inner(), tunnel_manager.inner())?;
    let local_metadata = tokio::fs::metadata(&local_path)
        .await
        .map_err(|e| format!("Failed to read local file metadata: {}", e))?;
    if !local_metadata.is_file() {
        return Err("Upload source must be a local file.".into());
    }

    let remote_path = normalize_remote_path(&remote_path);
    let total = local_metadata.len();
    let mut local_file = tokio::fs::File::open(&local_path)
        .await
        .map_err(|e| format!("Failed to open local file: {}", e))?;
    let session = sftp_manager.get_or_connect(profile).await?;
    let mut connection = session.lock().await;
    let mut remote_file = connection
        .sftp
        .create(remote_path.clone())
        .await
        .map_err(|e| format!("Failed to create remote file: {}", e))?;
    let mut transferred = 0;
    let mut buffer = vec![0; TRANSFER_CHUNK_SIZE];

    emit_transfer(
        &app_handle,
        &profile_id,
        "upload",
        &local_path,
        &remote_path,
        transferred,
        total,
        "started",
    );

    loop {
        let read = local_file
            .read(&mut buffer)
            .await
            .map_err(|e| format!("Failed to read local file: {}", e))?;
        if read == 0 {
            break;
        }

        remote_file
            .write_all(&buffer[..read])
            .await
            .map_err(|e| format!("Failed to write remote file: {}", e))?;
        transferred += read as u64;

        emit_transfer(
            &app_handle,
            &profile_id,
            "upload",
            &local_path,
            &remote_path,
            transferred,
            total,
            "progress",
        );
    }

    remote_file
        .shutdown()
        .await
        .map_err(|e| format!("Failed to close remote file: {}", e))?;
    connection.touch();
    emit_transfer(
        &app_handle,
        &profile_id,
        "upload",
        &local_path,
        &remote_path,
        transferred,
        total,
        "completed",
    );

    Ok(())
}

#[tauri::command]
pub async fn sftp_download(
    profile_id: String,
    remote_path: String,
    local_dir: String,
    state: State<'_, AppState>,
    tunnel_manager: State<'_, TunnelManager>,
    sftp_manager: State<'_, SftpManager>,
    app_handle: tauri::AppHandle,
) -> Result<SftpDownloadResult, String> {
    let profile = load_sftp_profile(&profile_id, state.inner(), tunnel_manager.inner())?;
    let remote_path = normalize_remote_path(&remote_path);
    let file_name = file_name_from_remote_path(&remote_path)?;
    let local_path = Path::new(&local_dir).join(file_name);
    let local_path_string = path_to_string(&local_path)?;
    let session = sftp_manager.get_or_connect(profile).await?;
    let mut connection = session.lock().await;
    let total = connection
        .sftp
        .metadata(remote_path.clone())
        .await
        .map(|metadata| metadata.len())
        .unwrap_or(0);
    let mut remote_file = connection
        .sftp
        .open(remote_path.clone())
        .await
        .map_err(|e| format!("Failed to open remote file: {}", e))?;
    let mut local_file = tokio::fs::File::create(&local_path)
        .await
        .map_err(|e| format!("Failed to create local file: {}", e))?;
    let mut transferred = 0;
    let mut buffer = vec![0; TRANSFER_CHUNK_SIZE];

    emit_transfer(
        &app_handle,
        &profile_id,
        "download",
        &local_path_string,
        &remote_path,
        transferred,
        total,
        "started",
    );

    loop {
        let read = remote_file
            .read(&mut buffer)
            .await
            .map_err(|e| format!("Failed to read remote file: {}", e))?;
        if read == 0 {
            break;
        }

        local_file
            .write_all(&buffer[..read])
            .await
            .map_err(|e| format!("Failed to write local file: {}", e))?;
        transferred += read as u64;

        emit_transfer(
            &app_handle,
            &profile_id,
            "download",
            &local_path_string,
            &remote_path,
            transferred,
            total,
            "progress",
        );
    }

    local_file
        .flush()
        .await
        .map_err(|e| format!("Failed to flush local file: {}", e))?;
    connection.touch();
    emit_transfer(
        &app_handle,
        &profile_id,
        "download",
        &local_path_string,
        &remote_path,
        transferred,
        total,
        "completed",
    );

    Ok(SftpDownloadResult {
        local_path: local_path_string,
    })
}

fn load_sftp_profile(
    profile_id: &str,
    state: &AppState,
    tunnel_manager: &TunnelManager,
) -> Result<ConnectionProfile, String> {
    if !tunnel_manager.is_active(profile_id) {
        return Err("Connect the tunnel before using Files.".into());
    }

    let mut profile = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        db::get_profile_by_id(&conn, profile_id)?
    };

    if let Some(enc_pwd) = profile.password_enc.take() {
        profile.password_enc = Some(state.crypto.decrypt(&enc_pwd)?);
    }

    Ok(profile)
}

fn emit_transfer(
    app_handle: &tauri::AppHandle,
    profile_id: &str,
    direction: &str,
    local_path: &str,
    remote_path: &str,
    transferred: u64,
    total: u64,
    state: &str,
) {
    let _ = app_handle.emit(
        "sftp-transfer",
        SftpTransferEvent {
            profile_id: profile_id.to_string(),
            direction: direction.to_string(),
            local_path: local_path.to_string(),
            remote_path: remote_path.to_string(),
            transferred,
            total,
            state: state.to_string(),
        },
    );
}

fn normalize_remote_path(path: &str) -> String {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        ".".to_string()
    } else if trimmed != "/" && trimmed.ends_with('/') {
        trimmed.trim_end_matches('/').to_string()
    } else {
        trimmed.to_string()
    }
}

fn join_remote_path(base: &str, name: &str) -> String {
    if base == "/" {
        format!("/{}", name)
    } else {
        format!("{}/{}", base.trim_end_matches('/'), name)
    }
}

fn file_name_from_remote_path(path: &str) -> Result<&str, String> {
    path.rsplit('/')
        .find(|part| !part.is_empty())
        .ok_or_else(|| "Remote path must include a file name.".into())
}

fn path_to_string(path: &PathBuf) -> Result<String, String> {
    path.to_str()
        .map(ToString::to_string)
        .ok_or_else(|| "Local path is not valid UTF-8.".into())
}

#[cfg(test)]
mod tests {
    use super::{file_name_from_remote_path, join_remote_path, normalize_remote_path};

    #[test]
    fn join_remote_path_keeps_root_paths_valid() {
        assert_eq!(join_remote_path("/", "data.csv"), "/data.csv");
        assert_eq!(
            join_remote_path("/home/davin", "data.csv"),
            "/home/davin/data.csv"
        );
        assert_eq!(
            join_remote_path("/home/davin/", "data.csv"),
            "/home/davin/data.csv"
        );
    }

    #[test]
    fn normalize_remote_path_preserves_root_and_relative_home() {
        assert_eq!(normalize_remote_path("/"), "/");
        assert_eq!(normalize_remote_path("/home/davin/"), "/home/davin");
        assert_eq!(normalize_remote_path(""), ".");
    }

    #[test]
    fn file_name_from_remote_path_rejects_directory_root() {
        assert_eq!(file_name_from_remote_path("/tmp/train.py"), Ok("train.py"));
        assert!(file_name_from_remote_path("/").is_err());
    }
}
