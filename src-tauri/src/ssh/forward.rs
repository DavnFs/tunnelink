use russh::client::Handle;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::broadcast;

use crate::models::ForwardRule;

pub async fn start_local_forward(
    rule: ForwardRule,
    ssh_handle: Arc<tokio::sync::Mutex<Handle<crate::ssh::client::ClientHandler>>>,
    mut shutdown_rx: broadcast::Receiver<()>,
    _app_handle: tauri::AppHandle,
    _profile_id: String,
) -> Result<(), String> {
    let bind_addr = format!("127.0.0.1:{}", rule.local_port);
    let listener = TcpListener::bind(&bind_addr)
        .await
        .map_err(|e| format!("Failed to bind local port {}: {}", rule.local_port, e))?;

    log::info!(
        "Started local forward on {} -> {}:{}",
        bind_addr,
        rule.remote_host,
        rule.remote_port
    );

    loop {
        tokio::select! {
            _ = shutdown_rx.recv() => {
                log::info!("Stopping local forward listener on {}", bind_addr);
                break;
            }
            accept_res = listener.accept() => {
                match accept_res {
                    Ok((mut local_stream, _addr)) => {
                        let ssh_handle_clone = ssh_handle.clone();
                        let remote_host = rule.remote_host.clone();
                        let remote_port = rule.remote_port;

                        tokio::spawn(async move {
                            let channel_res = ssh_handle_clone.lock().await.channel_open_direct_tcpip(remote_host.clone(), remote_port as u32, "localhost", 0).await;
                            match channel_res {
                                Ok(mut channel) => {
                                    // Manually implement bidirectional copy instead of tokio::io::copy_bidirectional
                                    // because russh's Channel stream handling requires it
                                    let mut local_buf = [0u8; 8192];

                                    loop {
                                        tokio::select! {
                                            // Read from local, write to SSH
                                            n = local_stream.read(&mut local_buf) => {
                                                match n {
                                                    Ok(0) => break, // EOF
                                                    Ok(n) => {
                                                        if let Err(_) = channel.data(&local_buf[..n]).await {
                                                            break;
                                                        }
                                                    }
                                                    Err(_) => break,
                                                }
                                            }
                                            // Read from SSH, write to local
                                            msg = channel.wait() => {
                                                match msg {
                                                    Some(russh::ChannelMsg::Data { ref data }) => {
                                                        if let Err(_) = local_stream.write_all(data).await {
                                                            break;
                                                        }
                                                    }
                                                    Some(russh::ChannelMsg::Eof) => break,
                                                    Some(russh::ChannelMsg::Close) => break,
                                                    None => break,
                                                    _ => {}
                                                }
                                            }
                                        }
                                    }
                                }
                                Err(e) => {
                                    log::error!("Failed to open SSH direct tcpip channel to {}:{}: {}", remote_host, remote_port, e);
                                }
                            }
                        });
                    }
                    Err(e) => {
                        log::error!("Failed to accept connection on {}: {}", bind_addr, e);
                    }
                }
            }
        }
    }

    Ok(())
}
