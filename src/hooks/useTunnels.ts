import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "./useToast";
import type { ForwardRule } from "../types";

export type TunnelState = "Connected" | "Connecting" | "Disconnected" | "Error";

export interface TunnelStatus {
  profile_id: string;
  state: TunnelState;
  error_msg: string | null;
  started_at: string | null;
  active_rules: ForwardRule[];
}

export function useTunnels() {
  const [statuses, setStatuses] = useState<Record<string, TunnelStatus>>({});
  const toast = useToast();

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await listen<TunnelStatus>("tunnel-status-changed", (event) => {
        const newStatus = event.payload;
        setStatuses((prev) => ({
          ...prev,
          [newStatus.profile_id]: newStatus,
        }));

        if (newStatus.state === "Error") {
          toast.error(`Tunnel error: ${newStatus.error_msg}`);
        } else if (newStatus.state === "Connected") {
          toast.success(`Tunnel connected successfully`);
        } else if (newStatus.state === "Disconnected") {
          toast.info(`Tunnel disconnected`);
        }
      });
    };

    void setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [toast]);

  const startTunnel = useCallback(async (profileId: string) => {
    try {
      await invoke("start_tunnel", { profileId });
    } catch (err) {
      toast.error(`Failed to start tunnel: ${err}`);
    }
  }, [toast]);

  const stopTunnel = useCallback(async (profileId: string) => {
    try {
      await invoke("stop_tunnel", { profileId });
    } catch (err) {
      toast.error(`Failed to stop tunnel: ${err}`);
    }
  }, [toast]);

  return {
    statuses,
    startTunnel,
    stopTunnel,
  };
}
