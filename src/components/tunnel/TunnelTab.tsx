import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { ConnectionProfile, CreateForwardRuleRequest } from "../../types";
import type { TunnelStatus } from "../../hooks/useTunnels";
import ForwardRuleCard from "./ForwardRuleCard";
import ForwardRuleForm from "./ForwardRuleForm";

interface TunnelTabProps {
  profile: ConnectionProfile;
  status?: TunnelStatus;
  onAddRule: (profileId: string, rule: CreateForwardRuleRequest) => Promise<void>;
  onRemoveRule: (ruleId: string) => void;
}

export default function TunnelTab({
  profile,
  status,
  onAddRule,
  onRemoveRule,
}: TunnelTabProps) {
  const [showRuleForm, setShowRuleForm] = useState(false);
  const activeRuleIds = useMemo(
    () => new Set(status?.active_rules.map((rule) => rule.id) ?? []),
    [status?.active_rules]
  );

  const handleAddRule = async (rule: CreateForwardRuleRequest) => {
    await onAddRule(profile.id, rule);
    setShowRuleForm(false);
  };

  return (
    <section
      className="animate-fade-in"
      style={{
        padding: "28px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
            Port Forwarding Rules ({profile.forwards.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowRuleForm((current) => !current)}
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
            <Plus size={14} />
            Add Rule
          </button>
        </div>

        {showRuleForm && (
          <ForwardRuleForm
            onSubmit={handleAddRule}
            onCancel={() => setShowRuleForm(false)}
          />
        )}

        {profile.forwards.length === 0 ? (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              background: "var(--surface)",
              borderRadius: "var(--radius)",
              border: "1px dashed var(--border)",
            }}
          >
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              No forwarding rules yet. Add your first rule.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {profile.forwards.map((rule) => (
              <ForwardRuleCard
                key={rule.id}
                rule={rule}
                isActive={activeRuleIds.has(rule.id)}
                onRemove={onRemoveRule}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
