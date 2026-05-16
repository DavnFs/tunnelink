use dashmap::DashMap;
use russh::client::{Config, Handle};
use russh::keys::decode_secret_key;
use serde::Serialize;
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::models::{AuthMethod, ConnectionProfile};
use crate::ssh::client::ClientHandler;

enum TerminalCommand {
    Input(String),
    Resize { cols: u32, rows: u32 },
    Close,
}

#[derive(Clone)]
struct ShellSession {
    profile_id: String,
    tx: mpsc::UnboundedSender<TerminalCommand>,
}

#[derive(Clone)]
pub struct ShellManager {
    sessions: Arc<DashMap<String, ShellSession>>,
}

#[derive(Clone, Serialize)]
struct TerminalOutputEvent {
    session_id: String,
    data: String,
}

#[derive(Clone, Serialize)]
struct TerminalStatusEvent {
    session_id: String,
    state: String,
    message: Option<String>,
}

impl ShellManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(DashMap::new()),
        }
    }

    fn insert(
        &self,
        session_id: String,
        profile_id: String,
        tx: mpsc::UnboundedSender<TerminalCommand>,
    ) {
        self.sessions
            .insert(session_id, ShellSession { profile_id, tx });
    }

    fn remove(&self, session_id: &str) {
        self.sessions.remove(session_id);
    }

    pub fn send_input(&self, session_id: &str, data: String) -> Result<(), String> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| format!("Terminal session {} is not active.", session_id))?;

        session
            .tx
            .send(TerminalCommand::Input(data))
            .map_err(|_| format!("Terminal session {} is closed.", session_id))
    }

    pub fn resize(&self, session_id: &str, cols: u32, rows: u32) -> Result<(), String> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| format!("Terminal session {} is not active.", session_id))?;

        session
            .tx
            .send(TerminalCommand::Resize { cols, rows })
            .map_err(|_| format!("Terminal session {} is closed.", session_id))
    }

    pub fn close(&self, session_id: &str) -> Result<(), String> {
        let Some((_, session)) = self.sessions.remove(session_id) else {
            return Ok(());
        };

        let _ = session.tx.send(TerminalCommand::Close);
        Ok(())
    }

    pub fn close_by_profile(&self, profile_id: &str) {
        let session_ids: Vec<String> = self
            .sessions
            .iter()
            .filter(|entry| entry.profile_id == profile_id)
            .map(|entry| entry.key().clone())
            .collect();

        for session_id in session_ids {
            let _ = self.close(&session_id);
        }
    }
}

pub fn spawn_shell_session(
    profile: ConnectionProfile,
    app_handle: tauri::AppHandle,
    manager: ShellManager,
    cols: u32,
    rows: u32,
) -> String {
    let session_id = Uuid::new_v4().to_string();
    let (tx, rx) = mpsc::unbounded_channel();

    manager.insert(session_id.clone(), profile.id.clone(), tx);

    let task_session_id = session_id.clone();
    tokio::spawn(async move {
        tokio::task::yield_now().await;
        run_shell_session(
            task_session_id,
            profile,
            app_handle,
            manager,
            rx,
            cols,
            rows,
        )
        .await;
    });

    session_id
}

