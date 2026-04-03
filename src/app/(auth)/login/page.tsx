"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(data.needsProfile ? "/profil" : "/reisen");
    } catch (e: any) {
      setError(e.message || "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#FAF9F6" }}>
      <div style={{ width:"100%", maxWidth:400, padding:"40px 32px", background:"#fff", borderRadius:16, border:"1px solid #EDECEA", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🏕️</div>
          <h1 style={{ fontSize:22, fontWeight:700, color:"#8B1A2B", margin:"0 0 4px", fontFamily:"'Source Serif 4',Georgia,serif" }}>DPSG Reisekosten</h1>
          <p style={{ fontSize:14, color:"#6B6862", margin:0 }}>Anmelden mit deiner E-Mail</p>
        </div>
        <form onSubmit={handleLogin}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#6B6862", marginBottom:6 }}>E-Mail-Adresse</label>
          <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="vorname.nachname@dpsg.de"
            style={{ width:"100%", padding:"12px 14px", border:"1.5px solid #D8D6D2", borderRadius:8, fontSize:15, outline:"none", boxSizing:"border-box", marginBottom:16 }}/>
          {error && <p style={{ color:"#DC2626", fontSize:13, margin:"0 0 12px" }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ width:"100%", padding:"12px", border:"none", borderRadius:8, background:"#8B1A2B", color:"#fff", fontSize:15, fontWeight:600, cursor:loading?"wait":"pointer", opacity:loading?0.7:1 }}>
            {loading ? "..." : "Anmelden"}
          </button>
        </form>
        <p style={{ fontSize:12, color:"#B8B5AF", textAlign:"center", marginTop:20 }}>
          Kein Passwort nötig. Neue Nutzer werden automatisch registriert.
        </p>
      </div>
    </main>
  );
}
