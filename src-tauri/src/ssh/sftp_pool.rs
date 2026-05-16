use dashmap::DashMap;
use russh::client::Handle;
use russh_sftp::client::SftpSession;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

use crate::models::ConnectionProfile;
use crate::ssh::auth::connect_authenticated;
use crate::ssh::client::ClientHandler;

const IDLE_TIMEOUT: Duration = Duration::from_secs(5 * 60);

pub struct SftpConnection {
    pub sftp: SftpSession,
    ssh: Handle<ClientHandler>,
    last_used: Instant,
}

impl SftpConnection {
    pub fn touch(&mut self) {
        self.last_used = Instant::now();
    }

    fn is_idle(&self) -> bool {
        self.last_used.elapsed() > IDLE_TIMEOUT
    }
}

#[derive(Clone)]
pub struct SftpManager {
    sessions: Arc<DashMap<String, Arc<Mutex<SftpConnection>>>>,
}

impl SftpManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(DashMap::new()),
        }
    }

    pub async fn get_or_connect(
        &self,
        profile: ConnectionProfile,
    ) -> Result<Arc<Mutex<SftpConnection>>, String> {
        if let Some(existing) = self.sessions.get(&profile.id).map(|entry| entry.clone()) {
            let is_idle = existing.lock().await.is_idle();
            if !is_idle {
                return Ok(existing);
            }

            self.sessions.remove(&profile.id);
            close_connection(existing).await;
        }

        let connection = open_sftp_connection(&profile).await?;
        let entry = Arc::new(Mutex::new(connection));
        self.sessions.insert(profile.id, entry.clone());

        Ok(entry)
    }

    pub async fn close_by_profile(&self, profile_id: &str) {
        let Some((_, session)) = self.sessions.remove(profile_id) else {
            return;
        };

        close_connection(session).await;
    }
}

async fn open_sftp_connection(profile: &ConnectionProfile) -> Result<SftpConnection, String> {
    let ssh = connect_authenticated(profile).await?;
    let channel = ssh
        .channel_open_session()
        .await
        .map_err(|e| format!("Failed to open SFTP channel: {}", e))?;

    channel
        .request_subsystem(true, "sftp")
        .await
        .map_err(|e| format!("Failed to start SFTP subsystem: {}", e))?;

    let sftp = SftpSession::new(channel.into_stream())
        .await
        .map_err(|e| format!("Failed to initialize SFTP session: {}", e))?;

    Ok(SftpConnection {
        sftp,
        ssh,
        last_used: Instant::now(),
    })
}

async fn close_connection(session: Arc<Mutex<SftpConnection>>) {
    let connection = session.lock().await;
    let _ = connection.sftp.close().await;
    let _ = connection
        .ssh
        .disconnect(russh::Disconnect::ByApplication, "SFTP closed", "en-US")
        .await;
}
