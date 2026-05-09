use rusqlite::{params, Connection, Result as SqliteResult};
use std::fs;
use std::path::PathBuf;

use crate::models::{
    AuthMethod, ConnectionProfile, CreateForwardRuleRequest, CreateProfileRequest, ForwardKind,
    ForwardRule, UpdateProfileRequest,
};

// ── Database Initialization ────────────────────────────

/// Returns the app data directory: ~/.local/share/tunnelink/ (Linux)
/// or %APPDATA%\tunnelink\ (Windows)
pub fn get_data_dir() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("tunnelink")
}

/// Opens or creates the SQLite database and runs migrations.
pub fn init_db() -> SqliteResult<Connection> {
    let data_dir = get_data_dir();
    fs::create_dir_all(&data_dir).expect("Failed to create data directory");

    let db_path = data_dir.join("tunnelink.db");
    let conn = Connection::open(&db_path)?;

    // Enable WAL mode for better concurrent read performance
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;

    run_migrations(&conn)?;
    Ok(conn)
}

fn run_migrations(conn: &Connection) -> SqliteResult<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS profiles (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            host        TEXT NOT NULL,
            port        INTEGER NOT NULL DEFAULT 22,
            username    TEXT NOT NULL,
            auth_method TEXT NOT NULL DEFAULT 'key',
            key_path    TEXT,
            password_enc TEXT,
            tags        TEXT NOT NULL DEFAULT '[]',
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS forward_rules (
            id          TEXT PRIMARY KEY,
            profile_id  TEXT NOT NULL,
            label       TEXT NOT NULL,
            kind        TEXT NOT NULL DEFAULT 'local',
            local_port  INTEGER NOT NULL,
            remote_host TEXT NOT NULL DEFAULT 'localhost',
            remote_port INTEGER NOT NULL,
            auto_start  INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );
        ",
    )?;
    Ok(())
}

// ── Profile CRUD ───────────────────────────────────────

pub fn insert_profile(
    conn: &Connection,
    req: &CreateProfileRequest,
    password_enc: Option<String>,
) -> Result<ConnectionProfile, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let tags_json = serde_json::to_string(&req.tags).unwrap_or_else(|_| "[]".to_string());

    conn.execute(
        "INSERT INTO profiles (id, name, host, port, username, auth_method, key_path, password_enc, tags, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            req.name,
            req.host,
            req.port,
            req.username,
            req.auth_method.as_str(),
            req.key_path,
            password_enc,
            tags_json,
            now,
            now,
        ],
    )
    .map_err(|e| format!("Failed to insert profile: {}", e))?;

    get_profile_by_id(conn, &id)
}

