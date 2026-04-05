"use client";
import { useState, useEffect } from "react";

const S = {
  label: { display:"block", fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:5, textTransform:"uppercase" as const, letterSpacing:0.6 },
  input: { width:"100%", padding:"9px 12px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" as const },
};

interface Item { id?:string; date:string; description:string; amount:number; }
interface SK { id:string; year:number; quarter:number; status:string; notes:string; items:Item[]; }

export default function SachkostenPage() {
  const [list, setList] = useState<SK[]>([]);
  const [editing, setEditing] = useState<string|null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newQuarter, setNewQuarter] = useState(Math.ceil((new Date().getMonth()+1)/3));
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch("/api/sachkosten"); const data = await res.json();
    setList(Array.isArray(data) ? data : []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const fmt = (n:number) => n.toFixed(2).replace(".",",")+"\u00a0€";
  const total = (its:Item[]) => its.reduce((s,i) => s + (i.amount||0), 0);

  const create = async () => {
    const res = await fetch("/api/sachkosten",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({year:newYear,quarter:newQuarter})});
    if(res.ok){ setAdding(false); load(); } else { alert("Existiert bereits für dieses Quartal"); }
  };

  const startEdit = (sk:SK) => {
    setEditing(sk.id);
    setItems(Array.isArray(sk.items) ? sk.items.map(i=>({...i, date: typeof i.date === "string" ? i.date.split("T")[0] : ""})) : []);
    setNotes(sk.notes||"");
  };

  const saveEdit = async () => {
    await fetch("/api/sachkosten",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:editing, notes, items})});
    setEditing(null); load();
  };

  const delSK = async (id:string) => {
    if(!confirm("Sachkostenabrechnung löschen?")) return;
    await fetch("/api/sachkosten",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    load();
  };

  const addItem = () => setItems([...items, {date:"",description:"",amount:0}]);
  const upItem = (idx:number, k:string, v:any) => { const n=[...items]; n[idx]={...n[idx],[k]:v}; setItems(n); };
  const delItem = (idx:number) => setItems(items.filter((_,i)=>i!==idx));

  const downloadPdf = async (sk:SK) => {
    const res = await fetch(`/api/sachkosten/pdf?id=${sk.id}`);
    if(!res.ok){ alert("PDF-Fehler"); return; }
    const blob = await res.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`Sachkosten_Q${sk.quarter}_${sk.year}.pdf`; a.click();
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#9e9a92"}}>Lade...</div>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:700,color:"#003056",margin:0}}>Sachkostenabrechnungen</h1>
        <button onClick={()=>setAdding(true)} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#003056",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Neue Abrechnung</button>
      </div>

      {adding && (
        <div style={{background:"#fff",borderRadius:12,padding:20,border:"1px solid #d4d0c8",marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,alignItems:"end"}}>
            <div><label style={S.label}>Jahr</label><input type="number" value={newYear} onChange={e=>setNewYear(+e.target.value)} style={S.input}/></div>
            <div><label style={S.label}>Quartal</label>
              <select value={newQuarter} onChange={e=>setNewQuarter(+e.target.value)} style={{...S.input,background:"#fff"}}>
                <option value={1}>Q1 (Jan–Mär)</option><option value={2}>Q2 (Apr–Jun)</option>
                <option value={3}>Q3 (Jul–Sep)</option><option value={4}>Q4 (Okt–Dez)</option>
              </select>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setAdding(false)} style={{padding:"8px 14px",borderRadius:8,border:"1px solid #d4d0c8",background:"#fff",color:"#5c5850",fontSize:13,cursor:"pointer"}}>Abbrechen</button>
              <button onClick={create} style={{padding:"8px 14px",borderRadius:8,border:"none",background:"#003056",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Erstellen</button>
            </div>
          </div>
        </div>
      )}

      {list.length === 0 && !adding && (
        <div style={{textAlign:"center",padding:60,color:"#9e9a92"}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <p>Noch keine Sachkostenabrechnungen. Erstelle deine erste!</p>
        </div>
      )}

      {list.map(sk => editing === sk.id ? (
        <div key={sk.id} style={{background:"#fff",borderRadius:12,padding:24,border:"1px solid #d4d0c8",marginBottom:16}}>
          <h3 style={{fontSize:16,fontWeight:700,color:"#003056",marginTop:0}}>Q{sk.quarter}/{sk.year} bearbeiten</h3>

          {items.map((item,i) => (
            <div key={i} style={{display:"grid",gridTemplateColumns:"120px 1fr 100px auto",gap:8,marginBottom:8,alignItems:"end"}}>
              <div><label style={S.label}>Datum</label><input type="date" value={item.date} onChange={e=>upItem(i,"date",e.target.value)} style={S.input}/></div>
              <div><label style={S.label}>Beschreibung</label><input value={item.description} onChange={e=>upItem(i,"description",e.target.value)} style={S.input} placeholder="z.B. Druckerpatronen"/></div>
              <div><label style={S.label}>Betrag €</label><input type="number" step="0.01" value={item.amount||""} onChange={e=>upItem(i,"amount",parseFloat(e.target.value)||0)} style={S.input}/></div>
              <button onClick={()=>delItem(i)} style={{border:"none",background:"none",color:"#9e9a92",fontSize:16,cursor:"pointer",paddingBottom:10}}>✕</button>
            </div>
          ))}

          <button onClick={addItem} style={{marginBottom:12,padding:"6px 14px",borderRadius:6,border:"1px solid #00305640",background:"transparent",color:"#003056",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Position hinzufügen</button>

          <div style={{fontSize:15,fontWeight:700,color:"#003056",textAlign:"right",marginBottom:12}}>Gesamt: {fmt(total(items))}</div>

          <div style={{marginBottom:12}}>
            <label style={S.label}>Hinweise</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Optional: Hinweise für die Buchhaltung" style={{...S.input,resize:"vertical",fontFamily:"inherit"}}/>
          </div>

          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setEditing(null)} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #d4d0c8",background:"#fff",color:"#5c5850",fontSize:13,cursor:"pointer"}}>Abbrechen</button>
            <button onClick={saveEdit} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#003056",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Speichern</button>
          </div>
        </div>
      ) : (
        <div key={sk.id} style={{background:"#fff",borderRadius:12,padding:"16px 20px",border:"1px solid #d4d0c8",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>startEdit(sk)}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#003056"}}>Q{sk.quarter}/{sk.year}</div>
            <div style={{fontSize:13,color:"#7a756c"}}>{Array.isArray(sk.items) ? sk.items.length : 0} Positionen · {sk.notes ? "📝" : ""}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontWeight:700,fontSize:16,color:"#003056"}}>{fmt(total(Array.isArray(sk.items)?sk.items:[]))}</span>
            <button onClick={e=>{e.stopPropagation();downloadPdf(sk)}} title="PDF" style={{padding:"6px 10px",borderRadius:6,border:"1px solid #d4d0c8",background:"#fff",color:"#003056",fontSize:13,cursor:"pointer"}}>📄</button>
            <button onClick={e=>{e.stopPropagation();delSK(sk.id)}} style={{border:"none",background:"none",color:"#9e9a92",fontSize:16,cursor:"pointer"}}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
