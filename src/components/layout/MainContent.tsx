import { useEffect } from "react";
import { Edit2, Key, Lock, Network, Server, Trash2 } from "lucide-react";
import type { ConnectionProfile, CreateForwardRuleRequest } from "../../types";
import type { TunnelStatus } from "../../hooks/useTunnels";
import { useTabs } from "../../hooks/useTabs";
import TabBar from "./TabBar";
import TunnelTab from "../tunnel/TunnelTab";
import TerminalTab from "../terminal/TerminalTab";

interface MainContentProps {
  profile: ConnectionProfile | null;
  status?: TunnelStatus;
  onEdit: () => void;
  onDelete: () => void;
  onAddRule: (profileId: string, rule: CreateForwardRuleRequest) => Promise<void>;
  onRemoveRule: (ruleId: string) => void;
  onStartTunnel: () => void;
  onStopTunnel: () => void;
}

const statusCssMap = {
  Connected: "connected",
  Connecting: "connecting",
  Disconnected: "disconnected",
  Error: "error",
};

export default function MainContent({
  profile,
  status,
  onEdit,
  onDelete,
  onAddRule,
  onRemoveRule,
  onStartTunnel,
  onStopTunnel,
}: MainContentProps) {
  const { activeTab, setActiveTab } = useTabs(profile?.id);
  const currentState = status?.state || "Disconnected";
  const statusClass = statusCssMap[currentState] || "disconnected";
  const terminalEnabled = currentState === "Connected";

  useEffect(() => {
    if (activeTab === "terminal" && !terminalEnabled) {
      setActiveTab("tunnels");
    }
  }, [activeTab, setActiveTab, terminalEnabled]);

  if (!profile) {
    return (
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--text-dim)" }}>
          <Network size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
          <h2 style={{ fontSize: 18, fontWeight: 500, color: "var(--text-muted)", marginBottom: 8 }}>
            No Profile Selected
          </h2>
          <p style={{ fontSize: 14 }}>
            Select a profile from the sidebar or create a new one to get started.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        overflowY: "auto",
      }}
    >
      <div
        className="animate-slide-in"
        style={{
          padding: "28px 40px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <div
                className={`status-dot status-dot--${statusClass}`}
                style={{ width: 12, height: 12 }}
                title={status?.error_msg || currentState}
              />
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: 0 }}>
                {profile.name}
              </h1>
              {profile.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--primary)",
                    background: "var(--primary-muted)",
                    padding: "2px 8px",
                    borderRadius: 12,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 24, color: "var(--text-muted)", fontSize: 13, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Server size={14} />
                <span style={{ fontFamily: "monospace" }}>
                  {profile.username}@{profile.host}:{profile.port}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {profile.auth_method === "Key" ? <Key size={14} /> : <Lock size={14} />}
                <span>
                  {profile.auth_method} Auth
                  {profile.auth_method === "Key" && profile.key_path && ` (${profile.key_path.split("/").pop()})`}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onEdit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontSize: 13,
                fontWeight: 500,
              }}
              onMouseEnter={(event) => (event.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={(event) => (event.currentTarget.style.background = "var(--surface)")}
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--error)",
                fontSize: 13,
                fontWeight: 500,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = "var(--error)";
                event.currentTarget.style.color = "#fff";
                event.currentTarget.style.borderColor = "var(--error)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "var(--surface)";
                event.currentTarget.style.color = "var(--error)";
                event.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      </div>

      <TabBar
        activeTab={activeTab}
        terminalEnabled={terminalEnabled}
        onChange={setActiveTab}
      />

      {activeTab === "terminal" && terminalEnabled ? (
        <TerminalTab profile={profile} active={activeTab === "terminal"} />
      ) : (
        <TunnelTab
          profile={profile}
          status={status}
          onAddRule={onAddRule}
          onRemoveRule={onRemoveRule}
          onStartTunnel={onStartTunnel}
          onStopTunnel={onStopTunnel}
        />
      )}
    </main>
  );
}
