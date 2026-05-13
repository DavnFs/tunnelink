import { useState, useEffect, useCallback } from "react";
import type {
  ConnectionProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  CreateForwardRuleRequest,
} from "../types";
import * as api from "../lib/tauri";

export function useProfiles() {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedProfile = profiles.find((p) => p.id === selectedId) ?? null;

  // ── Load all profiles ──────────────────────────────

  const refresh = useCallback(async () => {
    try {
      const data = await api.getProfiles();
      setProfiles(data);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  // ── CRUD operations ────────────────────────────────

  const handleCreate = useCallback(
    async (req: CreateProfileRequest) => {
      const created = await api.createProfile(req);
      await refresh();
      setSelectedId(created.id);
      return created;
    },
    [refresh]
  );

  const handleUpdate = useCallback(
    async (req: UpdateProfileRequest) => {
      const updated = await api.updateProfile(req);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await api.deleteProfile(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
      await refresh();
    },
    [selectedId, refresh]
  );

  // ── Forward rule operations ────────────────────────

  const handleAddRule = useCallback(
    async (profileId: string, rule: CreateForwardRuleRequest) => {
      const created = await api.addForwardRule(profileId, rule);
      await refresh();
      return created;
    },
    [refresh]
  );

  const handleRemoveRule = useCallback(
    async (ruleId: string) => {
      await api.removeForwardRule(ruleId);
      await refresh();
    },
    [refresh]
  );

  return {
    profiles,
    selectedProfile,
    selectedId,
    setSelectedId,
    loading,
    error,
    refresh,
    createProfile: handleCreate,
    updateProfile: handleUpdate,
    deleteProfile: handleDelete,
    addForwardRule: handleAddRule,
    removeForwardRule: handleRemoveRule,
  };
}
