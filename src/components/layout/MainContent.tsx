import { Server, Play, Square, Trash2, Edit2, Key, Lock, Network, Loader2 } from "lucide-react";
import type { ConnectionProfile } from "../../types";
import type { TunnelStatus } from "../../hooks/useTunnels";
import ForwardRuleCard from "../tunnel/ForwardRuleCard";

interface MainContentProps {
  profile: ConnectionProfile | null;
  status?: TunnelStatus;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveRule: (ruleId: string) => void;
  onStartTunnel: () => void;
  onStopTunnel: () => void;
}

export default function MainContent({
  profile,
  status,
  onEdit,
  onDelete,
  onRemoveRule,
  onStartTunnel,
  onStopTunnel,
}: MainContentProps) {
  const currentState = status?.state || "Disconnected";
  const isConnected = currentState === "Connected";
  const isConnecting = currentState === "Connecting";
  
  // Convert Rust TunnelState to our CSS class suffix
  const statusCssMap = {
    Connected: "connected",
    Connecting: "connecting",
    Disconnected: "disconnected",
    Error: "error",
  };
  const statusClass = statusCssMap[currentState] || "disconnected";
  
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
      {/* Profile Header */}
      <div
        className="animate-slide-in"
        style={{
          padding: "32px 40px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div className={`status-dot status-dot--${statusClass}`} style={{ width: 12, height: 12 }} title={status?.error_msg || currentState} />
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px" }}>
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
            
            <div style={{ display: "flex", alignItems: "center", gap: 24, color: "var(--text-muted)", fontSize: 13 }}>
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
                  {profile.auth_method === "Key" && profile.key_path && ` (${profile.key_path.split('/').pop()})`}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
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
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface)"}
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--error)";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.borderColor = "var(--error)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--surface)";
                e.currentTarget.style.color = "var(--error)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {/* Master Connect Button */}
        <button
          onClick={isConnected ? onStopTunnel : onStartTunnel}
          disabled={isConnecting}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "12px 24px",
            borderRadius: "var(--radius)",
            background: isConnected ? "var(--error)" : isConnecting ? "var(--warning)" : "var(--success)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            width: "100%",
            transition: "all 0.2s ease",
            cursor: isConnecting ? "wait" : "pointer",
          }}
        >
          {isConnected ? (
            <>
              <Square size={16} fill="currentColor" />
              Disconnect Tunnel
            </>
          ) : isConnecting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              Connect All Rules
            </>
          )}
        </button>
      </div>

      {/* Forward Rules List */}
      <div style={{ padding: "32px 40px" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
          Port Forwarding Rules ({profile.forwards.length})
        </h3>
        
        {profile.forwards.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", background: "var(--surface)", borderRadius: "var(--radius)", border: `1px dashed var(--border)` }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              No forward rules defined for this profile.
              <br/>Click Edit to add rules.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {profile.forwards.map((rule) => (
              <ForwardRuleCard
                key={rule.id}
                rule={rule}
                onRemove={onRemoveRule}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
