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
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(data.needsProfile ? "/profil" : "/reisen");
    } catch (e: any) { setError(e.message || "Login fehlgeschlagen"); }
    finally { setLoading(false); }
  };

  return (
    <main style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"#003056", padding:"24px", position:"relative" }}>
        <div style={{ maxWidth:400, margin:"0 auto" }}>
          <span style={{ color:"#fff", fontWeight:700, fontSize:18 }}>DPSG Reisekosten</span>
        </div>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:4, background:"#8b0a1e" }} />
      </div>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
        <div style={{ width:"100%", maxWidth:400, background:"#fff", borderRadius:12, border:"1px solid #d4d0c8", padding:"32px 28px" }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:"#003056", margin:"0 0 4px" }}>Anmelden</h1>
          <p style={{ fontSize:14, color:"#7a756c", margin:"0 0 24px" }}>Mit deiner E-Mail-Adresse</p>
          <form onSubmit={handleLogin}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 }}>E-Mail-Adresse</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="vorname.nachname@dpsg.de"
              style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:16 }} />
            {error && <p style={{ color:"#8b0a1e", fontSize:13, margin:"0 0 12px" }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ width:"100%", padding:"12px", border:"none", borderRadius:8, background:"#003056", color:"#fff", fontSize:15, fontWeight:700, cursor:loading?"wait":"pointer", opacity:loading?0.7:1 }}>
              {loading ? "..." : "Anmelden"}
            </button>
          </form>
          <p style={{ fontSize:12, color:"#9e9a92", textAlign:"center", marginTop:20 }}>
            Kein Passwort nötig. Neue Nutzer*innen werden automatisch registriert.
          </p>
        </div>
      </div>
    </main>
  );
}
