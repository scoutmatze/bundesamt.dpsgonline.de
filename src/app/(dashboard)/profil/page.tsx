"use client";
import SignaturePad from "@/components/SignaturePad";
import { useState, useEffect, useRef } from "react";

const S = {
  card: { background:"#fff", borderRadius:12, padding:24, border:"1px solid #d4d0c8", marginBottom:16 } as const,
  h3: { fontSize:12, fontWeight:600, color:"#7a756c", textTransform:"uppercase" as const, letterSpacing:1, marginTop:0, marginBottom:16 },
  label: { display:"block" as const, fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:5, textTransform:"uppercase" as const, letterSpacing:0.6 },
  input: { width:"100%", padding:"9px 12px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" as const },
  btnPrimary: { padding:"10px 24px", borderRadius:8, border:"none", background:"#003056", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" } as const,
  btnDanger: { padding:"8px 16px", borderRadius:8, border:"1px solid #8b0a1e40", background:"#fff", color:"#8b0a1e", fontSize:13, cursor:"pointer" } as const,
  btnSecondary: { padding:"8px 16px", borderRadius:8, border:"1px solid #d4d0c8", background:"#fff", color:"#5c5850", fontSize:13, cursor:"pointer" } as const,
};

function PasswordSection() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [hasPw, setHasPw] = useState(false);
  useEffect(()=>{fetch("/api/password").then(r=>r.json()).then(d=>setHasPw(d.hasPassword)).catch(()=>{})}, []);
  const save = async () => {
    if(pw!==pw2){setMsg("Passwörter stimmen nicht überein");return}
    if(pw.length<6){setMsg("Mindestens 6 Zeichen");return}
    setSaving(true);
    const res=await fetch("/api/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pw})});
    setSaving(false);
    if(res.ok){setMsg("✓ Passwort gespeichert");setPw("");setPw2("");setHasPw(true)}else{const d=await res.json();setMsg(d.error)}
  };
  return (
    <div>
      {hasPw && <div style={{padding:"8px 14px",borderRadius:8,background:"#d1fae5",color:"#065f46",fontSize:12,marginBottom:12}}>✓ Passwort ist gesetzt</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"#5c5850",marginBottom:5,textTransform:"uppercase",letterSpacing:0.6}}>{hasPw?"Neues Passwort":"Passwort"}</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Min. 6 Zeichen" style={{width:"100%",padding:"9px 12px",border:"1.5px solid #d4d0c8",borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
        <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"#5c5850",marginBottom:5,textTransform:"uppercase",letterSpacing:0.6}}>Wiederholen</label><input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Passwort wiederholen" style={{width:"100%",padding:"9px 12px",border:"1.5px solid #d4d0c8",borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
      </div>
      {msg && <div style={{padding:"8px 14px",borderRadius:8,background:msg.startsWith("✓")?"#d1fae5":"#fee2e2",color:msg.startsWith("✓")?"#065f46":"#991b1b",fontSize:12,marginBottom:10}}>{msg}</div>}
      <button onClick={save} disabled={saving||!pw} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#003056",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:(saving||!pw)?0.5:1}}>{saving?"...":"Passwort speichern"}</button>
    </div>
  );
}

