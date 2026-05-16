import { useState } from "react";
import type { CreateForwardRuleRequest } from "../../types";

interface ForwardRuleFormProps {
  onSubmit: (rule: CreateForwardRuleRequest) => Promise<void>;
  onCancel?: () => void;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: "var(--text-muted)",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg)",
};

export default function ForwardRuleForm({ onSubmit, onCancel }: ForwardRuleFormProps) {
  const [label, setLabel] = useState("");
  const [localPort, setLocalPort] = useState(8888);
  const [remoteHost, setRemoteHost] = useState("localhost");
  const [remotePort, setRemotePort] = useState(8888);
  const [autoStart, setAutoStart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setLabel("");
    setLocalPort(8888);
    setRemoteHost("localhost");
    setRemotePort(8888);
    setAutoStart(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!label.trim()) {
      setError("Label is required");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        label: label.trim(),
        kind: "Local",
        local_port: localPort,
        remote_host: remoteHost.trim() || "localhost",
        remote_port: remotePort,
        auto_start: autoStart,
      });
      reset();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="animate-fade-in"
      onSubmit={handleSubmit}
      style={{
        padding: 12,
        background: "var(--bg)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {error && (
        <div
          style={{
            padding: "8px 10px",
            borderRadius: "var(--radius)",
            background: "var(--error-muted)",
            color: "var(--error)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Label</label>
          <input
            style={inputStyle}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g., Jupyter Lab"
          />
        </div>
        <div style={{ width: 90 }}>
          <label style={labelStyle}>Type</label>
          <input
            style={inputStyle}
            value="Local"
            readOnly
            title="Remote and Dynamic forwarding are not implemented in the MVP"
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ width: 90 }}>
          <label style={labelStyle}>Local Port</label>
          <input
            style={inputStyle}
            type="number"
            min={1}
            max={65535}
            value={localPort}
            onChange={(event) => setLocalPort(Number(event.target.value))}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Remote Host</label>
          <input
            style={inputStyle}
            value={remoteHost}
            onChange={(event) => setRemoteHost(event.target.value)}
          />
        </div>
        <div style={{ width: 90 }}>
          <label style={labelStyle}>Remote Port</label>
          <input
            style={inputStyle}
            type="number"
            min={1}
            max={65535}
            value={remotePort}
            onChange={(event) => setRemotePort(Number(event.target.value))}
          />
        </div>
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        <input
          type="checkbox"
          checked={autoStart}
          onChange={(event) => setAutoStart(event.target.checked)}
          style={{ width: "auto" }}
        />
        Auto-start when profile connects
      </label>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius)",
              color: "var(--text-muted)",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "8px 12px",
            background: "var(--primary-muted)",
            color: "var(--primary)",
            borderRadius: "var(--radius)",
            fontSize: 12,
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Adding..." : "Add Rule"}
        </button>
      </div>
    </form>
  );
}
