"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function DashboardShell({ user, children }: { user: any; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string|null>(null);

  useEffect(() => {
    fetch("/api/trips").then(r=>r.json()).then((trips: any[]) => {
      const count = trips.reduce((sum, t) =>
        sum + (t.receipts||[]).filter((r:any) => r.amount === 0).length, 0);
      setPendingCount(count);
    }).catch(() => {});
  }, [pathname]);

  const logout = async () => { await fetch("/api/auth/logout", { method:"POST" }); router.push("/login"); };

  const sync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setSyncResult(`✓ ${data.processed} neue(r) Beleg(e)`);
        // Refresh page data
        setTimeout(() => { router.refresh(); window.location.reload(); }, 1500);
      } else {
        setSyncResult("✗ " + (data.error || "Fehler"));
      }
    } catch { setSyncResult("✗ Sync fehlgeschlagen"); }
    finally { setSyncing(false); setTimeout(() => setSyncResult(null), 4000); }
  };

  const nav = [
    { href:"/reisen", label:"Reisen", badge: pendingCount > 0 ? pendingCount : null },
    { href:"/profil", label:"Profil", badge: null },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#faf9f6" }}>
      <header style={{ background:"#003056", color:"#fff", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56, position:"relative" }}>
        <Link href="/reisen" style={{ fontWeight:700, fontSize:17, color:"#fff", textDecoration:"none" }}>DPSG Reisekosten</Link>
        <div style={{ display:"flex", alignItems:"center", gap:2 }}>
          <button onClick={sync} disabled={syncing} title="E-Mail-Postfach abrufen"
            style={{ padding:"6px 12px", borderRadius:6, fontSize:13, fontWeight:700, border:"1px solid rgba(255,255,255,.2)", background:syncing?"rgba(255,255,255,.1)":"transparent", color:"#fff", cursor:syncing?"wait":"pointer", display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ display:"inline-block", animation:syncing?"spin 1s linear infinite":"none" }}>📩</span>
            {syncing ? "..." : "Sync"}
          </button>
          {nav.map(n => (
            <Link key={n.href} href={n.href} style={{
              padding:"8px 16px", borderRadius:6, fontSize:14, fontWeight:700, textDecoration:"none",
              background: pathname.startsWith(n.href) ? "rgba(255,255,255,.15)" : "transparent",
              color:"#fff", position:"relative", display:"flex", alignItems:"center", gap:6,
            }}>
              {n.label}
              {n.badge && <span style={{ background:"#8b0a1e", color:"#fff", fontSize:11, fontWeight:700, padding:"1px 6px", borderRadius:10, minWidth:18, textAlign:"center" }}>{n.badge}</span>}
            </Link>
          ))}
          <span style={{ fontSize:13, color:"rgba(255,255,255,.5)", marginLeft:8, marginRight:4 }}>
            {user.firstName || user.email}
          </span>
          <button onClick={logout} style={{ padding:"6px 12px", borderRadius:6, fontSize:12, fontWeight:600, border:"1px solid rgba(255,255,255,.2)", background:"transparent", color:"rgba(255,255,255,.6)", cursor:"pointer" }}>
            Abmelden
          </button>
        </div>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:"#8b0a1e" }} />
      </header>
      {syncResult && (
        <div style={{ background: syncResult.startsWith("✓") ? "#d1fae5" : "#fee2e2", color: syncResult.startsWith("✓") ? "#065f46" : "#991b1b", padding:"8px 24px", fontSize:13, fontWeight:600, textAlign:"center" }}>
          {syncResult}
        </div>
      )}
      <main style={{ maxWidth:960, margin:"0 auto", padding:"24px 20px" }}>
        {children}
      </main>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
