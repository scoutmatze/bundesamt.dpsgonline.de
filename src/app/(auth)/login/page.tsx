"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email"|"code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.codeSent) setStep("code");
    } catch (e: any) { setError(e.message || "Fehler beim Senden"); }
    finally { setLoading(false); }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/verify", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(data.needsProfile ? "/profil" : "/reisen");
    } catch (e: any) { setError(e.message || "Ungültiger Code"); }
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
          {step === "email" ? (
            <>
              <h1 style={{ fontSize:22, fontWeight:700, color:"#003056", margin:"0 0 4px" }}>Anmelden</h1>
              <p style={{ fontSize:14, color:"#7a756c", margin:"0 0 24px" }}>Du erhältst einen Anmeldecode per E-Mail.</p>
              <form onSubmit={sendCode}>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 }}>E-Mail-Adresse</label>
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="vorname.nachname@dpsg.de"
                  style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:16 }} />
                {error && <p style={{ color:"#8b0a1e", fontSize:13, margin:"0 0 12px" }}>{error}</p>}
                <button type="submit" disabled={loading}
                  style={{ width:"100%", padding:"12px", border:"none", borderRadius:8, background:"#003056", color:"#fff", fontSize:15, fontWeight:700, cursor:loading?"wait":"pointer", opacity:loading?0.7:1 }}>
                  {loading ? "Wird gesendet..." : "Code senden"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 style={{ fontSize:22, fontWeight:700, color:"#003056", margin:"0 0 4px" }}>Code eingeben</h1>
              <p style={{ fontSize:14, color:"#7a756c", margin:"0 0 24px" }}>
                Wir haben einen 6-stelligen Code an <strong>{email}</strong> gesendet.
              </p>
              <form onSubmit={verifyCode}>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 }}>Anmeldecode</label>
                <input type="text" required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                  placeholder="123456" maxLength={6} autoFocus
                  style={{ width:"100%", padding:"14px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:24, fontWeight:700, letterSpacing:8, textAlign:"center", outline:"none", boxSizing:"border-box", marginBottom:16, fontFamily:"monospace" }} />
                {error && <p style={{ color:"#8b0a1e", fontSize:13, margin:"0 0 12px" }}>{error}</p>}
                <button type="submit" disabled={loading || code.length !== 6}
                  style={{ width:"100%", padding:"12px", border:"none", borderRadius:8, background:"#003056", color:"#fff", fontSize:15, fontWeight:700, cursor:(loading||code.length!==6)?"not-allowed":"pointer", opacity:(loading||code.length!==6)?0.5:1 }}>
                  {loading ? "Wird geprüft..." : "Anmelden"}
                </button>
                <button type="button" onClick={()=>{setStep("email");setCode("");setError("")}}
                  style={{ width:"100%", padding:"10px", border:"none", background:"transparent", color:"#7a756c", fontSize:13, cursor:"pointer", marginTop:8 }}>
                  ← Andere E-Mail verwenden
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
