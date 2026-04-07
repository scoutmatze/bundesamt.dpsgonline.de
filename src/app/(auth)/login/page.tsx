"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email"|"code">("email");
  const [mode, setMode] = useState<"password"|"code">("password");
  const [fallbackCode, setFallbackCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);

  const loginWithPassword = async () => {
    setLoading(true); setError("");
    const res = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password }) });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      router.push(data.needsProfile ? "/profil" : "/dashboard");
    } else {
      setError(data.error);
    }
  };

  const requestCode = async () => {
    setLoading(true); setError("");
    const res = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email }) });
    const data = await res.json();
    setLoading(false);
    if (data.codeSent) {
      setStep("code");
      if (data.code) setFallbackCode(data.code);
      if (data.hasPassword !== undefined) setHasPassword(data.hasPassword);
    } else {
      setError(data.error || "Fehler beim Senden");
    }
  };

  const verifyCode = async () => {
    setLoading(true); setError("");
    const res = await fetch("/api/auth/verify", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, code }) });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      router.push(data.needsProfile ? "/profil" : "/dashboard");
    } else {
      setError(data.error || "Ungültiger Code");
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#faf9f6", padding:20 }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ background:"#003056", color:"#fff", padding:"28px 24px", borderRadius:"12px 12px 0 0", textAlign:"center" }}>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700 }}>DPSG Reisekosten</h1>
          <p style={{ margin:"6px 0 0", fontSize:13, opacity:0.7 }}>Digitale Reisekostenabrechnung</p>
          <div style={{ height:3, background:"#8b0a1e", marginTop:20, marginLeft:-24, marginRight:-24 }} />
        </div>
        <div style={{ background:"#fff", padding:24, border:"1px solid #d4d0c8", borderTop:"none", borderRadius:"0 0 12px 12px" }}>
          {error && <div style={{ padding:"10px 14px", borderRadius:8, background:"#fee2e2", color:"#991b1b", fontSize:13, marginBottom:14 }}>{error}</div>}

          {step === "email" ? (
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:6, textTransform:"uppercase", letterSpacing:0.6 }}>E-Mail-Adresse</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="vorname.nachname@dpsg.de" type="email"
                style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:15, outline:"none", boxSizing:"border-box", marginBottom:12 }}
                onKeyDown={e=>e.key==="Enter" && (mode==="password" ? loginWithPassword() : requestCode())}
              />

              {/* Toggle zwischen Passwort und Code */}
              <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                <button onClick={()=>setMode("password")} style={{ flex:1, padding:"8px", borderRadius:6, border:`1.5px solid ${mode==="password"?"#003056":"#d4d0c8"}`, background:mode==="password"?"#00305610":"#fff", color:mode==="password"?"#003056":"#5c5850", fontSize:12, fontWeight:mode==="password"?700:400, cursor:"pointer" }}>🔑 Passwort</button>
                <button onClick={()=>setMode("code")} style={{ flex:1, padding:"8px", borderRadius:6, border:`1.5px solid ${mode==="code"?"#003056":"#d4d0c8"}`, background:mode==="code"?"#00305610":"#fff", color:mode==="code"?"#003056":"#5c5850", fontSize:12, fontWeight:mode==="code"?700:400, cursor:"pointer" }}>📩 Code per E-Mail</button>
              </div>

              {mode === "password" ? (
                <div>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:6, textTransform:"uppercase", letterSpacing:0.6 }}>Passwort</label>
                  <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Dein persönliches Passwort"
                    style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:15, outline:"none", boxSizing:"border-box", marginBottom:14 }}
                    onKeyDown={e=>e.key==="Enter" && loginWithPassword()}
                  />
                  <button onClick={loginWithPassword} disabled={loading || !email || !password}
                    style={{ width:"100%", padding:"12px", borderRadius:8, border:"none", background:"#003056", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", opacity:(loading || !email || !password)?0.5:1 }}>
                    {loading ? "..." : "Anmelden"}
                  </button>
                  <p style={{ fontSize:11, color:"#9e9a92", textAlign:"center", marginTop:10 }}>Noch kein Passwort? Wechsle zu "Code per E-Mail" für den Erstlogin.</p>
                </div>
              ) : (
                <div>
                  <button onClick={requestCode} disabled={loading || !email}
                    style={{ width:"100%", padding:"12px", borderRadius:8, border:"none", background:"#003056", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", opacity:(loading || !email)?0.5:1 }}>
                    {loading ? "..." : "Code anfordern"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p style={{ fontSize:14, color:"#5c5850", margin:"0 0 14px" }}>Code eingeben für <strong>{email}</strong></p>

              {fallbackCode && <div style={{ padding:"12px 16px", borderRadius:8, background:"#fef3c7", color:"#92400e", fontSize:13, marginBottom:12, textAlign:"center" }}>
                Dein Code: <strong style={{ letterSpacing:4, fontSize:20 }}>{fallbackCode}</strong>
              </div>}

              <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-stelliger Code" maxLength={6}
                style={{ width:"100%", padding:"14px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:24, textAlign:"center", letterSpacing:8, outline:"none", boxSizing:"border-box", fontWeight:700, marginBottom:14 }}
                onKeyDown={e=>e.key==="Enter" && code.length===6 && verifyCode()}
                autoFocus
              />
              <button onClick={verifyCode} disabled={loading || code.length !== 6}
                style={{ width:"100%", padding:"12px", borderRadius:8, border:"none", background:"#003056", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", opacity:(loading || code.length!==6)?0.5:1 }}>
                {loading ? "..." : "Bestätigen"}
              </button>
              <button onClick={()=>{setStep("email");setCode("");setError("");setFallbackCode("")}}
                style={{ width:"100%", padding:"8px", marginTop:8, border:"none", background:"none", color:"#003056", fontSize:13, cursor:"pointer" }}>← Andere E-Mail</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
