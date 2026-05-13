import { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Download, Upload } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { useToast } from "../../hooks/useToast";

interface SettingsProps {
  onImportSuccess?: () => void;
}

type Theme = "dark" | "light" | "system";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  const saved = localStorage.getItem("theme");
  return saved === "light" || saved === "system" || saved === "dark"
    ? saved
    : "dark";
}

function applyTheme(theme: Theme) {
  const isLight =
    theme === "light" ||
    (theme === "system" &&
      !window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isLight) {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export default function Settings({ onImportSuccess }: SettingsProps) {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const toast = useToast();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const handleExport = async () => {
    try {
      const jsonStr: string = await invoke("export_profiles_json");
      
      const filePath = await save({
        filters: [{
          name: 'JSON',
          extensions: ['json']
        }],
        defaultPath: 'tunnelink_profiles.json'
      });

      if (filePath) {
        await writeTextFile(filePath, jsonStr);
        toast.success("Profiles exported successfully");
      }
    } catch (err) {
      toast.error(`Export failed: ${err}`);
    }
  };

  const handleImport = async () => {
    try {
      const selected = await open({
        filters: [{
          name: 'JSON',
          extensions: ['json']
        }],
        multiple: false
      });

      if (selected && typeof selected === 'string') {
        const fileContents = await readTextFile(selected);
        const importedCount: number = await invoke("import_profiles_json", { jsonPayload: fileContents });
        toast.success(`Successfully imported ${importedCount} profile(s)`);
        
        if (onImportSuccess) {
          onImportSuccess();
        }
      }
    } catch (err) {
      toast.error(`Import failed: ${err}`);
    }
  };

  return (
    <main
      style={{
        flex: 1,
        background: "var(--bg)",
        padding: "32px 40px",
        overflowY: "auto",
      }}
      className="animate-slide-in"
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 32 }}>
        Settings
      </h1>

      <section style={{ maxWidth: 600, marginBottom: 40 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
          Appearance
        </h2>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Choose the visual theme for TunneLink.
          </p>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => handleThemeChange("dark")}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: "var(--radius)",
                border: `2px solid ${theme === "dark" ? "var(--primary)" : "var(--border)"}`,
                background: "var(--bg)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Moon size={24} color={theme === "dark" ? "var(--primary)" : "var(--text-muted)"} />
              <span style={{ fontSize: 13, fontWeight: 500, color: theme === "dark" ? "var(--primary)" : "var(--text)" }}>
                Dark
              </span>
            </button>

            <button
              onClick={() => handleThemeChange("light")}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: "var(--radius)",
                border: `2px solid ${theme === "light" ? "var(--primary)" : "var(--border)"}`,
                background: "var(--bg)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Sun size={24} color={theme === "light" ? "var(--primary)" : "var(--text-muted)"} />
              <span style={{ fontSize: 13, fontWeight: 500, color: theme === "light" ? "var(--primary)" : "var(--text)" }}>
                Light
              </span>
            </button>

            <button
              onClick={() => handleThemeChange("system")}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: "var(--radius)",
                border: `2px solid ${theme === "system" ? "var(--primary)" : "var(--border)"}`,
                background: "var(--bg)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Monitor size={24} color={theme === "system" ? "var(--primary)" : "var(--text-muted)"} />
              <span style={{ fontSize: 13, fontWeight: 500, color: theme === "system" ? "var(--primary)" : "var(--text)" }}>
                System
              </span>
            </button>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 600 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
          Data Management
        </h2>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Export your configuration to back it up, or import an existing configuration. 
            For security, encrypted passwords are automatically removed during export.
          </p>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleExport}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 500,
                flex: 1,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg)"}
            >
              <Download size={16} />
              Export Profiles
            </button>
            <button
              onClick={handleImport}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 500,
                flex: 1,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg)"}
            >
              <Upload size={16} />
              Import Profiles
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
