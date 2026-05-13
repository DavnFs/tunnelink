use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::commands::crypto::CryptoKey;
use crate::db;
use crate::models::*;

/// Tauri managed state holding the DB connection and crypto key.
pub struct AppState {
    pub db: Mutex<Connection>,
    pub crypto: CryptoKey,
}

// ── Profile Commands ───────────────────────────────────

#[tauri::command]
pub fn get_profiles(state: State<'_, AppState>) -> Result<Vec<ConnectionProfile>, String> {
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    db::get_all_profiles(&conn)
}

#[tauri::command]
pub fn get_profile(state: State<'_, AppState>, id: String) -> Result<ConnectionProfile, String> {
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    db::get_profile_by_id(&conn, &id)
}

#[tauri::command]
pub fn create_profile(
    state: State<'_, AppState>,
    profile: CreateProfileRequest,
) -> Result<ConnectionProfile, String> {
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    // Encrypt password if provided
    let password_enc = match &profile.password {
        Some(pw) if !pw.is_empty() => Some(state.crypto.encrypt(pw)?),
        _ => None,
    };

    db::insert_profile(&conn, &profile, password_enc)
}

#[tauri::command]
pub fn update_profile(
    state: State<'_, AppState>,
    profile: UpdateProfileRequest,
) -> Result<ConnectionProfile, String> {
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    // Encrypt password if a new one is provided
    let password_enc = match &profile.password {
        Some(pw) if !pw.is_empty() => Some(state.crypto.encrypt(pw)?),
        _ => None, // None means "keep existing password"
    };

    db::update_profile(&conn, &profile, password_enc)
}

#[tauri::command]
pub fn delete_profile(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    db::delete_profile(&conn, &id)
}

// ── Forward Rule Commands ──────────────────────────────

#[tauri::command]
pub fn add_forward_rule(
    state: State<'_, AppState>,
    profile_id: String,
    rule: CreateForwardRuleRequest,
) -> Result<ForwardRule, String> {
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    db::insert_forward_rule(&conn, &profile_id, &rule)
}

#[tauri::command]
pub fn remove_forward_rule(state: State<'_, AppState>, rule_id: String) -> Result<(), String> {
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    db::delete_forward_rule(&conn, &rule_id)
}

// ── Import / Export Commands ───────────────────────────

#[tauri::command]
pub fn export_profiles_json(state: State<'_, AppState>) -> Result<String, String> {
    let conn = state
        .db
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    export_profiles_to_json(db::get_all_profiles(&conn)?)
}

fn export_profiles_to_json(mut profiles: Vec<ConnectionProfile>) -> Result<String, String> {
    // Strip encrypted passwords for security before exporting
    for profile in &mut profiles {
        profile.password_enc = None;
    }

    serde_json::to_string_pretty(&profiles).map_err(|e| format!("Failed to serialize: {}", e))
}

#[tauri::command]
pub fn import_profiles_json(
    state: State<'_, AppState>,
    json_payload: String,
) -> Result<usize, String> {
    let profiles: Vec<ConnectionProfile> =
        serde_json::from_str(&json_payload).map_err(|e| format!("Invalid JSON format: {}", e))?;

    let conn = state
        .db
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;
    Ok(import_profiles_into_conn(&conn, profiles))
}

fn import_profiles_into_conn(conn: &Connection, profiles: Vec<ConnectionProfile>) -> usize {
    let mut imported_count = 0;

    for profile in profiles {
        // Map to a create request to generate new UUIDs
        let req = CreateProfileRequest {
            name: profile.name,
            host: profile.host,
            port: profile.port,
            username: profile.username,
            auth_method: profile.auth_method,
            key_path: profile.key_path,
            password: None, // Stripped
            tags: profile.tags,
        };

        // We can pass None for password_enc because it was stripped or we don't want to import it
        if let Ok(new_profile) = db::insert_profile(&conn, &req, None) {
            imported_count += 1;

            // Insert its forward rules
            for rule in profile.forwards {
                let rule_req = CreateForwardRuleRequest {
                    label: rule.label,
                    kind: rule.kind,
                    local_port: rule.local_port,
                    remote_host: rule.remote_host,
                    remote_port: rule.remote_port,
                    auto_start: rule.auto_start,
                };
                let _ = db::insert_forward_rule(&conn, &new_profile.id, &rule_req);
            }
        }
    }

    imported_count
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{AuthMethod, ForwardKind};

    fn memory_conn() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory DB opens");
        conn.execute_batch("PRAGMA foreign_keys=ON;")
            .expect("foreign keys can be enabled");
        db::run_migrations(&conn).expect("schema can be created");
        conn
    }

    fn export_profile() -> ConnectionProfile {
        ConnectionProfile {
            id: "source-profile".to_string(),
            name: "Training GPU".to_string(),
            host: "gpu.example.test".to_string(),
            port: 22,
            username: "davin".to_string(),
            auth_method: AuthMethod::Password,
            key_path: None,
            password_enc: Some("encrypted-secret".to_string()),
            tags: vec!["gpu".to_string()],
            forwards: vec![ForwardRule {
                id: "source-rule".to_string(),
                profile_id: "source-profile".to_string(),
                label: "Jupyter".to_string(),
                kind: ForwardKind::Local,
                local_port: 8888,
                remote_host: "localhost".to_string(),
                remote_port: 8888,
                auto_start: true,
            }],
            created_at: "2026-05-13T00:00:00Z".to_string(),
            updated_at: "2026-05-13T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn export_strips_passwords_but_preserves_forward_rules() {
        let json = export_profiles_to_json(vec![export_profile()]).expect("export works");
        let exported: Vec<ConnectionProfile> =
            serde_json::from_str(&json).expect("export is valid JSON");

        assert_eq!(exported.len(), 1);
        assert_eq!(exported[0].password_enc, None);
        assert_eq!(exported[0].forwards.len(), 1);
        assert_eq!(exported[0].forwards[0].label, "Jupyter");
    }

    #[test]
    fn import_generates_new_ids_and_keeps_exported_profiles_passwordless() {
        let conn = memory_conn();
        let imported = import_profiles_into_conn(&conn, vec![export_profile()]);

        assert_eq!(imported, 1);

        let profiles = db::get_all_profiles(&conn).expect("profiles can be loaded");
        assert_eq!(profiles.len(), 1);
        assert_ne!(profiles[0].id, "source-profile");
        assert_eq!(profiles[0].password_enc, None);
        assert_eq!(profiles[0].forwards.len(), 1);
        assert_ne!(profiles[0].forwards[0].id, "source-rule");
        assert_eq!(profiles[0].forwards[0].profile_id, profiles[0].id);
    }
}
