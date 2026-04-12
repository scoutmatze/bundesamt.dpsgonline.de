"use client";
import HelpBox from "@/components/HelpBox";
import { useState, useEffect } from "react";

const S = {
  label: { display:"block", fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:5, textTransform:"uppercase" as const, letterSpacing:0.6 },
  input: { width:"100%", padding:"9px 12px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" as const },
};

interface Participant { name:string; role:string; }
interface BW { id:string; date:string; location:string; occasion:string; participants:string; amountFood:number; amountDrinks:number; amountTip:number; amountTotal:number; notes:string; fileName?:string; filePath?:string; isHost?:boolean; hostName?:string; }

const empty = ():Partial<BW>&{participantList:Participant[]} => ({date:"",location:"",occasion:"",amountFood:0,amountDrinks:0,amountTip:0,notes:"",isHost:true,hostName:"",participantList:[{name:"",role:""}]});

export default function BewirtungPage() {
  const [list, setList] = useState<BW[]>([]);
  const [editing, setEditing] = useState<string|null>(null);
  const [form, setForm] = useState<any>(empty());
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch("/api/bewirtung"); const data = await res.json();
    setList(Array.isArray(data)?data:[]); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const fmt = (n:number) => n.toFixed(2).replace(".",",")+"\u00a0€";
  const up = (k:string,v:any) => setForm((p:any)=>({...p,[k]:v}));
  const totalForm = () => (parseFloat(form.amountFood)||0) + (parseFloat(form.amountDrinks)||0) + (parseFloat(form.amountTip)||0);

  const addParticipant = () => setForm((p:any)=>({...p,participantList:[...p.participantList,{name:"",role:""}]}));
  const upParticipant = (idx:number,k:string,v:string) => {
    const n = [...form.participantList]; n[idx]={...n[idx],[k]:v}; setForm((p:any)=>({...p,participantList:n}));
  };
  const delParticipant = (idx:number) => setForm((p:any)=>({...p,participantList:p.participantList.filter((_:any,i:number)=>i!==idx)}));

  const startEdit = (bw:BW) => {
    let pl:Participant[] = [];
    try { pl = JSON.parse(bw.participants); } catch { pl = []; }
    setEditing(bw.id);
    setForm({...bw, isHost:bw.isHost!==false, date:bw.date?.split("T")[0]||"", participantList: pl.length?pl:[{name:"",role:""}]});
    setAdding(false);
  };

  const save = async () => {
    const body = { ...form, participants: form.participantList.filter((p:Participant)=>p.name), id: editing || undefined };
    const method = editing ? "PUT" : "POST";
    const res = await fetch("/api/bewirtung",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!res.ok){const err=await res.json().catch(()=>({}));alert("Fehler beim Speichern: "+(err.error||res.statusText));return}
    setEditing(null); setAdding(false); setForm(empty()); load();
  };

  const del = async (id:string) => {
    if(!confirm("Bewirtung löschen?")) return;
    await fetch("/api/bewirtung",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    load();
  };

  const uploadFile = async (bwId:string, file:File) => {
    const fd = new FormData(); fd.append("file",file); fd.append("type","bewirtung"); fd.append("id",bwId);
    const res = await fetch("/api/upload",{method:"POST",body:fd});
    if(res.ok) load(); else alert("Upload fehlgeschlagen");
  };
  const downloadPdf = async (bw:BW) => {
    const res = await fetch(`/api/bewirtung/pdf?id=${bw.id}`);
    if(!res.ok){ alert("PDF-Fehler"); return; }
    const blob = await res.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`Bewirtung_${bw.date?.split("T")[0]}.pdf`; a.click();
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#9e9a92"}}>Lade...</div>;

  const formUI = (
    <div style={{background:"#fff",borderRadius:12,padding:24,border:"1px solid #d4d0c8",marginBottom:16}}>
      <h3 style={{fontSize:16,fontWeight:700,color:"#003056",marginTop:0}}>{editing?"Bewirtung bearbeiten":"Neue Bewirtung"}</h3>
      <div style={{display:"grid",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}>
          <div><label style={S.label}>Datum</label><input type="date" value={form.date} onChange={e=>up("date",e.target.value)} style={S.input}/></div>
          <div><label style={S.label}>Ort / Restaurant</label><input value={form.location} onChange={e=>up("location",e.target.value)} placeholder="z.B. Restaurant Zum Pfadfinder" style={S.input}/></div>
        </div>
        <div><label style={S.label}>Anlass der Bewirtung</label><input value={form.occasion} onChange={e=>up("occasion",e.target.value)} placeholder="z.B. Arbeitstreffen AG Finanzen" style={S.input}/></div>

        <div>
          <label style={S.label}>Bewirtete Personen</label>
          {form.participantList.map((p:Participant,i:number) => (
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:6}}>
              <input value={p.name} onChange={e=>upParticipant(i,"name",e.target.value)} placeholder="Name" style={S.input}/>
              <input value={p.role} onChange={e=>upParticipant(i,"role",e.target.value)} placeholder="Funktion / Gremium" style={S.input}/>
              <button onClick={()=>delParticipant(i)} style={{border:"none",background:"none",color:"#9e9a92",fontSize:16,cursor:"pointer"}}>✕</button>
            </div>
          ))}
          <button onClick={addParticipant} style={{padding:"4px 12px",borderRadius:6,border:"1px solid #00305640",background:"transparent",color:"#003056",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Person</button>
        </div>

        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:4}}>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#5c5850",cursor:"pointer"}}>
            <input type="checkbox" checked={form.isHost!==false} onChange={e=>up("isHost",e.target.checked)} style={{width:18,height:18,accentColor:"#003056"}}/> Ich bin die bewirtende Person
          </label>
        </div>
        {form.isHost===false && <div style={{marginBottom:8}}><label style={S.label}>Bewirtende Person</label><input value={form.hostName||""} onChange={e=>up("hostName",e.target.value)} placeholder="Name der bewirtenden Person" style={S.input}/></div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <div><label style={S.label}>Speisen €</label><input type="number" step="0.01" value={form.amountFood||""} onChange={e=>up("amountFood",e.target.value)} style={S.input}/></div>
          <div><label style={S.label}>Getränke €</label><input type="number" step="0.01" value={form.amountDrinks||""} onChange={e=>up("amountDrinks",e.target.value)} style={S.input}/></div>
          <div><label style={S.label}>Trinkgeld €</label><input type="number" step="0.01" value={form.amountTip||""} onChange={e=>up("amountTip",e.target.value)} style={S.input}/></div>
        </div>
        <div style={{fontSize:15,fontWeight:700,color:"#003056",textAlign:"right"}}>Gesamt: {fmt(totalForm())}</div>

        <div style={{marginBottom:12}}>
          <label style={S.label}>Bewirtungsbeleg</label>
          <label style={{display:"inline-flex",padding:"8px 16px",borderRadius:8,border:"1px solid #d4d0c8",background:form.fileName?"#d1fae5":"#fff",color:"#003056",fontSize:13,fontWeight:600,cursor:"pointer",gap:6}}>{form.fileName?"📎 "+form.fileName:"📤 Beleg hochladen"}<input type="file" accept=".pdf,.jpg,.png" hidden onChange={async e=>{if(!e.target.files?.[0]||!editing)return;const fd=new FormData();fd.append("file",e.target.files[0]);fd.append("type","bewirtung");fd.append("id",editing);const res=await fetch("/api/upload",{method:"POST",body:fd});if(res.ok){const d=await res.json();up("fileName",d.fileName);load()}else alert("Upload fehlgeschlagen")}}/></label>
        </div>
        <div><label style={S.label}>Hinweise</label><textarea value={form.notes||""} onChange={e=>up("notes",e.target.value)} rows={2} placeholder="Optional" style={{...S.input,resize:"vertical",fontFamily:"inherit"}}/></div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
        <button onClick={()=>{setEditing(null);setAdding(false);setForm(empty())}} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #d4d0c8",background:"#fff",color:"#5c5850",fontSize:13,cursor:"pointer"}}>Abbrechen</button>
        <button onClick={save} disabled={!form.date||!form.location||!form.occasion} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#003056",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:(!form.date||!form.location)?0.5:1}}>Speichern</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:700,color:"#003056",margin:0}}>Bewirtungsaufwendungen</h1>
        <button onClick={()=>{setAdding(true);setEditing(null);setForm(empty())}} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#003056",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Neue Bewirtung</button>
      </div>
      <HelpBox title="So funktioniert es">
        <p>Datum, Ort und Anlass eingeben → bewirtete Personen erfassen → Kosten aufschlüsseln (Speisen, Getränke, Trinkgeld) → Restaurantrechnung hochladen → 📄 PDF erstellen → per Mail an <strong>reisekosten@dpsg.de</strong> senden.</p>
      </HelpBox>

      {(adding || editing) && formUI}

      {list.length === 0 && !adding && (
        <div style={{textAlign:"center",padding:60,color:"#9e9a92"}}>
          <div style={{fontSize:40,marginBottom:12}}>🍽</div>
          <p>Noch keine Bewirtungsaufwendungen erfasst.</p>
        </div>
      )}

      {!editing && list.map(bw => (
        <div key={bw.id} style={{background:"#fff",borderRadius:12,padding:"16px 20px",border:"1px solid #d4d0c8",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>startEdit(bw)}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#003056"}}>{bw.occasion}</div>
            <div style={{fontSize:13,color:"#7a756c"}}>{new Date(bw.date).toLocaleDateString("de-DE")} · {bw.location}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontWeight:700,fontSize:16,color:"#003056"}}>{fmt(bw.amountTotal)}</span>
            <button onClick={e=>{e.stopPropagation();downloadPdf(bw)}} title="PDF" style={{padding:"6px 10px",borderRadius:6,border:"1px solid #d4d0c8",background:"#fff",color:"#003056",fontSize:13,cursor:"pointer"}}>📄</button>
            <label onClick={e=>e.stopPropagation()} style={{padding:"6px 10px",borderRadius:6,border:"1px solid #d4d0c8",background:bw.fileName?"#d1fae5":"#fff",color:"#003056",fontSize:13,cursor:"pointer"}}>{bw.fileName?"📎 "+bw.fileName:"📤 Beleg"}<input type="file" accept=".pdf,.jpg,.png" hidden onChange={e=>{if(e.target.files?.[0])uploadFile(bw.id,e.target.files[0])}}/></label>
            <button onClick={e=>{e.stopPropagation();del(bw.id)}} style={{border:"none",background:"none",color:"#9e9a92",fontSize:16,cursor:"pointer"}}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
