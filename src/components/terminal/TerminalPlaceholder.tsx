import { PlugZap, Terminal } from "lucide-react";
import type { ConnectionProfile } from "../../types";

interface TerminalPlaceholderProps {
  profile: ConnectionProfile;
  isConnecting: boolean;
  onConnect: () => void;
}

export default function TerminalPlaceholder({
  profile,
  isConnecting,
  onConnect,
}: TerminalPlaceholderProps) {
  return (
    <section
      className="animate-fade-in"
      style={{
        padding: "28px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          minHeight: 360,
          borderRadius: "var(--radius)",
          border: "1px dashed var(--border)",
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <Terminal size={34} color="var(--text-dim)" style={{ margin: "0 auto 14px" }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
            Connect to server first
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
            Start the SSH connection for {profile.name} before opening an interactive terminal.
          </p>
          <button
            type="button"
            onClick={onConnect}
            disabled={isConnecting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 14px",
              borderRadius: "var(--radius)",
              background: isConnecting ? "var(--warning)" : "var(--success)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: isConnecting ? "wait" : "pointer",
            }}
          >
            <PlugZap size={15} />
            {isConnecting ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </section>
  );
}
