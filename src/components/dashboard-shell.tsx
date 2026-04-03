"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const nav = [
  { href:"/reisen", label:"Reisen", icon:"🚂" },
  { href:"/profil", label:"Profil", icon:"⚙️" },
];

export function DashboardShell({ user, children }: { user: any; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = async () => { await fetch("/api/auth/logout", { method:"POST" }); router.push("/login"); };

  return (
    <div style={{ minHeight:"100vh", background:"#faf9f6" }}>
      <header style={{ background:"#003056", color:"#fff", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56, position:"relative" }}>
        <span style={{ fontWeight:700, fontSize:17 }}>DPSG Reisekosten</span>
        <div style={{ display:"flex", alignItems:"center", gap:2 }}>
          {nav.map(n => (
            <Link key={n.href} href={n.href} style={{
              padding:"8px 16px", borderRadius:6, fontSize:14, fontWeight:700, textDecoration:"none",
              background: pathname.startsWith(n.href) ? "rgba(255,255,255,.15)" : "transparent",
              color:"#fff",
            }}>{n.label}</Link>
          ))}
          <button onClick={logout} style={{ padding:"8px 16px", borderRadius:6, fontSize:13, fontWeight:600, border:"none", background:"transparent", color:"rgba(255,255,255,.5)", cursor:"pointer", marginLeft:8 }}>
            Abmelden
          </button>
        </div>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:"#8b0a1e" }} />
      </header>
      <main style={{ maxWidth:960, margin:"0 auto", padding:"24px 20px" }}>
        {children}
      </main>
    </div>
  );
}
