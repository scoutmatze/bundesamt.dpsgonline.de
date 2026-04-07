"use client";
import { useState } from "react";

interface Props {
  title?: string;
  children: React.ReactNode;
}

export default function HelpBox({ title = "Hilfe", children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderRadius: 8,
        border: "1px solid #d4d0c8", background: open ? "#dbeafe" : "#fff",
        color: open ? "#1e40af" : "#7a756c", fontSize: 12, fontWeight: 600,
        cursor: "pointer",
      }}>
        {open ? "✕" : "❓"} {title}
      </button>
      {open && (
        <div style={{
          marginTop: 8, padding: "16px 20px", borderRadius: 10,
          background: "#f8fafc", border: "1px solid #dbeafe",
          fontSize: 13, color: "#1a1815", lineHeight: 1.7,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
