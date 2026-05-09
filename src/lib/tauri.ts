import { invoke } from "@tauri-apps/api/core";
import type {
  ConnectionProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  ForwardRule,
  CreateForwardRuleRequest,
  TunnelStatus,
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
