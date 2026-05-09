use tauri::State;
use crate::models::TunnelStatus;
use crate::commands::profile::AppState;
use crate::ssh::manager::TunnelManager;
use crate::ssh::connection::start_ssh_session;
use crate::db;

#[tauri::command]
pub async fn start_tunnel(
    profile_id: String,
    state: State<'_, AppState>,
    manager: State<'_, TunnelManager>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    if manager.is_active(&profile_id) {
        return Err("Tunnel is already active or connecting".into());
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut profile = db::get_profile_by_id(&conn, &profile_id)?;
    
    // Decrypt password if it exists
    if let Some(enc_pwd) = profile.password_enc.take() {
        let dec_pwd = state.crypto.decrypt(&enc_pwd)?;
        profile.password_enc = Some(dec_pwd); // we temporarily store the plaintext password in password_enc for the ssh session to use
    }

    let shutdown_rx = manager.register(&profile_id);

    tokio::spawn(async move {
        start_ssh_session(profile, app_handle, shutdown_rx).await;
    });

    Ok(())
}

#[tauri::command]
pub fn stop_tunnel(
    profile_id: String,
    manager: State<'_, TunnelManager>,
) -> Result<(), String> {
    manager.stop(&profile_id)
}

#[tauri::command]
pub fn get_tunnel_statuses() -> Result<Vec<TunnelStatus>, String> {
    // Current active statuses will be tracked in the frontend React state
    // We just keep this stub if we need to poll later
    Ok(vec![])
}
