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
    let conn = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db::get_all_profiles(&conn)
}

#[tauri::command]
pub fn get_profile(state: State<'_, AppState>, id: String) -> Result<ConnectionProfile, String> {
    let conn = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db::get_profile_by_id(&conn, &id)
}

#[tauri::command]
pub fn create_profile(
    state: State<'_, AppState>,
    profile: CreateProfileRequest,
) -> Result<ConnectionProfile, String> {
    let conn = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

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
    let conn = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Encrypt password if a new one is provided
    let password_enc = match &profile.password {
        Some(pw) if !pw.is_empty() => Some(state.crypto.encrypt(pw)?),
        _ => None, // None means "keep existing password"
    };

    db::update_profile(&conn, &profile, password_enc)
}

#[tauri::command]
pub fn delete_profile(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db::delete_profile(&conn, &id)
}

// ── Forward Rule Commands ──────────────────────────────

#[tauri::command]
pub fn add_forward_rule(
    state: State<'_, AppState>,
    profile_id: String,
    rule: CreateForwardRuleRequest,
) -> Result<ForwardRule, String> {
    let conn = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db::insert_forward_rule(&conn, &profile_id, &rule)
}

#[tauri::command]
pub fn remove_forward_rule(state: State<'_, AppState>, rule_id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db::delete_forward_rule(&conn, &rule_id)
}

// ── Import / Export Commands ───────────────────────────

#[tauri::command]
pub fn export_profiles_json(state: State<'_, AppState>) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let mut profiles = db::get_all_profiles(&conn)?;
    
    // Strip encrypted passwords for security before exporting
    for profile in &mut profiles {
        profile.password_enc = None;
    }

    serde_json::to_string_pretty(&profiles).map_err(|e| format!("Failed to serialize: {}", e))
}

#[tauri::command]
pub fn import_profiles_json(state: State<'_, AppState>, json_payload: String) -> Result<usize, String> {
    let profiles: Vec<ConnectionProfile> = serde_json::from_str(&json_payload)
        .map_err(|e| format!("Invalid JSON format: {}", e))?;
        
    let conn = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
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

    Ok(imported_count)
}
