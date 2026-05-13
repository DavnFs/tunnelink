import { useMemo } from "react";
import { useToastContext } from "../components/ui/toastContext";

export function useToast() {
  const { addToast } = useToastContext();

  return useMemo(
    () => ({
      success: (message: string) => addToast("success", message),
      error: (message: string) => addToast("error", message),
      info: (message: string) => addToast("info", message),
    }),
    [addToast]
  );
}
