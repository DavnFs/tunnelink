import { invoke } from "@tauri-apps/api/core";
import type {
  ConnectionProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  ForwardRule,
  CreateForwardRuleRequest,
  TunnelStatus,
  TerminalSessionInfo,
  SftpDownloadResult,
  SftpListResponse,
} from "../types";

// ── Profile API ────────────────────────────────────────

export async function getProfiles(): Promise<ConnectionProfile[]> {
  return invoke<ConnectionProfile[]>("get_profiles");
}

export async function getProfile(id: string): Promise<ConnectionProfile> {
  return invoke<ConnectionProfile>("get_profile", { id });
}

export async function createProfile(
  profile: CreateProfileRequest
): Promise<ConnectionProfile> {
  return invoke<ConnectionProfile>("create_profile", { profile });
}

export async function updateProfile(
  profile: UpdateProfileRequest
): Promise<ConnectionProfile> {
  return invoke<ConnectionProfile>("update_profile", { profile });
}

export async function deleteProfile(id: string): Promise<void> {
  return invoke<void>("delete_profile", { id });
}

// ── Forward Rule API ───────────────────────────────────

export async function addForwardRule(
  profileId: string,
  rule: CreateForwardRuleRequest
): Promise<ForwardRule> {
  return invoke<ForwardRule>("add_forward_rule", {
    profileId,
    rule,
  });
}

export async function removeForwardRule(ruleId: string): Promise<void> {
  return invoke<void>("remove_forward_rule", { ruleId });
}

// ── Tunnel API ─────────────────────────────────────────

export async function getTunnelStatuses(): Promise<TunnelStatus[]> {
  return invoke<TunnelStatus[]>("get_tunnel_statuses");
}

export async function openTerminal(
  profileId: string,
  cols: number,
  rows: number
): Promise<TerminalSessionInfo> {
  return invoke<TerminalSessionInfo>("open_terminal", { profileId, cols, rows });
}

export async function sendTerminalInput(
  sessionId: string,
  data: string
): Promise<void> {
  return invoke<void>("send_terminal_input", { sessionId, data });
}

export async function resizeTerminal(
  sessionId: string,
  cols: number,
  rows: number
): Promise<void> {
  return invoke<void>("resize_terminal", { sessionId, cols, rows });
}

export async function closeTerminal(sessionId: string): Promise<void> {
  return invoke<void>("close_terminal", { sessionId });
}

// ── SFTP API ──────────────────────────────────────────

export async function sftpListDir(
  profileId: string,
  remotePath: string
): Promise<SftpListResponse> {
  return invoke<SftpListResponse>("sftp_list_dir", { profileId, remotePath });
}

export async function sftpMkdir(
  profileId: string,
  remotePath: string
): Promise<void> {
  return invoke<void>("sftp_mkdir", { profileId, remotePath });
}

export async function sftpDelete(
  profileId: string,
  remotePath: string,
  isDir: boolean
): Promise<void> {
  return invoke<void>("sftp_delete", { profileId, remotePath, isDir });
}

export async function sftpRename(
  profileId: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  return invoke<void>("sftp_rename", { profileId, oldPath, newPath });
}

export async function sftpUpload(
  profileId: string,
  localPath: string,
  remotePath: string
): Promise<void> {
  return invoke<void>("sftp_upload", { profileId, localPath, remotePath });
}

export async function sftpDownload(
  profileId: string,
  remotePath: string,
  localDir: string
): Promise<SftpDownloadResult> {
  return invoke<SftpDownloadResult>("sftp_download", {
    profileId,
    remotePath,
    localDir,
  });
}
