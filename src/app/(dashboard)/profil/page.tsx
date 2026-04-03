"use client";
import { useState, useEffect } from "react";

export default function ProfilPage() {
  const [p, setP] = useState({ firstName:"", lastName:"", street:"", zipCode:"", city:"", iban:"", bic:"", bank:"", accountHolder:"" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(r=>r.json()).then(d => {
      setP({ firstName:d.firstName||"", lastName:d.lastName||"", street:d.street||"", zipCode:d.zipCode||"", city:d.city||"", iban:d.ibanEncrypted||"", bic:d.bic||"", bank:d.bank||"", accountHolder:d.accountHolder||"" });
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/profile", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(p) });
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const up = (k: string, v: string) => setP(prev => ({...prev, [k]: v}));
  const inp = (label: string, key: string, opts?: any) => (
    <div><label style={{ display:"block", fontSize:13, fontWeight:600, color:"#6B6862", marginBottom:5 }}>{label}</label>
    <input value={(p as any)[key]} onChange={e=>up(key,e.target.value)} style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #D8D6D2", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", ...opts?.style }} {...opts}/></div>
  );

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:700, margin:"0 0 4px", fontFamily:"'Source Serif 4',Georgia,serif" }}>Profil</h1>
      <p style={{ fontSize:14, color:"#6B6862", margin:"0 0 20px" }}>Deine Stammdaten für die Reisekostenabrechnung.</p>
      {saved && <div style={{ padding:"10px 16px", borderRadius:8, background:"#D8F3DC", color:"#2D6A4F", fontSize:13, fontWeight:600, marginBottom:16 }}>✓ Gespeichert!</div>}
      <div style={{ background:"#fff", borderRadius:12, padding:24, border:"1px solid #EDECEA", marginBottom:16 }}>
        <h3 style={{ fontSize:14, fontWeight:600, color:"#6B6862", textTransform:"uppercase", letterSpacing:0.8, marginTop:0, marginBottom:16 }}>Persönliche Daten</h3>
        <div style={{ display:"grid", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {inp("Vorname *", "firstName")}
            {inp("Nachname *", "lastName")}
          </div>
          {inp("Straße", "street")}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12 }}>
            {inp("PLZ", "zipCode")}
            {inp("Ort", "city")}
          </div>
        </div>
      </div>
      <div style={{ background:"#fff", borderRadius:12, padding:24, border:"1px solid #EDECEA", marginBottom:16 }}>
        <h3 style={{ fontSize:14, fontWeight:600, color:"#6B6862", textTransform:"uppercase", letterSpacing:0.8, marginTop:0, marginBottom:16 }}>Bankverbindung</h3>
        <div style={{ display:"grid", gap:14 }}>
          {inp("Kontoinhaber", "accountHolder")}
          {inp("IBAN", "iban", { style:{ fontFamily:"monospace", letterSpacing:1.5 }})}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {inp("BIC", "bic", { style:{ fontFamily:"monospace" }})}
            {inp("Bank", "bank")}
          </div>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <button onClick={save} disabled={saving} style={{ padding:"10px 24px", borderRadius:8, border:"none", background:"#8B1A2B", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", opacity:saving?0.7:1 }}>
          {saving ? "Speichert..." : "Profil speichern"}
        </button>
      </div>
    </div>
  );
}
