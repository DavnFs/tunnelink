import type { ReactNode } from "react";
import { ArrowRightLeft, Folder, Terminal } from "lucide-react";
import type { DashboardTabId } from "../../hooks/useTabs";

interface Tab {
  id: DashboardTabId;
  label: string;
  icon: ReactNode;
}

interface TabBarProps {
  activeTab: DashboardTabId;
  onChange: (tab: DashboardTabId) => void;
}

export default function TabBar({ activeTab, onChange }: TabBarProps) {
  const tabs: Tab[] = [
    {
      id: "terminal",
      label: "Terminal",
      icon: <Terminal size={15} />,
    },
    {
      id: "tunnels",
      label: "Tunnels",
      icon: <ArrowRightLeft size={15} />,
    },
    {
      id: "files",
      label: "Files",
      icon: <Folder size={15} />,
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
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minHeight: 44,
              padding: "0 14px",
              borderBottom: `2px solid ${isActive ? "var(--primary)" : "transparent"}`,
              color: isActive ? "var(--text)" : "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.background = "var(--surface-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
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
