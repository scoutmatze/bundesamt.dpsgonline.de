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
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    fetch("/api/trips").then(r=>r.json()).then((trips: any[]) => {
      const count = trips.reduce((sum, t) => sum + (t.receipts||[]).filter((r:any) => r.amount === 0).length, 0);
      setPendingCount(count);
    }).catch(() => {});
  }, [pathname]);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  const logout = async () => { await fetch("/api/auth/logout", { method:"POST" }); router.push("/login"); };
  const sync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch("/api/sync", { method:"POST" });
      const data = await res.json();
      setSyncResult(data.message || (data.ok ? "Keine neuen Belege" : "Fehler"));
      if (data.ok && data.newReceipts > 0) setTimeout(() => window.location.reload(), 1500);
    } catch { setSyncResult("Sync fehlgeschlagen"); }
    finally { setSyncing(false); setTimeout(() => setSyncResult(null), 4000); }
  };
  const nav = [
    { href:"/dashboard", label:"Dashboard" },
    { href:"/reisen", label:"Reisen", badge: pendingCount > 0 ? pendingCount : null },
    { href:"/sachkosten", label:"Sachkosten" },
    { href:"/bewirtung", label:"Bewirtung" },
    { href:"/bahncard", label:"BahnCard" },
    { href:"/profil", label:"Profil" },
    ...(user.role === "ADMIN" ? [{ href:"/admin", label:"Admin" }] : []),
  ];
  return (
    <div style={{ minHeight:"100vh", background:"#faf9f6" }}>
      <header style={{ background:"#003056", color:"#fff", padding:"0 16px", display:"flex", alignItems:"center", justifyContent:"space-between", height:52, position:"relative" }}>
        <Link href="/dashboard" style={{ fontWeight:700, fontSize:15, color:"#fff", textDecoration:"none", whiteSpace:"nowrap" }}>DPSG Reisekosten</Link>
        {/* Desktop Nav */}
        <div className="desktop-nav" style={{ display:"flex", alignItems:"center", gap:2 }}>
          <button onClick={sync} disabled={syncing} title="E-Mail-Postfach abrufen"
            style={{ padding:"5px 10px", borderRadius:6, fontSize:12, fontWeight:700, border:"1px solid rgba(255,255,255,.2)", background:syncing?"rgba(255,255,255,.1)":"transparent", color:"#fff", cursor:syncing?"wait":"pointer" }}>
            {syncing ? "⏳" : "📩"} Sync
          </button>
          {nav.map(n => (
            <Link key={n.href} href={n.href} style={{
              padding:"6px 10px", borderRadius:6, fontSize:13, fontWeight:600, textDecoration:"none",
              background: pathname.startsWith(n.href) ? "rgba(255,255,255,.15)" : "transparent",
              color:"#fff", display:"flex", alignItems:"center", gap:4,
            }}>
              {n.label}
              {(n as any).badge && <span style={{ background:"#8b0a1e", fontSize:10, fontWeight:700, padding:"1px 5px", borderRadius:10 }}>{(n as any).badge}</span>}
            </Link>
          ))}
          <span style={{ fontSize:12, color:"rgba(255,255,255,.5)", marginLeft:6 }}>{user.firstName || user.email}</span>
          <button onClick={logout} style={{ padding:"5px 10px", borderRadius:6, fontSize:11, fontWeight:600, border:"1px solid rgba(255,255,255,.2)", background:"transparent", color:"rgba(255,255,255,.6)", cursor:"pointer" }}>Abmelden</button>
        </div>
        {/* Mobile Hamburger */}
        <div className="mobile-nav">
          <button onClick={sync} disabled={syncing} style={{ padding:"5px 8px", borderRadius:6, fontSize:12, fontWeight:700, border:"1px solid rgba(255,255,255,.2)", background:"transparent", color:"#fff", cursor:"pointer", marginRight:4 }}>
            {syncing ? "⏳" : "📩"}
          </button>
          <button onClick={()=>setMenuOpen(!menuOpen)} style={{ padding:"5px 10px", border:"1px solid rgba(255,255,255,.2)", background:menuOpen?"rgba(255,255,255,.15)":"transparent", color:"#fff", borderRadius:6, fontSize:18, cursor:"pointer", lineHeight:1 }}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:"#8b0a1e" }} />
      </header>
      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="mobile-menu" style={{ background:"#003056", padding:"8px 16px 12px", display:"flex", flexDirection:"column", gap:2 }}>
          {nav.map(n => (
            <Link key={n.href} href={n.href} style={{
              padding:"10px 14px", borderRadius:8, fontSize:14, fontWeight:600, textDecoration:"none",
              background: pathname.startsWith(n.href) ? "rgba(255,255,255,.15)" : "transparent",
              color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center",
            }}>
              {n.label}
              {(n as any).badge && <span style={{ background:"#8b0a1e", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:10 }}>{(n as any).badge}</span>}
            </Link>
          ))}
          <div style={{ borderTop:"1px solid rgba(255,255,255,.1)", marginTop:4, paddingTop:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>{user.firstName || user.email}</span>
            <button onClick={logout} style={{ padding:"6px 14px", borderRadius:6, fontSize:12, fontWeight:600, border:"1px solid rgba(255,255,255,.2)", background:"transparent", color:"rgba(255,255,255,.6)", cursor:"pointer" }}>Abmelden</button>
          </div>
        </div>
      )}
      {syncResult && (
        <div style={{ background:"#d1fae5", color:"#065f46", padding:"8px 24px", fontSize:13, fontWeight:600, textAlign:"center" }}>{syncResult}</div>
      )}
      <main style={{ maxWidth:960, margin:"0 auto", padding:"24px 20px" }}>{children}</main>
      <style>{`
        .mobile-nav { display: none; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-nav { display: flex !important; align-items: center; }
        }
      `}</style>
    </div>
  );
}
