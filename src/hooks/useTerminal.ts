import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  closeTerminal,
  openTerminal,
  resizeTerminal,
  sendTerminalInput,
} from "../lib/tauri";
import type {
  TerminalConnectionState,
  TerminalOutputEvent,
  TerminalStatusEvent,
} from "../types";

const maxBufferLength = 40_000;
export function useTerminal(profileId: string | null, active: boolean) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<TerminalConnectionState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [attempt, setAttempt] = useState(0);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !profileId) {
      return;
    }

    let cancelled = false;
    let localSessionId: string | null = null;

    sessionRef.current = null;

    const outputListener = listen<TerminalOutputEvent>("terminal-output", (event) => {
      if (event.payload.session_id !== localSessionId) return;

      setOutput((current) => {
        const next = current + event.payload.data;
        return next.length > maxBufferLength
          ? next.slice(next.length - maxBufferLength)
          : next;
      });
    });

    const statusListener = listen<TerminalStatusEvent>("terminal-status", (event) => {
      if (event.payload.session_id !== localSessionId) return;

      setState(event.payload.state);
      setMessage(event.payload.message);
    });

    openTerminal(profileId, 100, 30)
      .then(({ session_id }) => {
        if (cancelled) {
          void closeTerminal(session_id);
          return;
        }

        localSessionId = session_id;
        sessionRef.current = session_id;
        setSessionId(session_id);
        setState("connecting");
        setMessage(null);
        setOutput("");
      })
      .catch((err) => {
        if (!cancelled) {
          setState("error");
          setMessage(String(err));
        }
      });

    return () => {
      cancelled = true;
      void outputListener.then((unlisten) => unlisten());
      void statusListener.then((unlisten) => unlisten());

      if (localSessionId) {
        void closeTerminal(localSessionId);
      }
    };
  }, [active, attempt, profileId]);

  const sendInput = useCallback(async (data: string) => {
    const activeSessionId = sessionRef.current;
    if (!activeSessionId) return;

    await sendTerminalInput(activeSessionId, data);
  }, []);

  const resize = useCallback(async (cols: number, rows: number) => {
    const activeSessionId = sessionRef.current;
    if (!activeSessionId) return;

    await resizeTerminal(activeSessionId, cols, rows);
  }, []);

  const reconnect = useCallback(() => {
    if (sessionRef.current) {
      void closeTerminal(sessionRef.current);
    }
    setState("connecting");
    setMessage(null);
    setOutput("");
    setSessionId(null);
    setAttempt((current) => current + 1);
  }, []);

  return {
    sessionId,
    state,
    message,
    output,
    sendInput,
    resize,
    reconnect,
  };
}
