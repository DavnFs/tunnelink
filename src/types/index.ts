// ── Enums ──────────────────────────────────────────────

export type AuthMethod = "Key" | "Password";
export type ForwardKind = "Local" | "Remote" | "Dynamic";
export type TunnelState = "Connected" | "Connecting" | "Disconnected" | "Error";

// ── Core Models ────────────────────────────────────────

export interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_method: AuthMethod;
  key_path: string | null;
  password_enc: string | null;
  tags: string[];
  forwards: ForwardRule[];
  created_at: string;
  updated_at: string;
}

export interface ForwardRule {
  id: string;
  profile_id: string;
  label: string;
  kind: ForwardKind;
  local_port: number;
  remote_host: string;
  remote_port: number;
  auto_start: boolean;
}

export interface TunnelStatus {
  profile_id: string;
  state: TunnelState;
  error_msg: string | null;
  started_at: string | null;
  active_rules: ForwardRule[];
}

export type TerminalConnectionState = "idle" | "connecting" | "connected" | "closed" | "error";

export interface TerminalSessionInfo {
  session_id: string;
}

export interface TerminalOutputEvent {
  session_id: string;
  data: string;
}

export interface TerminalStatusEvent {
  session_id: string;
  state: TerminalConnectionState;
  message: string | null;
}

export type SftpFileKind = "directory" | "file" | "symlink";
export type SftpTransferDirection = "upload" | "download";
export type SftpTransferState = "started" | "progress" | "completed";

export interface SftpFileEntry {
  name: string;
  path: string;
  kind: SftpFileKind;
  size: number;
  modified: number | null;
  permissions: number | null;
}

export interface SftpListResponse {
  path: string;
  entries: SftpFileEntry[];
}

export interface SftpTransferEvent {
  profile_id: string;
  direction: SftpTransferDirection;
  local_path: string;
  remote_path: string;
  transferred: number;
  total: number;
  state: SftpTransferState;
}

export interface SftpDownloadResult {
  local_path: string;
}

// ── Request DTOs ───────────────────────────────────────

export interface CreateProfileRequest {
  name: string;
  host: string;
  port: number;
  username: string;
  auth_method: AuthMethod;
  key_path: string | null;
  password: string | null;
  tags: string[];
}

export interface UpdateProfileRequest {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_method: AuthMethod;
  key_path: string | null;
  password: string | null;
  tags: string[];
}

export interface CreateForwardRuleRequest {
  label: string;
  kind: ForwardKind;
  local_port: number;
  remote_host: string;
  remote_port: number;
  auto_start: boolean;
}
