import { useCallback, useState } from "react";

export type DashboardTabId = "tunnels" | "terminal" | "files";

export function useTabs(profileId: string | null | undefined) {
  const [tabsByProfile, setTabsByProfile] = useState<Record<string, DashboardTabId>>({});

  const activeTab = profileId ? tabsByProfile[profileId] ?? "terminal" : "terminal";

  const setActiveTab = useCallback(
    (tab: DashboardTabId) => {
      if (!profileId) return;

      setTabsByProfile((current) => ({
        ...current,
        [profileId]: tab,
      }));
    },
    [profileId]
  );

  return { activeTab, setActiveTab };
}
