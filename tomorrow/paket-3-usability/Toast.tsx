"use client";
import { useState, useEffect, useCallback } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

let addToastFn: ((message: string, type?: Toast["type"]) => void) | null = null;

/**
 * Call from anywhere: showToast("Gespeichert!")
 */
export function showToast(message: string, type: Toast["type"] = "success") {
  addToastFn?.(message, type);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  const colors = {
    success: { bg: "#d1fae5", fg: "#065f46", border: "#a7f3d0" },
    error: { bg: "#fee2e2", fg: "#991b1b", border: "#fecaca" },
    info: { bg: "#dbeafe", fg: "#1e40af", border: "#bfdbfe" },
  };

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => {
        const c = colors[t.type];
        return (
          <div key={t.id} style={{
            background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
            padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,.1)", minWidth: 200,
            animation: "slideIn 0.2s ease-out",
          }}>
            {t.type === "success" ? "✓ " : t.type === "error" ? "✗ " : "ℹ "}{t.message}
          </div>
        );
      })}
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}
