"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Info, X } from "lucide-react";

type Toast = { id: string; message: string; type: "success" | "error" | "info" | "warning" };

let addToast: (message: string, type?: Toast["type"]) => void = () => {};

export function useToast() {
  return {
    success: (message: string) => addToast(message, "success"),
    error: (message: string) => addToast(message, "error"),
    info: (message: string) => addToast(message, "info"),
    warning: (message: string) => addToast(message, "warning"),
  };
}

const toastIcons = {
  success: <CheckCircle2 size={18} />,
  error: <CircleAlert size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToast = (message, type = "info") => {
      const id = crypto.randomUUID();
      setToasts((items) => [...items, { id, message, type }]);
      window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 5000);
    };
  }, []);

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast" data-tone={toast.type} role={toast.type === "error" ? "alert" : "status"}>
          <span className="toast__icon" aria-hidden="true">{toastIcons[toast.type]}</span>
          <span className="toast__message">{toast.message}</span>
          <button
            className="toast__dismiss"
            onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}
            aria-label="Fechar aviso"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
