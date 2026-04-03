"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NeueReise() {
  const router = useRouter();
  const [t, setT] = useState({ purpose:"", route:"", startDate:"", startTime:"", endDate:"", endTime:"", travelMode:"BAHN", pkwReason:"", licensePlate:"" });
  const [saving, setSaving] = useState(false);
  const up = (k:string,v:string) => setT(p=>({...p,[k]:v}));

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/trips", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(t) });
    const trip = await res.json();
    router.push(`/reisen/${trip.id}`);
  };

  const inp = (label:string, key:string, opts?:any) => (
    <div><label style={{ display:"block", fontSize:13, fontWeight:600, color:"#6B6862", marginBottom:5 }}>{label}</label>
    <input value={(t as any)[key]} onChange={e=>up(key,e.target.value)} style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #D8D6D2", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }} {...opts}/></div>
  );

  return (
    <div>
      <button onClick={()=>router.push("/reisen")} style={{ border:"none", background:"none", color:"#8B1A2B", fontSize:13, fontWeight:600, cursor:"pointer", padding:0 }}>← Zurück</button>
      <h1 style={{ fontSize:22, fontWeight:700, margin:"8px 0 20px", fontFamily:"'Source Serif 4',Georgia,serif" }}>Neue Reise</h1>
      <div style={{ background:"#fff", borderRadius:12, padding:24, border:"1px solid #EDECEA" }}>
        <div style={{ display:"grid", gap:16 }}>
          {inp("Reisezweck *", "purpose", { placeholder:"z.B. BAK Internationale Arbeit – Sitzung" })}
          {inp("Reiseweg", "route", { placeholder:"Wird automatisch aus Belegen gebaut" })}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {inp("Reisebeginn *", "startDate", { type:"date" })}
            {inp("Uhrzeit", "startTime", { type:"time" })}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {inp("Reiseende", "endDate", { type:"date" })}
            {inp("Uhrzeit", "endTime", { type:"time" })}
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#6B6862", marginBottom:6 }}>Reisemittel</label>
            <div style={{ display:"flex", gap:8 }}>
              {[{id:"BAHN",l:"🚂 Bahn"},{id:"PRIVAT_PKW",l:"🚗 Privat-PKW"}].map(m=>(
                <button key={m.id} onClick={()=>up("travelMode",m.id)} style={{
                  padding:"10px 20px", border:`1.5px solid ${t.travelMode===m.id?"#8B1A2B":"#D8D6D2"}`, borderRadius:8,
                  background:t.travelMode===m.id?"#8B1A2B08":"#fff", color:t.travelMode===m.id?"#8B1A2B":"#6B6862",
                  fontWeight:t.travelMode===m.id?600:400, fontSize:14, cursor:"pointer",
                }}>{m.l}</button>
              ))}
            </div>
          </div>
          {t.travelMode==="PRIVAT_PKW" && (
            <div style={{ background:"#F5F4F1", borderRadius:10, padding:"18px 20px", display:"grid", gap:12 }}>
              <div><label style={{ display:"block", fontSize:13, fontWeight:600, color:"#6B6862", marginBottom:5 }}>Begründung PKW *</label>
              <textarea value={t.pkwReason} onChange={e=>up("pkwReason",e.target.value)} style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #D8D6D2", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", minHeight:60, resize:"vertical" }}/></div>
              {inp("Amtl. Kennzeichen", "licensePlate", { placeholder:"M-AB 1234" })}
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:10, marginTop:24, justifyContent:"flex-end" }}>
          <button onClick={()=>router.push("/reisen")} style={{ padding:"10px 22px", borderRadius:8, border:"1px solid #D8D6D2", background:"#fff", color:"#6B6862", fontSize:14, cursor:"pointer" }}>Abbrechen</button>
          <button onClick={save} disabled={!t.purpose||!t.startDate||saving} style={{ padding:"10px 22px", borderRadius:8, border:"none", background:"#8B1A2B", color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", opacity:(!t.purpose||!t.startDate||saving)?0.5:1 }}>
            {saving?"...":"Reise erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}
