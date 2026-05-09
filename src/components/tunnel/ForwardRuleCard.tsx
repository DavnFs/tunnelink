import { ArrowRightLeft, Trash2 } from "lucide-react";
import type { ForwardRule } from "../../types";

interface ForwardRuleCardProps {
  rule: ForwardRule;
  onRemove: (ruleId: string) => void;
}

const kindLabels: Record<string, string> = {
  Local: "L",
  Remote: "R",
  Dynamic: "D",
};

const kindColors: Record<string, string> = {
  Local: "var(--primary)",
  Remote: "var(--success)",
  Dynamic: "var(--warning)",
};

export default function ForwardRuleCard({ rule, onRemove }: ForwardRuleCardProps) {
  return (
    <div
      className="animate-fade-in"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "var(--surface)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--border-light)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--border)")
      }
    >
      {/* Kind badge */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: kindColors[rule.kind] ?? "var(--text-muted)",
          background: `${kindColors[rule.kind] ?? "var(--text-muted)"}15`,
          padding: "3px 8px",
          borderRadius: 4,
          letterSpacing: "0.5px",
          flexShrink: 0,
        }}
      >
        {kindLabels[rule.kind] ?? "?"}
      </span>

      {/* Label */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text)",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {rule.label}
      </span>

      {/* Port mapping */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--text-muted)",
          fontFamily: "monospace",
          flexShrink: 0,
        }}
      >
        <span>{rule.local_port}</span>
        <ArrowRightLeft size={12} />
        <span>
          {rule.remote_host}:{rule.remote_port}
        </span>
      </div>

      {/* Auto-start indicator */}
      {rule.auto_start && (
        <span
          style={{
            fontSize: 10,
            color: "var(--success)",
            background: "var(--success-muted)",
            padding: "2px 6px",
            borderRadius: 4,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          AUTO
        </span>
      )}

      {/* Remove button */}
      <button
        onClick={() => onRemove(rule.id)}
        style={{
          padding: 4,
          borderRadius: 4,
          color: "var(--text-dim)",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--error)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
        title="Remove rule"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