async fn run_shell_session(
    session_id: String,
    profile: ConnectionProfile,
    app_handle: tauri::AppHandle,
    manager: ShellManager,
    mut rx: mpsc::UnboundedReceiver<TerminalCommand>,
    cols: u32,
    rows: u32,
) {
    emit_status(&app_handle, &session_id, "connecting", None);

    let result = async {
        let session = connect_authenticated(&profile).await?;
        let mut channel = session
            .channel_open_session()
            .await
            .map_err(|e| format!("Failed to open shell channel: {}", e))?;

        channel
            .request_pty(true, "xterm-256color", cols, rows, 0, 0, &[])
            .await
            .map_err(|e| format!("Failed to request PTY: {}", e))?;
        channel
            .request_shell(true)
            .await
            .map_err(|e| format!("Failed to start remote shell: {}", e))?;

        emit_status(&app_handle, &session_id, "connected", None);

        loop {
            tokio::select! {
                Some(command) = rx.recv() => {
                    match command {
                        TerminalCommand::Input(data) => {
                            channel
                                .data(data.as_bytes())
                                .await
                                .map_err(|e| format!("Failed to send terminal input: {}", e))?;
                        }
                        TerminalCommand::Resize { cols, rows } => {
                            channel
                                .window_change(cols, rows, 0, 0)
                                .await
                                .map_err(|e| format!("Failed to resize terminal: {}", e))?;
                        }
                        TerminalCommand::Close => {
                            let _ = channel.close().await;
                            let _ = session
                                .disconnect(russh::Disconnect::ByApplication, "Terminal closed", "en-US")
                                .await;
                            break;
                        }
                    }
                }
                msg = channel.wait() => {
                    match msg {
                        Some(russh::ChannelMsg::Data { data }) => {
                            emit_output(&app_handle, &session_id, String::from_utf8_lossy(&data).to_string());
                        }
                        Some(russh::ChannelMsg::ExtendedData { data, .. }) => {
                            emit_output(&app_handle, &session_id, String::from_utf8_lossy(&data).to_string());
                        }
                        Some(russh::ChannelMsg::ExitStatus { exit_status }) => {
                            return Err(format!("Remote shell exited with status {}", exit_status));
                        }
                        Some(russh::ChannelMsg::ExitSignal { signal_name, error_message, .. }) => {
                            return Err(format!("Remote shell exited on signal {:?}: {}", signal_name, error_message));
                        }
                        Some(russh::ChannelMsg::Eof) | Some(russh::ChannelMsg::Close) | None => {
                            break;
                        }
                        _ => {}
                    }
                }
            }
        }

        Ok::<(), String>(())
    }
    .await;

    match result {
        Ok(()) => emit_status(&app_handle, &session_id, "closed", None),
        Err(err) => {
            log::error!("Terminal session {} failed: {}", session_id, err);
            emit_status(&app_handle, &session_id, "error", Some(err));
        }
    }

    manager.remove(&session_id);
}

async fn connect_authenticated(
    profile: &ConnectionProfile,
) -> Result<Handle<ClientHandler>, String> {
    let config = Arc::new(Config { ..<_>::default() });
    let addr = format!("{}:{}", profile.host, profile.port);

    let mut session = russh::client::connect(config, addr, ClientHandler)
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    let auth_res = match profile.auth_method {
        AuthMethod::Password => {
            if let Some(password) = &profile.password_enc {
                session
                    .authenticate_password(profile.username.clone(), password.clone())
                    .await
            } else {
                return Err("Profile has no stored password.".into());
            }
        }
        AuthMethod::Key => {
            if let Some(key_path) = &profile.key_path {
                let key_content = std::fs::read_to_string(key_path)
                    .map_err(|e| format!("Failed to read SSH key file: {}", e))?;
                let key_pair = decode_secret_key(&key_content, None)
                    .map_err(|e| format!("Failed to parse SSH key: {}", e))?;

                session
                    .authenticate_publickey(profile.username.clone(), Arc::new(key_pair))
                    .await
            } else {
                return Err("Profile has no SSH key path.".into());
            }
        }
    };

    let auth_success = auth_res.map_err(|e| format!("Authentication error: {}", e))?;
    if !auth_success {
        return Err("Authentication failed.".into());
    }

    Ok(session)
}

fn emit_output(app_handle: &tauri::AppHandle, session_id: &str, data: String) {
    let _ = app_handle.emit(
        "terminal-output",
        TerminalOutputEvent {
            session_id: session_id.to_string(),
            data,
        },
    );
}

fn emit_status(
    app_handle: &tauri::AppHandle,
    session_id: &str,
    state: &str,
    message: Option<String>,
) {
    let _ = app_handle.emit(
        "terminal-status",
        TerminalStatusEvent {
            session_id: session_id.to_string(),
            state: state.to_string(),
            message,
        },
    );
}
