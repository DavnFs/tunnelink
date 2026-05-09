import type { ConnectionProfile } from "../../types";
import type { TunnelStatus } from "../../hooks/useTunnels";

interface ProfileCardProps {
  profile: ConnectionProfile;
  status?: TunnelStatus;
  isSelected: boolean;
  onSelect: () => void;
}

export default function ProfileCard({
  profile,
  status,
  isSelected,
  onSelect,
}: ProfileCardProps) {
  const currentState = status?.state || "Disconnected";
  const statusCssMap = {
    Connected: "connected",
    Connecting: "connecting",
    Disconnected: "disconnected",
    Error: "error",
  };
  const statusClass = statusCssMap[currentState] || "disconnected";

  return (
    <button
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 12px",
        borderRadius: "var(--radius)",
        background: isSelected ? "var(--surface-active)" : "transparent",
        textAlign: "left",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          e.currentTarget.style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Status indicator */}
      <div className={`status-dot status-dot--${statusClass}`} title={status?.error_msg || currentState} />

      {/* Profile info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isSelected ? "var(--text)" : "var(--text)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {profile.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {profile.host}:{profile.port}
        </div>
      </div>

      {/* Forward rules count */}
      {profile.forwards.length > 0 && (
        <span
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            background: "var(--bg)",
            padding: "2px 6px",
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          {profile.forwards.length}
        </span>
      )}
    </button>
  );
}
