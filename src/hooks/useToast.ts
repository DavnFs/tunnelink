import { useToastContext } from "../components/ui/ToastProvider";

export function useToast() {
  const { addToast } = useToastContext();

  return {
    success: (message: string) => addToast("success", message),
    error: (message: string) => addToast("error", message),
    info: (message: string) => addToast("info", message),
  };
}
