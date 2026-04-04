"use client";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = async () => {
    const res = await fetch("/api/admin/users");
    if (res.status === 403) { setIsAdmin(false); setLoading(false); return; }
    setIsAdmin(true);
    setUsers(await res.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addUser = async () => {
    setError("");
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: newEmail }) });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setNewEmail(""); load();
  };

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`${email} wirklich entfernen?`)) return;
    await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#9e9a92" }}>Lade...</div>;
  if (!isAdmin) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#003056" }}>Kein Zugriff</h1>
      <p style={{ color: "#7a756c" }}>Nur Administrator*innen können Nutzer*innen verwalten.</p>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#003056", margin: "0 0 4px" }}>Nutzer*innen verwalten</h1>
      <p style={{ fontSize: 14, color: "#7a756c", margin: "0 0 20px" }}>Nur freigeschaltete E-Mail-Adressen können sich anmelden.</p>

      <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #d4d0c8", marginBottom: 16 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "#7a756c", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 16 }}>Neue*n Nutzer*in hinzufügen</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="vorname.nachname@dpsg.de"
            style={{ flex: 1, padding: "9px 12px", border: "1.5px solid #d4d0c8", borderRadius: 8, fontSize: 14, outline: "none" }}
            onKeyDown={e => e.key === "Enter" && addUser()} />
          <button onClick={addUser} disabled={!newEmail} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#003056", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: newEmail ? 1 : 0.5 }}>
            Hinzufügen
          </button>
        </div>
        {error && <p style={{ color: "#8b0a1e", fontSize: 13, marginTop: 8 }}>{error}</p>}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #d4d0c8" }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "#7a756c", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 16 }}>Aktive Nutzer*innen ({users.length})</h3>
        {users.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f5f3ef", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1815" }}>
                {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email}
                {u.role === "ADMIN" && <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 12, background: "#dbeafe", color: "#1e40af", fontSize: 11, fontWeight: 700 }}>Admin</span>}
              </div>
              <div style={{ fontSize: 12, color: "#9e9a92" }}>{u.email} · seit {new Date(u.createdAt).toLocaleDateString("de-DE")}</div>
            </div>
            {u.role !== "ADMIN" && (
              <button onClick={() => deleteUser(u.id, u.email)} style={{ border: "none", background: "none", color: "#9e9a92", cursor: "pointer", fontSize: 14 }}>✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
