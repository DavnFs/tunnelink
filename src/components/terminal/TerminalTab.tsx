import { useEffect, useRef, type KeyboardEvent } from "react";
import { RotateCcw, Terminal } from "lucide-react";
import type { ConnectionProfile } from "../../types";
import { useTerminal } from "../../hooks/useTerminal";
import AnsiOutput from "./AnsiOutput";

interface TerminalTabProps {
  profile: ConnectionProfile;
  active: boolean;
}

export default function TerminalTab({ profile, active }: TerminalTabProps) {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const { sessionId, state, message, output, sendInput, resize, reconnect } = useTerminal(profile.id, active);
  const displayState = active && state === "idle" ? "connecting" : state;

  useEffect(() => {
    if (active) {
      terminalRef.current?.focus();
      void resize(100, 30);
    }
  }, [active, resize]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    terminal.scrollTop = terminal.scrollHeight;
  }, [output]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const data = keyToTerminalInput(event);
    if (!data) return;

    event.preventDefault();
    void sendInput(data);
  };

  const statusColor =
    displayState === "connected"
      ? "var(--success)"
      : displayState === "error"
        ? "var(--error)"
        : displayState === "connecting"
          ? "var(--warning)"
          : "var(--text-muted)";

  return (
    <section
      className="animate-fade-in"
      style={{
        padding: "28px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Terminal size={16} color="var(--primary)" />
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
              {profile.name} Terminal
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {profile.username}@{profile.host}:{profile.port}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {sessionId && (
            <span
              title={sessionId}
              style={{
                padding: "3px 7px",
                borderRadius: 999,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontSize: 11,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              }}
            >
              {sessionId.slice(0, 8)}
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: statusColor, textTransform: "capitalize" }}>
            <span className={`status-dot status-dot--${displayState === "connected" ? "connected" : displayState === "error" ? "error" : displayState === "connecting" ? "connecting" : "disconnected"}`} />
            {displayState}
          </span>
          {(displayState === "closed" || displayState === "error") && (
            <button
              type="button"
              onClick={reconnect}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 10px",
                borderRadius: "var(--radius)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--primary)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <RotateCcw size={14} />
              Reconnect
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: "8px 10px",
            borderRadius: "var(--radius)",
            background: displayState === "error" ? "var(--error-muted)" : "var(--surface)",
            color: displayState === "error" ? "var(--error)" : "var(--text-muted)",
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}

      <div
        ref={terminalRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => terminalRef.current?.focus()}
        style={{
          minHeight: 360,
          flex: 1,
          padding: 14,
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "#070a12",
          color: "#d1d5db",
          outline: "none",
          overflow: "auto",
          cursor: "text",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 13,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}
      >
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {output ? (
            <AnsiOutput value={output} />
          ) : (
            displayState === "connecting" ? "Connecting...\n" : "Click here and type to use the SSH terminal.\n"
          )}
          {displayState === "connected" && <span style={{ background: "#d1d5db", color: "#05070d" }}> </span>}
        </pre>
      </div>
    </section>
  );
}

function keyToTerminalInput(event: KeyboardEvent<HTMLDivElement>) {
  if (event.ctrlKey) {
    const key = event.key.toLowerCase();
    if (key === "c") return "\x03";
    if (key === "d") return "\x04";
    if (key === "l") return "\x0c";
    if (key === "z") return "\x1a";
  }

  if (event.key.length === 1 && !event.metaKey && !event.altKey) {
    return event.key;
  }

  const specialKeys: Record<string, string> = {
    Enter: "\r",
    Backspace: "\x7f",
    Tab: "\t",
    ArrowUp: "\x1b[A",
    ArrowDown: "\x1b[B",
    ArrowRight: "\x1b[C",
    ArrowLeft: "\x1b[D",
    Home: "\x1b[H",
    End: "\x1b[F",
    Delete: "\x1b[3~",
    PageUp: "\x1b[5~",
    PageDown: "\x1b[6~",
  };

  return specialKeys[event.key] ?? null;
}