pub fn get_all_profiles(conn: &Connection) -> Result<Vec<ConnectionProfile>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, host, port, username, auth_method, key_path, password_enc, tags, created_at, updated_at
             FROM profiles ORDER BY name ASC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let profiles: Vec<ConnectionProfile> = stmt
        .query_map([], |row| {
            let tags_str: String = row.get(8)?;
            let tags: Vec<String> =
                serde_json::from_str(&tags_str).unwrap_or_default();
            let auth_str: String = row.get(5)?;

            Ok(ConnectionProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                host: row.get(2)?,
                port: row.get::<_, i64>(3)? as u16,
                username: row.get(4)?,
                auth_method: AuthMethod::from_str(&auth_str),
                key_path: row.get(6)?,
                password_enc: row.get(7)?,
                tags,
                forwards: vec![], // filled below
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| format!("Failed to query profiles: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    // Attach forward rules to each profile
    let mut result = Vec::with_capacity(profiles.len());
    for mut profile in profiles {
        profile.forwards = get_forward_rules(conn, &profile.id)?;
        result.push(profile);
    }
    Ok(result)
}

pub fn get_profile_by_id(conn: &Connection, id: &str) -> Result<ConnectionProfile, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, host, port, username, auth_method, key_path, password_enc, tags, created_at, updated_at
             FROM profiles WHERE id = ?1",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let mut profile = stmt
        .query_row(params![id], |row| {
            let tags_str: String = row.get(8)?;
            let tags: Vec<String> =
                serde_json::from_str(&tags_str).unwrap_or_default();
            let auth_str: String = row.get(5)?;

            Ok(ConnectionProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                host: row.get(2)?,
                port: row.get::<_, i64>(3)? as u16,
                username: row.get(4)?,
                auth_method: AuthMethod::from_str(&auth_str),
                key_path: row.get(6)?,
                password_enc: row.get(7)?,
                tags,
                forwards: vec![],
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| format!("Profile not found: {}", e))?;

    profile.forwards = get_forward_rules(conn, &profile.id)?;
    Ok(profile)
}

pub fn update_profile(
    conn: &Connection,
    req: &UpdateProfileRequest,
    password_enc: Option<String>,
) -> Result<ConnectionProfile, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let tags_json = serde_json::to_string(&req.tags).unwrap_or_else(|_| "[]".to_string());

    // If password_enc is None, preserve the existing encrypted password
    if let Some(ref enc) = password_enc {
        conn.execute(
            "UPDATE profiles SET name=?1, host=?2, port=?3, username=?4, auth_method=?5, key_path=?6, password_enc=?7, tags=?8, updated_at=?9 WHERE id=?10",
            params![
                req.name,
                req.host,
                req.port,
                req.username,
                req.auth_method.as_str(),
                req.key_path,
                enc,
                tags_json,
                now,
                req.id,
            ],
        )
        .map_err(|e| format!("Failed to update profile: {}", e))?;
    } else {
        conn.execute(
            "UPDATE profiles SET name=?1, host=?2, port=?3, username=?4, auth_method=?5, key_path=?6, tags=?7, updated_at=?8 WHERE id=?9",
            params![
                req.name,
                req.host,
                req.port,
                req.username,
                req.auth_method.as_str(),
                req.key_path,
                tags_json,
                now,
                req.id,
            ],
        )
        .map_err(|e| format!("Failed to update profile: {}", e))?;
    }

    get_profile_by_id(conn, &req.id)
}

pub fn delete_profile(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM profiles WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete profile: {}", e))?;
    Ok(())
}

// ── Forward Rule CRUD ──────────────────────────────────

pub fn get_forward_rules(conn: &Connection, profile_id: &str) -> Result<Vec<ForwardRule>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, profile_id, label, kind, local_port, remote_host, remote_port, auto_start
             FROM forward_rules WHERE profile_id = ?1 ORDER BY label ASC",
        )
        .map_err(|e| format!("Failed to query forward rules: {}", e))?;

    let rules = stmt
        .query_map(params![profile_id], |row| {
            let kind_str: String = row.get(3)?;
            Ok(ForwardRule {
                id: row.get(0)?,
                profile_id: row.get(1)?,
                label: row.get(2)?,
                kind: ForwardKind::from_str(&kind_str),
                local_port: row.get::<_, i64>(4)? as u16,
                remote_host: row.get(5)?,
                remote_port: row.get::<_, i64>(6)? as u16,
                auto_start: row.get::<_, i64>(7)? != 0,
            })
        })
        .map_err(|e| format!("Failed to query forward rules: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rules)
}

pub fn insert_forward_rule(
    conn: &Connection,
    profile_id: &str,
    req: &CreateForwardRuleRequest,
) -> Result<ForwardRule, String> {
    let id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO forward_rules (id, profile_id, label, kind, local_port, remote_host, remote_port, auto_start)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            profile_id,
            req.label,
            req.kind.as_str(),
            req.local_port,
            req.remote_host,
            req.remote_port,
            req.auto_start as i64,
        ],
    )
    .map_err(|e| format!("Failed to insert forward rule: {}", e))?;

    Ok(ForwardRule {
        id,
        profile_id: profile_id.to_string(),
        label: req.label.clone(),
        kind: req.kind.clone(),
        local_port: req.local_port,
        remote_host: req.remote_host.clone(),
        remote_port: req.remote_port,
        auto_start: req.auto_start,
    })
}

pub fn delete_forward_rule(conn: &Connection, rule_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM forward_rules WHERE id = ?1",
        params![rule_id],
    )
    .map_err(|e| format!("Failed to delete forward rule: {}", e))?;
    Ok(())
}
