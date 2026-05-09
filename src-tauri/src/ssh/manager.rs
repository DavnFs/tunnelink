use dashmap::DashMap;
use tokio::sync::broadcast;
use std::sync::Arc;

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
