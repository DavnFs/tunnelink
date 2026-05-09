use serde::{Deserialize, Serialize};

// ── Enums ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AuthMethod {
    Key,
    Password,
}

impl AuthMethod {
    pub fn as_str(&self) -> &str {
        match self {
            AuthMethod::Key => "key",
            AuthMethod::Password => "password",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "password" => AuthMethod::Password,
            _ => AuthMethod::Key,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ForwardKind {
    Local,
    Remote,
    Dynamic,
}

impl ForwardKind {
    pub fn as_str(&self) -> &str {
        match self {
            ForwardKind::Local => "local",
            ForwardKind::Remote => "remote",
            ForwardKind::Dynamic => "dynamic",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "remote" => ForwardKind::Remote,
            "dynamic" => ForwardKind::Dynamic,
            _ => ForwardKind::Local,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TunnelState {
    Connected,
    Connecting,
    Disconnected,
    Error,
}

// ── Core Models ────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionProfile {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    pub key_path: Option<String>,
    pub password_enc: Option<String>,
    pub tags: Vec<String>,
    pub forwards: Vec<ForwardRule>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForwardRule {
    pub id: String,
    pub profile_id: String,
    pub label: String,
    pub kind: ForwardKind,
    pub local_port: u16,
    pub remote_host: String,
    pub remote_port: u16,
    pub auto_start: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelStatus {
    pub profile_id: String,
    pub state: TunnelState,
    pub error_msg: Option<String>,
    pub started_at: Option<String>,
    pub active_rules: Vec<ForwardRule>,
}

// ── Request DTOs ───────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProfileRequest {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    pub key_path: Option<String>,
    pub password: Option<String>, // plaintext — will be encrypted before storage
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProfileRequest {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    pub key_path: Option<String>,
    pub password: Option<String>, // plaintext — None means "don't change"
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateForwardRuleRequest {
    pub label: String,
    pub kind: ForwardKind,
    pub local_port: u16,
    pub remote_host: String,
    pub remote_port: u16,
    pub auto_start: bool,
}
