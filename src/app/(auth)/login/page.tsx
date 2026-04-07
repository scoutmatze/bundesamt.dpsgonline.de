"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email"|"code">("email");
  const [mode, setMode] = useState<"password"|"register"|"code">("password");
  const [fallbackCode, setFallbackCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loginWithPassword = async () => {
    setLoading(true); setError("");
    const res = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password }) });
    const data = await res.json();
    setLoading(false);
    if (data.ok) router.push(data.needsProfile ? "/profil" : "/dashboard");
    else setError(data.error);
  };

  const register = async () => {
    setLoading(true); setError("");
    if (password !== password2) { setError("Passwörter stimmen nicht überein"); setLoading(false); return; }
    const res = await fetch("/api/auth/register", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password }) });
    const data = await res.json();
    setLoading(false);
    if (data.ok) router.push("/profil");
    else setError(data.error);
  };

  const requestCode = async () => {
    setLoading(true); setError("");
    const res = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email }) });
    const data = await res.json();
    setLoading(false);
    if (data.codeSent) { setStep("code"); if (data.code) setFallbackCode(data.code); }
    else setError(data.error || "Fehler");
  };

  const verifyCode = async () => {
    setLoading(true); setError("");
    const res = await fetch("/api/auth/verify", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, code }) });
    const data = await res.json();
    setLoading(false);
    if (data.ok) router.push(data.needsProfile ? "/profil" : "/dashboard");
    else setError(data.error || "Ungültiger Code");
  };

  const inputStyle = { width:"100%", padding:"10px 14px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:15, outline:"none", boxSizing:"border-box" as const, marginBottom:12 };
  const labelStyle = { display:"block", fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:6, textTransform:"uppercase" as const, letterSpacing:0.6 };
  const btnStyle = (active:boolean) => ({ flex:1, padding:"8px", borderRadius:6, border:`1.5px solid ${active?"#003056":"#d4d0c8"}`, background:active?"#00305610":"#fff", color:active?"#003056":"#5c5850", fontSize:12, fontWeight:active?700:400, cursor:"pointer" });

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
              <label style={labelStyle}>E-Mail-Adresse</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="vorname.nachname@dpsg.de" type="email" style={inputStyle}
                onKeyDown={e=>e.key==="Enter" && mode==="password" && loginWithPassword()} />

              <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                <button onClick={()=>setMode("password")} style={btnStyle(mode==="password")}>🔑 Anmelden</button>
                <button onClick={()=>setMode("register")} style={btnStyle(mode==="register")}>✨ Registrieren</button>
                <button onClick={()=>setMode("code")} style={btnStyle(mode==="code")}>📩 Code</button>
              </div>

              {mode === "password" && (
                <div>
                  <label style={labelStyle}>Passwort</label>
                  <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Dein Passwort" style={inputStyle}
                    onKeyDown={e=>e.key==="Enter" && loginWithPassword()} />
                  <button onClick={loginWithPassword} disabled={loading||!email||!password}
                    style={{ width:"100%", padding:"12px", borderRadius:8, border:"none", background:"#003056", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", opacity:(loading||!email||!password)?0.5:1 }}>
                    {loading ? "..." : "Anmelden"}
                  </button>
                </div>
              )}

              {mode === "register" && (
                <div>
                  <label style={labelStyle}>Passwort wählen</label>
                  <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Mindestens 6 Zeichen" style={inputStyle} />
                  <label style={labelStyle}>Passwort wiederholen</label>
                  <input value={password2} onChange={e=>setPassword2(e.target.value)} type="password" placeholder="Passwort bestätigen" style={inputStyle}
                    onKeyDown={e=>e.key==="Enter" && register()} />
                  <button onClick={register} disabled={loading||!email||!password||!password2}
                    style={{ width:"100%", padding:"12px", borderRadius:8, border:"none", background:"#003056", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", opacity:(loading||!email||!password||!password2)?0.5:1 }}>
                    {loading ? "..." : "Account erstellen"}
                  </button>
                  <p style={{ fontSize:11, color:"#9e9a92", textAlign:"center", marginTop:10 }}>Nur DPSG E-Mail-Adressen (@dpsg.de, @dpsgonline.de)</p>
                  <a href="/datenschutz" style={{fontSize:11,color:"#9e9a92",textDecoration:"none"}}>Datenschutzerklärung</a>
                </div>
              )}

              {mode === "code" && (
                <div>
                  <button onClick={requestCode} disabled={loading||!email}
                    style={{ width:"100%", padding:"12px", borderRadius:8, border:"none", background:"#003056", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", opacity:(loading||!email)?0.5:1 }}>
                    {loading ? "..." : "Code anfordern"}
                  </button>
                  <p style={{ fontSize:11, color:"#9e9a92", textAlign:"center", marginTop:10 }}>Fallback: Code wird in der App angezeigt</p>
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
                style={{ ...inputStyle, fontSize:24, textAlign:"center", letterSpacing:8, fontWeight:700 }} autoFocus
                onKeyDown={e=>e.key==="Enter" && code.length===6 && verifyCode()} />
              <button onClick={verifyCode} disabled={loading||code.length!==6}
                style={{ width:"100%", padding:"12px", borderRadius:8, border:"none", background:"#003056", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", opacity:(loading||code.length!==6)?0.5:1 }}>
                {loading ? "..." : "Bestätigen"}
              </button>
              <button onClick={()=>{setStep("email");setCode("");setError("");setFallbackCode("")}}
                style={{ width:"100%", padding:"8px", marginTop:8, border:"none", background:"none", color:"#003056", fontSize:13, cursor:"pointer" }}>← Zurück</button>
              <a href="/datenschutz" style={{display:"block",textAlign:"center",fontSize:11,color:"#9e9a92",marginTop:12}}>Datenschutzerklärung</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
