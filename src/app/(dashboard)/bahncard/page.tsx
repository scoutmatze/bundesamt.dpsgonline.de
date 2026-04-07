"use client";
import HelpBox from "@/components/HelpBox";
import { useState, useEffect } from "react";

const S = {
  label: { display:"block", fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:5, textTransform:"uppercase" as const, letterSpacing:0.6 },
  input: { width:"100%", padding:"9px 12px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" as const },
};

interface BC { id:string; year:number; cardType:string; class:number; cost:number; validFrom:string; validTo:string; bahnCardNr:string; justification:string; notes:string; status:string; fileName?:string; filePath?:string; }

export default function BahnCardPage() {
  const [list, setList] = useState<BC[]>([]);
  const [editing, setEditing] = useState<string|null>(null);
  const [form, setForm] = useState<any>({year:new Date().getFullYear(),cardType:"BC50",class:2,cost:0,validFrom:"",validTo:"",bahnCardNr:"",justification:"",notes:""});
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch("/api/bahncard"); const data = await res.json();
    setList(Array.isArray(data)?data:[]); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const fmt = (n:number) => n.toFixed(2).replace(".",",")+"\u00a0€";
  const up = (k:string,v:any) => setForm((p:any)=>({...p,[k]:v}));
  const cardLabels:Record<string,string> = {BC25:"BahnCard 25",BC50:"BahnCard 50",BC100:"BahnCard 100"};

  const startEdit = (bc:BC) => {
    setEditing(bc.id); setAdding(false);
    setForm({...bc, validFrom:bc.validFrom?.split("T")[0]||"", validTo:bc.validTo?.split("T")[0]||""});
  };

  const save = async () => {
    const body = { ...form, id: editing || undefined };
    await fetch("/api/bahncard",{method:editing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    setEditing(null); setAdding(false); load();
  };

  const del = async (id:string) => {
    if(!confirm("BahnCard-Antrag löschen?")) return;
    await fetch("/api/bahncard",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    load();
  };

  const uploadFile = async (bcId:string, file:File) => {
    const fd = new FormData(); fd.append("file",file); fd.append("type","bahncard"); fd.append("id",bcId);
    const res = await fetch("/api/upload",{method:"POST",body:fd});
    if(res.ok) load(); else alert("Upload fehlgeschlagen");
  };
  const downloadPdf = async (bc:BC) => {
    const res = await fetch(`/api/bahncard/pdf?id=${bc.id}`);
    if(!res.ok){ alert("PDF-Fehler"); return; }
    const blob = await res.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`BahnCard_${bc.year}.pdf`; a.click();
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#9e9a92"}}>Lade...</div>;

  const formUI = (
    <div style={{background:"#fff",borderRadius:12,padding:24,border:"1px solid #d4d0c8",marginBottom:16}}>
      <h3 style={{fontSize:16,fontWeight:700,color:"#003056",marginTop:0}}>{editing?"BahnCard bearbeiten":"Neuer BahnCard-Antrag"}</h3>
      <div style={{display:"grid",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(100px, 1fr))",gap:10}}>
          <div><label style={S.label}>Jahr</label><input type="number" value={form.year} onChange={e=>up("year",+e.target.value)} style={S.input}/></div>
          <div><label style={S.label}>Typ</label>
            <select value={form.cardType} onChange={e=>up("cardType",e.target.value)} style={{...S.input,background:"#fff"}}>
              <option value="BC25">BahnCard 25</option><option value="BC50">BahnCard 50</option><option value="BC100">BahnCard 100</option>
            </select>
          </div>
          <div><label style={S.label}>Klasse</label>
            <select value={form.class} onChange={e=>up("class",+e.target.value)} style={{...S.input,background:"#fff"}}>
              <option value={2}>2. Klasse</option><option value={1}>1. Klasse</option>
            </select>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(100px, 1fr))",gap:10}}>
          <div><label style={S.label}>Kosten €</label><input type="number" step="0.01" value={form.cost||""} onChange={e=>up("cost",parseFloat(e.target.value)||0)} style={S.input}/></div>
          <div><label style={S.label}>Gültig ab</label><input type="date" value={form.validFrom} onChange={e=>up("validFrom",e.target.value)} style={S.input}/></div>
          <div><label style={S.label}>Gültig bis</label><input type="date" value={form.validTo} onChange={e=>up("validTo",e.target.value)} style={S.input}/></div>
        </div>

        <div><label style={S.label}>BahnCard-Nummer</label><input value={form.bahnCardNr||""} onChange={e=>up("bahnCardNr",e.target.value)} placeholder="7081 4012 3456 7890" style={S.input}/></div>

        <div><label style={S.label}>Begründung</label><textarea value={form.justification||""} onChange={e=>up("justification",e.target.value)} rows={3} placeholder="Warum BahnCard? Erwartete Fahrten, Ersparnis..." style={{...S.input,resize:"vertical",fontFamily:"inherit"}}/></div>

        <div style={{background:"#dbeafe",borderRadius:8,padding:"12px 16px",border:"1px solid #bfdbfe"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1e40af",marginBottom:6}}>BahnCard-Ersparnis berechnen</div>
          <p style={{fontSize:12,color:"#1e40af",margin:"0 0 8px"}}>Berechne deine Ersparnis auf <a href="https://bcbp.db-app.de/bcbpmain" target="_blank" rel="noopener" style={{color:"#1e40af",fontWeight:700}}>bcbp.db-app.de</a> und lade das Ergebnis-PDF hier hoch.</p>
        </div>
        <div style={{marginBottom:12}}>
          <label style={S.label}>Beleg / Ersparnis-PDF</label>
          <label style={{display:"inline-flex",padding:"8px 16px",borderRadius:8,border:"1px solid #d4d0c8",background:form.fileName?"#d1fae5":"#fff",color:"#003056",fontSize:13,fontWeight:600,cursor:"pointer",gap:6}}>{form.fileName?"📎 "+form.fileName:"📤 Datei hochladen"}<input type="file" accept=".pdf,.jpg,.png" hidden onChange={async e=>{if(!e.target.files?.[0]||!editing)return;const fd=new FormData();fd.append("file",e.target.files[0]);fd.append("type","bahncard");fd.append("id",editing);const res=await fetch("/api/upload",{method:"POST",body:fd});if(res.ok){const d=await res.json();up("fileName",d.fileName);load()}else alert("Upload fehlgeschlagen")}}/></label>
        </div>
        <div><label style={S.label}>Hinweise</label><textarea value={form.notes||""} onChange={e=>up("notes",e.target.value)} rows={2} placeholder="Optional" style={{...S.input,resize:"vertical",fontFamily:"inherit"}}/></div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
        <button onClick={()=>{setEditing(null);setAdding(false)}} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #d4d0c8",background:"#fff",color:"#5c5850",fontSize:13,cursor:"pointer"}}>Abbrechen</button>
        <button onClick={save} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#003056",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Speichern</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:700,color:"#003056",margin:0}}>BahnCard-Anträge</h1>
        <button onClick={()=>{setAdding(true);setEditing(null);setForm({year:new Date().getFullYear(),cardType:"BC50",class:2,cost:0,validFrom:"",validTo:"",bahnCardNr:"",justification:"",notes:""})}} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#003056",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Neuer Antrag</button>
      </div>
      <HelpBox title="So funktioniert es">
        <p>Einmal jährlich BahnCard beantragen: Typ, Klasse, Kosten eingeben → Begründung schreiben → Ersparnis auf <a href="https://bcbp.db-app.de/bcbpmain" target="_blank" style={{color:"#003056",fontWeight:700}}>bcbp.db-app.de</a> berechnen und PDF hochladen → 📄 PDF erstellen → per Mail senden.</p>
      </HelpBox>
      </div>

      {(adding || editing) && formUI}

      {list.length === 0 && !adding && (
        <div style={{textAlign:"center",padding:60,color:"#9e9a92"}}>
          <div style={{fontSize:40,marginBottom:12}}>🎫</div>
          <p>Noch keine BahnCard-Anträge.</p>
        </div>
      )}

      {!editing && list.map(bc => (
        <div key={bc.id} style={{background:"#fff",borderRadius:12,padding:"16px 20px",border:"1px solid #d4d0c8",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>startEdit(bc)}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#003056"}}>{cardLabels[bc.cardType]||bc.cardType} · {bc.class}. Klasse · {bc.year}</div>
            <div style={{fontSize:13,color:"#7a756c"}}>{bc.bahnCardNr||"Keine Nr."} · {bc.validFrom ? new Date(bc.validFrom).toLocaleDateString("de-DE")+" – "+new Date(bc.validTo).toLocaleDateString("de-DE") : "Zeitraum offen"}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontWeight:700,fontSize:16,color:"#003056"}}>{fmt(bc.cost)}</span>
            <button onClick={e=>{e.stopPropagation();downloadPdf(bc)}} title="PDF" style={{padding:"6px 10px",borderRadius:6,border:"1px solid #d4d0c8",background:"#fff",color:"#003056",fontSize:13,cursor:"pointer"}}>📄</button>
            <label onClick={e=>e.stopPropagation()} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #d4d0c8",background:bc.fileName?"#d1fae5":"#fff",color:"#003056",fontSize:13,cursor:"pointer"}}>{bc.fileName?"📎 "+bc.fileName:"📤 Beleg"}<input type="file" accept=".pdf,.jpg,.png" hidden onChange={e=>{if(e.target.files?.[0])uploadFile(bc.id,e.target.files[0])}}/></label>
            <button onClick={e=>{e.stopPropagation();del(bc.id)}} style={{border:"none",background:"none",color:"#9e9a92",fontSize:16,cursor:"pointer"}}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
