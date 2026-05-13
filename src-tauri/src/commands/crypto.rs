use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;
use std::fs;
use std::path::PathBuf;

use crate::db::get_data_dir;

const KEY_FILENAME: &str = "tunnelink.key";
const NONCE_SIZE: usize = 12; // 96-bit nonce for AES-GCM

/// The encryption key wrapper, stored in Tauri managed state.
pub struct CryptoKey {
    key_bytes: [u8; 32],
}

impl CryptoKey {
    /// Loads the encryption key from disk, or generates a new one if it doesn't exist.
    pub fn load_or_generate() -> Result<Self, String> {
        let key_path = get_key_path();

        if key_path.exists() {
            let encoded = fs::read_to_string(&key_path)
                .map_err(|e| format!("Failed to read key file: {}", e))?;
            let decoded = BASE64
                .decode(encoded.trim())
                .map_err(|e| format!("Failed to decode key: {}", e))?;
            if decoded.len() != 32 {
                return Err(format!(
                    "Invalid key length: expected 32 bytes, got {}",
                    decoded.len()
                ));
            }
            let mut key_bytes = [0u8; 32];
            key_bytes.copy_from_slice(&decoded);
            Ok(CryptoKey { key_bytes })
        } else {
            let mut key_bytes = [0u8; 32];
            OsRng.fill_bytes(&mut key_bytes);

            // Ensure parent directory exists
            if let Some(parent) = key_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create key directory: {}", e))?;
            }

            let encoded = BASE64.encode(&key_bytes);
            fs::write(&key_path, &encoded)
                .map_err(|e| format!("Failed to write key file: {}", e))?;

            // Set file permissions to 0600 on Unix
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let perms = fs::Permissions::from_mode(0o600);
                fs::set_permissions(&key_path, perms)
                    .map_err(|e| format!("Failed to set key file permissions: {}", e))?;
            }

            Ok(CryptoKey { key_bytes })
        }
    }

    /// Encrypts a plaintext password. Returns base64(nonce || ciphertext).
    pub fn encrypt(&self, plaintext: &str) -> Result<String, String> {
        let cipher = Aes256Gcm::new_from_slice(&self.key_bytes)
            .map_err(|e| format!("Failed to create cipher: {}", e))?;

        let mut nonce_bytes = [0u8; NONCE_SIZE];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| format!("Encryption failed: {}", e))?;

        // Concatenate nonce + ciphertext and base64 encode
        let mut combined = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
        combined.extend_from_slice(&nonce_bytes);
        combined.extend_from_slice(&ciphertext);

        Ok(BASE64.encode(&combined))
    }

    /// Decrypts a base64(nonce || ciphertext) string back to plaintext.
    pub fn decrypt(&self, encoded: &str) -> Result<String, String> {
        let combined = BASE64
            .decode(encoded)
            .map_err(|e| format!("Failed to decode ciphertext: {}", e))?;

        if combined.len() < NONCE_SIZE {
            return Err("Ciphertext too short".to_string());
        }

        let (nonce_bytes, ciphertext) = combined.split_at(NONCE_SIZE);
        let nonce = Nonce::from_slice(nonce_bytes);

        let cipher = Aes256Gcm::new_from_slice(&self.key_bytes)
            .map_err(|e| format!("Failed to create cipher: {}", e))?;

        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))?;

        String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8 after decryption: {}", e))
    }
}

fn get_key_path() -> PathBuf {
    get_data_dir().join(KEY_FILENAME)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> CryptoKey {
        CryptoKey {
            key_bytes: [7u8; 32],
        }
    }

    #[test]
    fn encrypt_round_trip_recovers_original_password() {
        let crypto = test_key();
        let encrypted = crypto.encrypt("s3cret").expect("encryption works");

        assert_ne!(encrypted, "s3cret");
        assert_eq!(
            crypto.decrypt(&encrypted).expect("decryption works"),
            "s3cret"
        );
    }

    #[test]
    fn encrypt_uses_a_fresh_nonce_for_each_password_write() {
        let crypto = test_key();
        let first = crypto
            .encrypt("same-password")
            .expect("first encryption works");
        let second = crypto
            .encrypt("same-password")
            .expect("second encryption works");

        assert_ne!(first, second);
    }
}
