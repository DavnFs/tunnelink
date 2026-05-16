use serde::Serialize;
use tauri::State;

use crate::commands::profile::AppState;
use crate::db;
use crate::ssh::manager::TunnelManager;
use crate::ssh::shell::{spawn_shell_session, ShellManager};

#[derive(Serialize)]
pub struct TerminalSessionInfo {
    session_id: String,
}

#[tauri::command]
pub async fn open_terminal(
    profile_id: String,
    cols: u32,
    rows: u32,
    state: State<'_, AppState>,
    tunnel_manager: State<'_, TunnelManager>,
    shell_manager: State<'_, ShellManager>,
    app_handle: tauri::AppHandle,
) -> Result<TerminalSessionInfo, String> {
    if !tunnel_manager.is_active(&profile_id) {
        return Err("Connect the tunnel before opening a terminal.".into());
    }

    let mut profile = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        db::get_profile_by_id(&conn, &profile_id)?
    };

    if let Some(enc_pwd) = profile.password_enc.take() {
        profile.password_enc = Some(state.crypto.decrypt(&enc_pwd)?);
    }

    let cols = cols.clamp(20, 240);
    let rows = rows.clamp(5, 120);
    let session_id = spawn_shell_session(
        profile,
        app_handle,
        shell_manager.inner().clone(),
        cols,
        rows,
    );

    Ok(TerminalSessionInfo { session_id })
}

#[tauri::command]
pub fn send_terminal_input(
    session_id: String,
    data: String,
    shell_manager: State<'_, ShellManager>,
) -> Result<(), String> {
    shell_manager.send_input(&session_id, data)
}

#[tauri::command]
pub fn resize_terminal(
    session_id: String,
    cols: u32,
    rows: u32,
    shell_manager: State<'_, ShellManager>,
) -> Result<(), String> {
    shell_manager.resize(&session_id, cols.clamp(20, 240), rows.clamp(5, 120))
}

#[tauri::command]
pub fn close_terminal(
    session_id: String,
    shell_manager: State<'_, ShellManager>,
) -> Result<(), String> {
    shell_manager.close(&session_id)
}
