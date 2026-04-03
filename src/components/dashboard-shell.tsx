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

  const logout = async () => {
    await fetch("/api/auth/logout", { method:"POST" });
    router.push("/login");
  };

  return (
    <div style={{ minHeight:"100vh", background:"#FAF9F6" }}>
      <header style={{ background:"#8B1A2B", color:"#fff", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>🏕️</span>
          <span style={{ fontWeight:700, fontSize:16, fontFamily:"'Source Serif 4',Georgia,serif" }}>DPSG Reisekosten</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          {nav.map(n => (
            <Link key={n.href} href={n.href} style={{
              padding:"8px 16px", borderRadius:6, fontSize:13, fontWeight:600, textDecoration:"none",
              background: pathname.startsWith(n.href) ? "rgba(255,255,255,.2)" : "transparent",
              color:"#fff",
            }}>{n.icon} {n.label}</Link>
          ))}
          <button onClick={logout} style={{ padding:"8px 16px", borderRadius:6, fontSize:13, fontWeight:600, border:"none", background:"transparent", color:"rgba(255,255,255,.6)", cursor:"pointer", marginLeft:8 }}>
            Abmelden
          </button>
        </div>
      </header>
      <main style={{ maxWidth:960, margin:"0 auto", padding:"24px 20px" }}>
        {children}
      </main>
    </div>
  );
}
