use async_trait::async_trait;
use russh::client::Handler;
use russh::keys::key::PublicKey;

#[derive(Clone)]
pub struct ClientHandler;

#[async_trait]
impl Handler for ClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &PublicKey,
    ) -> Result<bool, Self::Error> {
        // For MVP, we implicitly accept all host keys (similar to StrictHostKeyChecking=no).
        // In a production app, we should verify against known_hosts.
        Ok(true)
    }

    async fn disconnected(
        &mut self,
        reason: russh::client::DisconnectReason<Self::Error>,
    ) -> Result<(), Self::Error> {
        log::debug!("disconnected: {:?}", reason);
        match reason {
            russh::client::DisconnectReason::ReceivedDisconnect(_) => Ok(()),
            russh::client::DisconnectReason::Error(e) => Err(e),
        }
    }
}
