use russh::client::Config;
use russh::keys::decode_secret_key;
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::broadcast;

use crate::models::{AuthMethod, ConnectionProfile, ForwardKind, TunnelState, TunnelStatus};
use crate::ssh::client::ClientHandler;
use crate::ssh::forward::start_local_forward;

async fn emit_status(app_handle: &tauri::AppHandle, status: TunnelStatus) {
    let _ = app_handle.emit("tunnel-status-changed", &status);
}

pub async fn start_ssh_session(
    profile: ConnectionProfile,
    app_handle: tauri::AppHandle,
    mut shutdown_rx: broadcast::Receiver<()>,
) {
    let profile_id = profile.id.clone();

    // Initial connecting state
    let mut current_status = TunnelStatus {
        profile_id: profile_id.clone(),
        state: TunnelState::Connecting,
        error_msg: None,
        started_at: None,
        active_rules: vec![],
    };
    emit_status(&app_handle, current_status.clone()).await;

    // Build configuration
    let config = Arc::new(Config { ..<_>::default() });

    let addr = format!("{}:{}", profile.host, profile.port);

    // Try to connect
    log::info!("Connecting to SSH at {}", addr);
    let connect_res = tokio::select! {
        res = russh::client::connect(config, addr, ClientHandler) => res,
        _ = shutdown_rx.recv() => {
            log::info!("SSH connection cancelled before established");
            return;
        }
    };

    let mut session = match connect_res {
        Ok(s) => s,
        Err(e) => {
            current_status.state = TunnelState::Error;
            current_status.error_msg = Some(format!("Failed to connect: {}", e));
            emit_status(&app_handle, current_status).await;
            return;
        }
    };

    // Authenticate
    log::info!("Authenticating as {}...", profile.username);
    let auth_res = match profile.auth_method {
        AuthMethod::Password => {
            if let Some(pwd) = profile.password_enc {
                session
                    .authenticate_password(profile.username.clone(), pwd)
                    .await
            } else {
                Err(russh::Error::SendError) // Should not happen, checked by command handler
            }
        }
        AuthMethod::Key => {
            if let Some(key_path) = &profile.key_path {
                match std::fs::read_to_string(key_path) {
                    Ok(key_content) => {
                        // We use russh_keys to parse the private key. For MVP, no passphrase support.
                        match decode_secret_key(&key_content, None) {
                            Ok(key_pair) => {
                                session
                                    .authenticate_publickey(
                                        profile.username.clone(),
                                        Arc::new(key_pair),
                                    )
                                    .await
                            }
                            Err(e) => {
                                current_status.state = TunnelState::Error;
                                current_status.error_msg =
                                    Some(format!("Failed to parse SSH key: {}", e));
                                emit_status(&app_handle, current_status).await;
                                return;
                            }
                        }
                    }
                    Err(e) => {
                        current_status.state = TunnelState::Error;
                        current_status.error_msg =
                            Some(format!("Failed to read SSH key file: {}", e));
                        emit_status(&app_handle, current_status).await;
                        return;
                    }
                }
            } else {
                Err(russh::Error::SendError)
            }
        }
    };

    let auth_success = match auth_res {
        Ok(success) => success,
        Err(e) => {
            current_status.state = TunnelState::Error;
            current_status.error_msg = Some(format!("Authentication error: {}", e));
            emit_status(&app_handle, current_status).await;
            return;
        }
    };

    if !auth_success {
        current_status.state = TunnelState::Error;
        current_status.error_msg = Some("Authentication failed (invalid password or key)".into());
        emit_status(&app_handle, current_status).await;
        return;
    }

    log::info!("Authentication successful!");
    current_status.state = TunnelState::Connected;
    current_status.started_at = Some(chrono::Utc::now().to_rfc3339());
    emit_status(&app_handle, current_status.clone()).await;

    // Wrap the session in Arc Mutex so we can share it with port forwarding tasks
    let session_arc = Arc::new(tokio::sync::Mutex::new(session));

    // Start port forwards
    let mut local_rules = vec![];
    for rule in profile.forwards {
        if rule.auto_start && rule.kind == ForwardKind::Local {
            local_rules.push(rule);
        } else if rule.auto_start {
            log::warn!(
                "Only Local port forwarding is supported in this version. Skipping rule: {}",
                rule.label
            );
        }
    }

    let mut join_handles = vec![];
    for rule in local_rules.clone() {
        let ssh_handle = session_arc.clone();
        let shutdown_rx_clone = shutdown_rx.resubscribe();
        let app_handle_clone = app_handle.clone();
        let profile_id_clone = profile_id.clone();

        let handle = tokio::spawn(async move {
            let _ = start_local_forward(
                rule,
                ssh_handle,
                shutdown_rx_clone,
                app_handle_clone,
                profile_id_clone,
            )
            .await;
        });
        join_handles.push(handle);
    }

    current_status.active_rules = local_rules;
    emit_status(&app_handle, current_status.clone()).await;

    // Keep session alive and wait for disconnect or shutdown signal
    loop {
        tokio::select! {
            _ = tokio::time::sleep(std::time::Duration::from_secs(1)) => {
                let is_closed = session_arc.lock().await.is_closed();
                if is_closed {
                    log::info!("SSH session for profile {} disconnected.", profile_id);
                    current_status.state = TunnelState::Disconnected;
                    current_status.active_rules = vec![];
                    emit_status(&app_handle, current_status.clone()).await;
                    break;
                }
            }
            _ = shutdown_rx.recv() => {
                log::info!("Received shutdown signal for profile {}.", profile_id);
                let _ = session_arc.lock().await.disconnect(russh::Disconnect::ByApplication, "Closed by user", "en-US").await;
                current_status.state = TunnelState::Disconnected;
                current_status.active_rules = vec![];
                emit_status(&app_handle, current_status.clone()).await;
                break;
            }
        }
    }

    // Wait for all forwards to stop
    for h in join_handles {
        let _ = h.await;
    }
}