export default function ProfilPage() {
  const [p, setP] = useState({ firstName:"", lastName:"", street:"", zipCode:"", city:"", iban:"", bic:"", bank:"", accountHolder:"", gremium:"" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sigUrl, setSigUrl] = useState<string|null>(null);
  const [sigUploading, setSigUploading] = useState(false);
  const [sigMode, setSigMode] = useState<"upload"|"canvas">("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile").then(r=>r.json()).then(d => {
      setP({ firstName:d.firstName||"", lastName:d.lastName||"", street:d.street||"", zipCode:d.zipCode||"", city:d.city||"", iban:d.ibanEncrypted||"", bic:d.bic||"", bank:d.bank||"", accountHolder:d.accountHolder||"", gremium:d.gremium||"" });
      if (d.signaturePath) setSigUrl("/api/signature?t=" + Date.now());
    });
  }, []);

  const save = async () => { setSaving(true); await fetch("/api/profile", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(p) }); setSaving(false); setSaved(true); setTimeout(()=>setSaved(false), 2000); };
  const uploadSig = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setSigUploading(true);
    const fd = new FormData(); fd.append("signature", file);
    const res = await fetch("/api/signature", { method:"POST", body: fd });
    if (res.ok) setSigUrl("/api/signature?t=" + Date.now());
    else { const err = await res.json(); alert(err.error); }
    setSigUploading(false);
  };
  const deleteSig = async () => { await fetch("/api/signature", { method:"DELETE" }); setSigUrl(null); };
  const saveCanvasSig = async (dataUrl:string) => {
    const res = await fetch("/api/signature-data", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({dataUrl}) });
    if(res.ok) setSigUrl(dataUrl);
  };
  const up = (k:string,v:string) => setP(prev=>({...prev,[k]:v}));
  const inp = (l:string,k:string,extra?:any) => (
    <div><label style={S.label}>{l}</label>
    <input value={(p as any)[k]} onChange={e=>up(k,e.target.value)} style={{...S.input,...extra?.style}} {...extra}/></div>
  );

  return (
    <div>
      <h1 style={{ fontSize:24, fontWeight:700, color:"#003056", margin:"0 0 4px" }}>Profil</h1>
      <p style={{ fontSize:14, color:"#7a756c", margin:"0 0 20px" }}>Deine Stammdaten für die Reisekostenabrechnung.</p>
      {saved && <div style={{ padding:"10px 16px", borderRadius:8, background:"#d1fae5", color:"#065f46", fontSize:13, fontWeight:600, marginBottom:16, border:"1px solid #a7f3d0" }}>✓ Gespeichert!</div>}

      <div style={S.card}>
        <h3 style={S.h3}>Persönliche Daten</h3>
        <div style={{ display:"grid", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>{inp("Vorname *","firstName")}{inp("Nachname *","lastName")}</div>
          {inp("Straße","street")}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12 }}>{inp("PLZ","zipCode")}{inp("Ort","city")}</div>
          {inp("Gremium","gremium",{placeholder:"z.B. Bundesleitung, AG Finanzen..."})}
        </div>
      </div>

      <div style={S.card}>
        <h3 style={S.h3}>Bankverbindung</h3>
        <div style={{ display:"grid", gap:14 }}>
          {inp("Kontoinhaber","accountHolder")}
          {inp("IBAN","iban",{ style:{ fontFamily:"monospace", letterSpacing:1.5 }})}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {inp("BIC","bic",{ style:{ fontFamily:"monospace" }})}{inp("Bank","bank")}
            </div>
          </div>
        </div>

        <div style={S.card}>
        <h3 style={S.h3}>Unterschrift</h3>
        <p style={{ fontSize:13, color:"#7a756c", margin:"0 0 12px" }}>Wird automatisch in die Reisekostenabrechnung eingesetzt.</p>
        {sigUrl ? (
          <div>
            <div style={{ background:"#f5f3ef", borderRadius:10, padding:20, textAlign:"center", marginBottom:12 }}>
              <img src={sigUrl} alt="Unterschrift" style={{ maxWidth:"100%", maxHeight:120 }} />
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>{setSigUrl(null);setSigMode("canvas")}} style={S.btnSecondary}>Neu zeichnen</button>
              <button onClick={()=>{setSigUrl(null);setSigMode("upload")}} style={S.btnSecondary}>Andere hochladen</button>
              <button onClick={deleteSig} style={S.btnDanger}>Löschen</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <button onClick={()=>setSigMode("canvas")} style={{...S.btnSecondary, background:sigMode==="canvas"?"#00305610":"#fff", borderColor:sigMode==="canvas"?"#003056":"#d4d0c8", fontWeight:sigMode==="canvas"?700:400}}>✏️ Zeichnen</button>
              <button onClick={()=>setSigMode("upload")} style={{...S.btnSecondary, background:sigMode==="upload"?"#00305610":"#fff", borderColor:sigMode==="upload"?"#003056":"#d4d0c8", fontWeight:sigMode==="upload"?700:400}}>📤 Hochladen</button>
            </div>
            {sigMode==="canvas" ? (
              <SignaturePad onSave={saveCanvasSig} />
            ) : (
              <div>
                <button onClick={()=>fileRef.current?.click()} disabled={sigUploading}
                  style={{ padding:"12px 20px", borderRadius:8, border:"1.5px dashed #003056", background:"#00305608", color:"#003056", fontSize:14, fontWeight:700, cursor:"pointer", width:"100%" }}>
                  {sigUploading ? "Wird hochgeladen..." : "Unterschrift hochladen"}
                </button>
                <p style={{ fontSize:12, color:"#9e9a92", margin:"8px 0 0" }}>PNG, JPG oder WebP · Max 5 MB</p>
              </div>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadSig} style={{ display:"none" }} />
      </div>

      <div style={S.card}>
        <h3 style={S.h3}>Passwort</h3>
        <p style={{ fontSize:13, color:"#7a756c", margin:"0 0 12px" }}>Setze ein persönliches Passwort für den Login ohne E-Mail-Code.</p>
        <PasswordSection />
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <button onClick={save} disabled={saving} style={{...S.btnPrimary, opacity:saving?0.7:1}}>
          {saving ? "Speichert..." : "Profil speichern"}
        </button>
      </div>
    </div>
  );
}
