import {
  AlertCircle,
  ChevronRight,
  Download,
  File,
  Folder,
  FolderPlus,
  Home,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ConnectionProfile, SftpFileEntry, SftpTransferEvent } from "../../types";
import { useSftp } from "../../hooks/useSftp";

interface FilesTabProps {
  profile: ConnectionProfile;
  active: boolean;
}

export default function FilesTab({ profile, active }: FilesTabProps) {
  const {
    currentPath,
    entries,
    loading,
    error,
    transfers,
    loadPath,
    refresh,
    createFolder,
    uploadFile,
    downloadFile,
    deleteEntry,
  } = useSftp(profile.id, active);
  const folders = entries.filter((entry) => entry.kind === "directory").length;
  const files = entries.length - folders;

  const handleCreateFolder = async () => {
    const name = prompt("New folder name");
    if (!name) return;
    await createFolder(name);
  };

  const handleDelete = async (entry: SftpFileEntry) => {
    if (!confirm(`Delete ${entry.name}?`)) return;
    await deleteEntry(entry);
  };

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
            {profile.name} Files
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            SFTP browser for {profile.username}@{profile.host}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <ToolbarButton icon={<Upload size={14} />} label="Upload" onClick={uploadFile} />
          <ToolbarButton icon={<FolderPlus size={14} />} label="New Folder" onClick={handleCreateFolder} />
          <ToolbarButton icon={<RefreshCw size={14} />} label="Refresh" onClick={refresh} disabled={loading} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          minHeight: 36,
          padding: "0 10px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          overflowX: "auto",
        }}
      >
        {breadcrumbs(currentPath).map((crumb, index, all) => (
          <div key={`${crumb.path}-${index}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => loadPath(crumb.path)}
              title={crumb.path}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: index === all.length - 1 ? "var(--text)" : "var(--primary)",
                fontSize: 12,
                fontWeight: index === all.length - 1 ? 600 : 500,
                whiteSpace: "nowrap",
              }}
            >
              {index === 0 && <Home size={13} />}
              {crumb.label}
            </button>
            {index < all.length - 1 && <ChevronRight size={13} color="var(--text-dim)" />}
          </div>
        ))}
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 10px",
            borderRadius: "var(--radius)",
            background: "var(--error-muted)",
            color: "var(--error)",
            fontSize: 12,
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div
        style={{
          minHeight: 360,
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 1fr) 110px 150px 116px",
            gap: 12,
            minHeight: 36,
            alignItems: "center",
            padding: "0 14px",
            borderBottom: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          <span>Name</span>
          <span>Size</span>
          <span>Modified</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {loading && entries.length === 0 ? (
            <EmptyState icon={<Loader2 size={18} className="animate-spin" />} text="Loading remote files..." />
          ) : entries.length === 0 ? (
            <EmptyState icon={<Folder size={18} />} text="This directory is empty." />
          ) : (
            entries.map((entry) => (
              <FileRow
                key={entry.path}
                entry={entry}
                transfer={transfers[entry.path]}
                onOpen={() => entry.kind === "directory" && loadPath(entry.path)}
                onDownload={() => downloadFile(entry)}
                onDelete={() => handleDelete(entry)}
              />
            ))
          )}
        </div>

        <div
          style={{
            minHeight: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "0 14px",
            borderTop: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          <span>
            {entries.length} items · {files} files, {folders} folders
          </span>
          {loading && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Loader2 size={13} className="animate-spin" />
              Refreshing
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function FileRow({
  entry,
  transfer,
  onOpen,
  onDownload,
  onDelete,
}: {
  entry: SftpFileEntry;
  transfer?: SftpTransferEvent;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const isDirectory = entry.kind === "directory";
  const progress = transfer && transfer.total > 0
    ? Math.min(100, Math.round((transfer.transferred / transfer.total) * 100))
    : null;

  return (
    <div
      onDoubleClick={onOpen}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(220px, 1fr) 110px 150px 116px",
        gap: 12,
        minHeight: 52,
        alignItems: "center",
        padding: "7px 14px",
        borderBottom: "1px solid var(--border)",
        cursor: isDirectory ? "pointer" : "default",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = "transparent";
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          {isDirectory ? (
            <Folder size={16} color="var(--primary)" />
          ) : (
            <File size={16} color="var(--text-muted)" />
          )}
          <span
            title={entry.name}
            style={{
              color: "var(--text)",
              fontSize: 13,
              fontWeight: isDirectory ? 600 : 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {entry.name}
          </span>
        </div>
        {transfer && transfer.state !== "completed" && progress !== null && (
          <div
            style={{
              height: 4,
              marginTop: 7,
              borderRadius: 999,
              background: "var(--bg)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "var(--primary)",
              }}
            />
          </div>
        )}
      </div>
      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
        {isDirectory ? "-" : formatBytes(entry.size)}
      </span>
      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
        {formatModified(entry.modified)}
      </span>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
        {!isDirectory && (
          <IconButton label="Download" icon={<Download size={14} />} onClick={onDownload} />
        )}
        <IconButton label="Delete" icon={<Trash2 size={14} />} onClick={onDelete} danger />
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        minHeight: 32,
        padding: "0 10px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: disabled ? "var(--text-dim)" : "var(--text)",
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? "wait" : "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function IconButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      style={{
        width: 30,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--bg)",
        color: danger ? "var(--error)" : "var(--text-muted)",
      }}
    >
      {icon}
    </button>
  );
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div
      style={{
        minHeight: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        color: "var(--text-muted)",
        fontSize: 13,
      }}
    >
      {icon}
      {text}
    </div>
  );
}

function breadcrumbs(path: string) {
  if (!path || path === ".") {
    return [{ label: "Home", path: "." }];
  }

  const absolute = path.startsWith("/");
  const parts = path.split("/").filter(Boolean);
  const crumbs = [{ label: absolute ? "/" : "Home", path: absolute ? "/" : "." }];

  parts.forEach((part, index) => {
    crumbs.push({
      label: part,
      path: `${absolute ? "/" : ""}${parts.slice(0, index + 1).join("/")}`,
    });
  });

  return crumbs;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatModified(value: number | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value * 1000));
}
