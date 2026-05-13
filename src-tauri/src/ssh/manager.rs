use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::broadcast;

#[derive(Clone)]
pub struct TunnelManager {
    // Maps profile_id to a shutdown signal sender
    active_tunnels: Arc<DashMap<String, broadcast::Sender<()>>>,
}

impl TunnelManager {
    pub fn new() -> Self {
        Self {
            active_tunnels: Arc::new(DashMap::new()),
        }
    }

    /// Registers a new active tunnel and returns the receiver for the shutdown signal.
    pub fn register(&self, profile_id: &str) -> broadcast::Receiver<()> {
        let (tx, rx) = broadcast::channel(1);
        self.active_tunnels.insert(profile_id.to_string(), tx);
        rx
    }

    /// Signals the tunnel to stop and removes it from active tracking.
    pub fn stop(&self, profile_id: &str) -> Result<(), String> {
        if let Some((_, tx)) = self.active_tunnels.remove(profile_id) {
            let _ = tx.send(()); // Ignore error if there are no receivers
            Ok(())
        } else {
            Err(format!("Tunnel {} is not currently active.", profile_id))
        }
    }

    pub fn is_active(&self, profile_id: &str) -> bool {
        self.active_tunnels.contains_key(profile_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn register_marks_tunnel_active_until_stop_sends_shutdown() {
        let manager = TunnelManager::new();
        let mut shutdown_rx = manager.register("profile-1");

        assert!(manager.is_active("profile-1"));
        manager
            .stop("profile-1")
            .expect("active tunnel can be stopped");
        assert!(!manager.is_active("profile-1"));
        assert!(shutdown_rx.try_recv().is_ok());
    }

    #[test]
    fn stopping_unknown_tunnel_fails_loudly() {
        let manager = TunnelManager::new();

        let err = manager
            .stop("missing-profile")
            .expect_err("unknown tunnel should fail");

        assert!(err.contains("missing-profile"));
    }
}
