import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useToastContext } from "./toastContext";

export default function ToastContainer() {
  const { toasts, removeToast } = useToastContext();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 100,
      }}
    >
      {toasts.map((toast) => {
        const isError = toast.type === "error";
        const isSuccess = toast.type === "success";

        const bg = isError
          ? "var(--error)"
          : isSuccess
          ? "var(--success)"
          : "var(--surface-hover)";
        const color = isError || isSuccess ? "#fff" : "var(--text)";

        return (
          <div
            key={toast.id}
            className="animate-slide-in"
            style={{
              background: bg,
              color: color,
              padding: "12px 16px",
              borderRadius: "var(--radius)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              minWidth: 280,
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
            }}
          >
            {isError ? (
              <AlertCircle size={18} />
            ) : isSuccess ? (
              <CheckCircle size={18} />
            ) : (
              <Info size={18} />
            )}

            <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>
              {toast.message}
            </span>

            <button
              onClick={() => removeToast(toast.id)}
              style={{ padding: 4, borderRadius: 4, color: "inherit", opacity: 0.8 }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
