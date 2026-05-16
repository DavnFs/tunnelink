use russh::client::{Config, Handle};
use russh::keys::decode_secret_key;
use std::sync::Arc;

use crate::models::{AuthMethod, ConnectionProfile};
use crate::ssh::client::ClientHandler;

pub async fn connect_authenticated(
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
