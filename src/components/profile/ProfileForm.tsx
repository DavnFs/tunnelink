import { useState } from "react";
import { X, Key, Lock } from "lucide-react";
import type {
  ConnectionProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  AuthMethod,
  CreateForwardRuleRequest,
} from "../../types";
import ForwardRuleForm from "../tunnel/ForwardRuleForm";

interface ProfileFormProps {
  profile: ConnectionProfile | null; // null = create mode
  onSave: (req: CreateProfileRequest | UpdateProfileRequest) => Promise<void>;
  onCancel: () => void;
  onAddRule?: (profileId: string, rule: CreateForwardRuleRequest) => Promise<void>;
}

export default function ProfileForm({
  profile,
  onSave,
  onCancel,
  onAddRule,
}: ProfileFormProps) {
  const isEdit = profile !== null;

  const [name, setName] = useState(profile?.name ?? "");
  const [host, setHost] = useState(profile?.host ?? "");
  const [port, setPort] = useState(profile?.port ?? 22);
  const [username, setUsername] = useState(profile?.username ?? "");
  const [authMethod, setAuthMethod] = useState<AuthMethod>(
    profile?.auth_method ?? "Key"
  );
  const [keyPath, setKeyPath] = useState(profile?.key_path ?? "");
  const [password, setPassword] = useState("");
  const [tags, setTags] = useState(profile?.tags?.join(", ") ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showRuleForm, setShowRuleForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) return setError("Name is required");
    if (!host.trim()) return setError("Host is required");
    if (!username.trim()) return setError("Username is required");
    if (port < 1 || port > 65535) return setError("Port must be 1-65535");
    if (authMethod === "Key" && !keyPath.trim())
      return setError("SSH key path is required");
    if (authMethod === "Password" && !isEdit && !password)
      return setError("Password is required");

    setSaving(true);
    try {
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (isEdit) {
        await onSave({
          id: profile.id,
          name: name.trim(),
          host: host.trim(),
          port,
          username: username.trim(),
          auth_method: authMethod,
          key_path: authMethod === "Key" ? keyPath.trim() : null,
          password: authMethod === "Password" && password ? password : null,
          tags: parsedTags,
        } as UpdateProfileRequest);
      } else {
        await onSave({
          name: name.trim(),
          host: host.trim(),
          port,
          username: username.trim(),
          auth_method: authMethod,
          key_path: authMethod === "Key" ? keyPath.trim() : null,
          password: authMethod === "Password" ? password : null,
          tags: parsedTags,
        } as CreateProfileRequest);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = async (rule: CreateForwardRuleRequest) => {
    if (!onAddRule || !profile) return;

    try {
      await onAddRule(profile.id, rule);
      setShowRuleForm(false);
    } catch (err) {
      setError(String(err));
    }
  };

  const inputStyle = {
    width: "100%" as const,
    padding: "8px 12px",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--text)",
    fontSize: 13,
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: 12,
    fontWeight: 500 as const,
    color: "var(--text-muted)",
    marginBottom: 4,
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          width: 480,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            {isEdit ? "Edit Profile" : "New Profile"}
          </h2>
          <button
            onClick={onCancel}
            style={{ padding: 4, borderRadius: 4, color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--error-muted)",
                border: "1px solid var(--error)",
                borderRadius: "var(--radius)",
                color: "var(--error)",
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Name */}
            <div>
              <label style={labelStyle}>Profile Name</label>
              <input
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Training Server A100"
                maxLength={100}
              />
            </div>

            {/* Host + Port row */}
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Host</label>
                <input
                  style={inputStyle}
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.1.100 or hostname"
                />
              </div>
              <div style={{ width: 80 }}>
                <label style={labelStyle}>Port</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  min={1}
                  max={65535}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label style={labelStyle}>Username</label>
              <input
                style={inputStyle}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., davin"
              />
            </div>

            {/* Auth Method */}
            <div>
              <label style={labelStyle}>Authentication</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setAuthMethod("Key")}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "10px",
                    borderRadius: "var(--radius)",
                    border: `1px solid ${authMethod === "Key" ? "var(--primary)" : "var(--border)"}`,
                    background:
                      authMethod === "Key"
                        ? "var(--primary-muted)"
                        : "var(--bg)",
                    color:
                      authMethod === "Key"
                        ? "var(--primary)"
                        : "var(--text-muted)",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <Key size={14} />
                  SSH Key
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod("Password")}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "10px",
                    borderRadius: "var(--radius)",
                    border: `1px solid ${authMethod === "Password" ? "var(--primary)" : "var(--border)"}`,
                    background:
                      authMethod === "Password"
                        ? "var(--primary-muted)"
                        : "var(--bg)",
                    color:
                      authMethod === "Password"
                        ? "var(--primary)"
                        : "var(--text-muted)",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <Lock size={14} />
                  Password
                </button>
              </div>
            </div>

            {/* Key path or Password */}
            {authMethod === "Key" ? (
              <div>
                <label style={labelStyle}>SSH Key Path</label>
                <input
                  style={inputStyle}
                  value={keyPath}
                  onChange={(e) => setKeyPath(e.target.value)}
                  placeholder="~/.ssh/id_rsa"
                />
              </div>
            ) : (
              <div>
                <label style={labelStyle}>
                  Password{isEdit ? " (leave empty to keep current)" : ""}
                </label>
                <input
                  style={inputStyle}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEdit ? "••••••••" : "Enter password"}
                />
              </div>
            )}

            {/* Tags */}
            <div>
              <label style={labelStyle}>Tags (comma-separated)</label>
              <input
                style={inputStyle}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., gpu, training, lab"
              />
            </div>
          </div>

          {/* Add Rule section (only in edit mode) */}
          {isEdit && onAddRule && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                  Forward Rules
                </span>
                <button
                  type="button"
                  onClick={() => setShowRuleForm(!showRuleForm)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: "var(--primary)",
                    padding: "4px 8px",
                    borderRadius: 4,
                  }}
                >
                  Add Rule
                </button>
              </div>

              {showRuleForm && (
                <ForwardRuleForm onSubmit={handleAddRule} />
              )}
            </div>
          )}

          {/* Submit */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 20,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "10px 20px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 20px",
                borderRadius: "var(--radius)",
                background: "var(--primary)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? "Saving..."
                : isEdit
                  ? "Update Profile"
                  : "Create Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
