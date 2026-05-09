import { Server, Plus, Settings, Wifi } from "lucide-react";
import type { ConnectionProfile } from "../../types";
import type { TunnelStatus } from "../../hooks/useTunnels";
import ProfileCard from "../profile/ProfileCard";

interface SidebarProps {
  profiles: ConnectionProfile[];
  selectedId: string | null;
  statuses: Record<string, TunnelStatus>;
  onSelect: (id: string) => void;
  onAddProfile: () => void;
  onSettingsClick: () => void;
}

export default function Sidebar({
  profiles,
  selectedId,
  statuses,
  onSelect,
  onAddProfile,
  onSettingsClick,
}: SidebarProps) {
  const activeCount = Object.values(statuses).filter(
    (s) => s.state === "Connected" || s.state === "Connecting"
  ).length;

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        minWidth: "var(--sidebar-width)",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 16px 12px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--radius)",
            background: "var(--primary-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Wifi size={16} color="var(--primary)" />
        </div>
        <div>
          <h1
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text)",
              letterSpacing: "-0.3px",
            }}
          >
            TunneLink
          </h1>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -2 }}>
            SSH Tunnel Manager
          </p>
        </div>
      </div>

      {/* Profile List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 8px 4px",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "var(--text-muted)",
            }}
          >
            Profiles
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-dim)",
            }}
          >
            {profiles.length}
          </span>
        </div>

        {profiles.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "var(--text-dim)",
            }}
          >
            <Server
              size={32}
              style={{ margin: "0 auto 12px", opacity: 0.4 }}
            />
            <p style={{ fontSize: 13, marginBottom: 4 }}>No profiles yet</p>
            <p style={{ fontSize: 12 }}>Add your first SSH server</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                status={statuses[profile.id]}
                isSelected={profile.id === selectedId}
                onSelect={() => onSelect(profile.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "8px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <button
          onClick={onAddProfile}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: "var(--radius)",
            background: "var(--primary)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            width: "100%",
            justifyContent: "center",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--primary-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--primary)")
          }
        >
          <Plus size={16} />
          Add Profile
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <button 
            onClick={onSettingsClick}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: 4, borderRadius: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
          <span>
            {activeCount > 0
              ? `${activeCount} tunnel${activeCount > 1 ? "s" : ""} active`
              : "No active tunnels"}
          </span>
        </div>
      </div>
    </aside>
  );
}
