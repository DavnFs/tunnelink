import type { ReactNode } from "react";
import { ArrowRightLeft, Folder, Terminal } from "lucide-react";
import type { DashboardTabId } from "../../hooks/useTabs";

interface Tab {
  id: DashboardTabId;
  label: string;
  icon: ReactNode;
  disabled: boolean;
  title?: string;
}

interface TabBarProps {
  activeTab: DashboardTabId;
  onChange: (tab: DashboardTabId) => void;
}

const disabledTitle = "Coming in the next milestone";

export default function TabBar({ activeTab, onChange }: TabBarProps) {
  const tabs: Tab[] = [
    {
      id: "tunnels",
      label: "Tunnels",
      icon: <ArrowRightLeft size={15} />,
      disabled: false,
    },
    {
      id: "terminal",
      label: "Terminal",
      icon: <Terminal size={15} />,
      disabled: true,
      title: disabledTitle,
    },
    {
      id: "files",
      label: "Files",
      icon: <Folder size={15} />,
      disabled: true,
      title: disabledTitle,
    },
  ];

  return (
    <nav
      aria-label="Profile sections"
      style={{
        display: "flex",
        gap: 4,
        padding: "0 40px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            aria-current={isActive ? "page" : undefined}
            aria-disabled={tab.disabled}
            title={tab.title}
            onClick={() => onChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minHeight: 44,
              padding: "0 14px",
              borderBottom: `2px solid ${isActive ? "var(--primary)" : "transparent"}`,
              color: isActive
                ? "var(--text)"
                : tab.disabled
                  ? "var(--text-dim)"
                  : "var(--text-muted)",
              cursor: tab.disabled ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              opacity: tab.disabled ? 0.55 : 1,
            }}
            onMouseEnter={(e) => {
              if (!tab.disabled && !isActive) {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.background = "var(--surface-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (!tab.disabled && !isActive) {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
