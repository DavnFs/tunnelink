import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
  sftpDelete,
  sftpDownload,
  sftpListDir,
  sftpMkdir,
  sftpUpload,
} from "../lib/tauri";
import type { SftpFileEntry, SftpTransferEvent } from "../types";
import { useToast } from "./useToast";

export function useSftp(profileId: string | null, active: boolean) {
  const [currentPath, setCurrentPath] = useState(".");
  const [entries, setEntries] = useState<SftpFileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<Record<string, SftpTransferEvent>>({});
  const toast = useToast();

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await listen<SftpTransferEvent>("sftp-transfer", (event) => {
        if (event.payload.profile_id !== profileId) return;

        setTransfers((current) => ({
          ...current,
          [event.payload.remote_path]: event.payload,
        }));
      });
    };

    void setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [profileId]);

  const loadPath = useCallback(
    async (path = currentPath) => {
      if (!profileId || !active) return;

      setLoading(true);
      setError(null);
      try {
        const response = await sftpListDir(profileId, path);
        setCurrentPath(response.path);
        setEntries(response.entries);
      } catch (err) {
        const message = String(err);
        setError(message);
        toast.error(`Failed to load remote files: ${message}`);
      } finally {
        setLoading(false);
      }
    },
    [active, currentPath, profileId, toast]
  );

  useEffect(() => {
    if (!active || !profileId) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadPath(currentPath);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [active, currentPath, loadPath, profileId]);

  const createFolder = useCallback(
    async (name: string) => {
      if (!profileId) return;

      const trimmedName = name.trim();
      if (!trimmedName) return;
      if (trimmedName.includes("/")) {
        toast.error("Folder name cannot contain slash characters");
        return;
      }

      try {
        await sftpMkdir(profileId, joinRemotePath(currentPath, trimmedName));
        toast.success("Remote folder created");
        await loadPath(currentPath);
      } catch (err) {
        toast.error(`Failed to create folder: ${err}`);
      }
    },
    [currentPath, loadPath, profileId, toast]
  );

  const uploadFile = useCallback(async () => {
    if (!profileId) return;

    const selected = await open({
      multiple: false,
      directory: false,
      title: "Select file to upload",
    });
    const localPath = selectedPath(selected);
    if (!localPath) return;

    const remotePath = joinRemotePath(currentPath, basename(localPath));
    try {
      await sftpUpload(profileId, localPath, remotePath);
      toast.success("Upload completed");
      await loadPath(currentPath);
    } catch (err) {
      toast.error(`Failed to upload file: ${err}`);
    }
  }, [currentPath, loadPath, profileId, toast]);

  const downloadFile = useCallback(
    async (entry: SftpFileEntry) => {
      if (!profileId || entry.kind === "directory") return;

      const selected = await open({
        multiple: false,
        directory: true,
        title: "Select download folder",
      });
      const localDir = selectedPath(selected);
      if (!localDir) return;

      try {
        const result = await sftpDownload(profileId, entry.path, localDir);
        toast.success(`Downloaded to ${result.local_path}`);
      } catch (err) {
        toast.error(`Failed to download file: ${err}`);
      }
    },
    [profileId, toast]
  );

  const deleteEntry = useCallback(
    async (entry: SftpFileEntry) => {
      if (!profileId) return;

      try {
        await sftpDelete(profileId, entry.path, entry.kind === "directory");
        toast.success("Remote item deleted");
        await loadPath(currentPath);
      } catch (err) {
        toast.error(`Failed to delete remote item: ${err}`);
      }
    },
    [currentPath, loadPath, profileId, toast]
  );

  return {
    currentPath,
    entries,
    loading,
    error,
    transfers,
    loadPath,
    refresh: () => loadPath(currentPath),
    createFolder,
    uploadFile,
    downloadFile,
    deleteEntry,
  };
}

function selectedPath(value: string | string[] | null): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function basename(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? "upload.bin";
}

function joinRemotePath(base: string, name: string) {
  if (base === "/") {
    return `/${name}`;
  }

  return `${base.replace(/\/+$/, "")}/${name}`;
}
