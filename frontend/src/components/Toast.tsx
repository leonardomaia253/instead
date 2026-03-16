"use client";
import { useEffect, useState } from "react";

type Toast = { id: string; message: string; type: "success" | "error" | "info" | "warning" };

let addToast: (msg: string, type?: Toast["type"]) => void = () => {};

export function useToast() {
  return {
    success: (msg: string) => addToast(msg, "success"),
    error:   (msg: string) => addToast(msg, "error"),
    info:    (msg: string) => addToast(msg, "info"),
    warning: (msg: string) => addToast(msg, "warning"),
  };
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToast = (message, type = "info") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    };
  }, []);

  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
  const colors = {
    success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", color: "#10b981" },
    error:   { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",  color: "#ef4444" },
    warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", color: "#f59e0b" },
    info:    { bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.3)", color: "#7c3aed" },
  };

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10, maxWidth: 380,
    }}>
      {toasts.map((t) => {
        const c = colors[t.type];
        return (
          <div
            key={t.id}
            style={{
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 12, padding: "14px 18px",
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 14, fontWeight: 500, color: "var(--text-primary)",
              backdropFilter: "blur(10px)",
              animation: "slideIn 0.25s ease",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
          >
            <span style={{ fontSize: 18 }}>{icons[t.type]}</span>
            <span>{t.message}</span>
          </div>
        );
      })}
      <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}
