import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { ToastContext } from "./toastContext";
import type { ToastMessage, ToastType } from "./toastContext";

let toastCount = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = String(++toastCount);
      setToasts((prev) => [...prev, { id, type, message }]);

      // Auto dismiss
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}
