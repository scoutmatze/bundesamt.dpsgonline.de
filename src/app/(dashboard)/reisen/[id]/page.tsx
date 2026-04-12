"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

const S = {
  label: { display:"block" as const, fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:5, textTransform:"uppercase" as const, letterSpacing:0.6 },
  input: { width:"100%", padding:"9px 12px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" as const },
};

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const c: Record<string,{bg:string;fg:string;border:string}> = {
    blue:{bg:"#dbeafe",fg:"#1e40af",border:"#bfdbfe"},
    amber:{bg:"#fef3c7",fg:"#92400e",border:"#fde68a"},
    green:{bg:"#d1fae5",fg:"#065f46",border:"#a7f3d0"},
  };
  const s = c[color]||c.blue;
  return <span style={{display:"inline-flex",padding:"2px 8px",borderRadius:12,background:s.bg,color:s.fg,border:`1px solid ${s.border}`,fontSize:11,fontWeight:700}}>{children}</span>;
}

export default function TripDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [allTrips, setAllTrips] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string|null>(null);
  const [moving, setMoving] = useState<string|null>(null);
  const [r, setR] = useState({ description:"",amount:"0",date:"",category:"FAHRT",fromStation:"",toStation:"",isHandyticket:false });
  const [uploadFile, setUploadFile] = useState<File|null>(null);
  const [previewData, setPreviewData] = useState<{text?:string;url?:string;fileName?:string}|null>(null);
  const [editData, setEditData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [kmLegs, setKmLegs] = useState<{from:string;to:string;km:number}[]>([]);
  const [kmLoading, setKmLoading] = useState<number|null>(null);

  const load = async () => {
    const res = await fetch("/api/trips"); const trips = await res.json();
    setAllTrips(trips);
    const found=trips.find((t:any)=>t.id===id)||null;setTrip(found);if(found){setNotes(found.notes||"");try{setKmLegs(JSON.parse(found.kmLegs||"[]"))}catch{setKmLegs([])}}
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const addReceipt = async () => {
    let fileName=null,filePath=null;
    if(uploadFile){
      const fd=new FormData();fd.append("file",uploadFile);fd.append("type","receipt");fd.append("id","temp");
      const upRes=await fetch("/api/upload",{method:"POST",body:fd});
      if(upRes.ok){const d=await upRes.json();fileName=d.fileName;filePath=d.filePath}
    }
    await fetch("/api/receipts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...r,tripId:id,amount:parseFloat(r.amount),fileName,filePath})});
    setR({description:"",amount:"0",date:"",category:"FAHRT",fromStation:"",toStation:"",isHandyticket:false}); setUploadFile(null); setAdding(false); load();
  };
  const saveEdit = async (rid:string) => {
    await fetch("/api/receipts",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:rid,...editData})});
    setEditing(null); setEditData({}); load();
  };
  const startEdit = (rc:any) => {
    setEditing(rc.id); setMoving(null);
    setEditData({description:rc.description||"",amount:rc.amount,date:rc.date?.split("T")[0]||"",category:rc.category,fromStation:rc.fromStation||"",toStation:rc.toStation||"",isHandyticket:rc.isHandyticket});
  };
  const moveReceipt = async (receiptId:string, targetTripId:string) => {
    await fetch("/api/receipts/move",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({receiptId,targetTripId})});
    setMoving(null); load();
  };
  const delReceipt = async (rid:string) => { await fetch("/api/receipts",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:rid,tripId:id})}); load(); };
  const saveNotes = async (val:string) => { await fetch("/api/trips",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,notes:val})}); };
  const saveKm = async (legs:{from:string;to:string;km:number}[]) => {
    const totalKm=legs.reduce((s,l)=>s+l.km,0);
    await fetch("/api/trips",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,kmLegs:JSON.stringify(legs),kmTotal:totalKm,kmAmount:totalKm*0.20})});
    load();
  };
  const showPreview = async (filePath:string) => {
    const res = await fetch(`/api/preview?path=${encodeURIComponent(filePath)}`);
    if(res.ok) setPreviewData(await res.json());
  };
  const submitTrip = async () => {
    if(!confirm("Reise als eingereicht markieren? Sie wird danach nicht mehr bearbeitbar.")) return;
    await fetch("/api/trips",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:"SUBMITTED"})});
    load();
  };
  const reopenTrip = async () => {
    await fetch("/api/trips",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:"DRAFT"})});
    load();
  };
  const isSubmitted = trip?.status === "SUBMITTED";
  const lookupKm = async (idx:number) => {
    const leg=kmLegs[idx]; if(!leg.from||!leg.to)return;
    setKmLoading(idx);
    try{
      const res=await fetch(`/api/distance?from=${encodeURIComponent(leg.from)}&to=${encodeURIComponent(leg.to)}`);
      if(res.ok){const d=await res.json();const n=[...kmLegs];n[idx]={...n[idx],km:d.km};setKmLegs(n);saveKm(n)}
      else alert("Route nicht gefunden")
    }catch{alert("Fehler")}finally{setKmLoading(null)}
  };
  const delTrip = async () => { if(!confirm("Reise wirklich löschen?"))return; await fetch("/api/trips",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})}); router.push("/reisen"); };
  const downloadPdf = async () => {
    const res=await fetch(`/api/pdf?tripId=${id}`);
    if(!res.ok){alert("Fehler: "+(await res.json()).error);return}
    const blob=await res.blob();const url=URL.createObjectURL(blob);
    const cd=res.headers.get("content-disposition")||"";const fn=cd.match(/filename="(.+)"/)?.[1]||"Abrechnung.pdf";const a=document.createElement("a");a.href=url;a.download=decodeURIComponent(fn);a.click();URL.revokeObjectURL(url);
  };

  const fmt=(n:number)=>n.toFixed(2).replace(".",",")+"\u00a0€";
  const up=(k:string,v:any)=>setR(p=>({...p,[k]:v}));
  const upEdit=(k:string,v:any)=>setEditData((p:any)=>({...p,[k]:v}));

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#9e9a92"}}>Lade...</div>;
  if(!trip) return <div style={{padding:40,textAlign:"center"}}>Reise nicht gefunden</div>;

  const previewModal = previewData ? (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setPreviewData(null)}>
      <div style={{background:"#fff",borderRadius:12,padding:24,maxWidth:600,maxHeight:"80vh",overflow:"auto",width:"100%"}} onClick={(e:any)=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:16,fontWeight:700,color:"#003056",margin:0}}>📄 {previewData.fileName}</h3>
          <button onClick={()=>setPreviewData(null)} style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:"#9e9a92"}}>✕</button>
        </div>
        {previewData.text && <pre style={{fontSize:12,color:"#1a1815",background:"#f5f3ef",padding:16,borderRadius:8,whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:400,overflow:"auto"}}>{previewData.text}</pre>}
        {previewData.url && <img src={previewData.url} style={{maxWidth:"100%",borderRadius:8}} alt="Beleg"/>}
      </div>
    </div>
  ) : null;
  const receipts=trip.receipts||[];
  const byC=(c:string)=>receipts.filter((r:any)=>r.category===c).reduce((s:number,r:any)=>s+r.amount,0);
  const receiptTotal=receipts.reduce((s:number,r:any)=>s+r.amount,0);
  const total=trip.travelMode==="PRIVAT_PKW"?(trip.kmAmount||0)+receiptTotal:receiptTotal;
  const hasIncomplete=receipts.some((r:any)=>r.amount===0&&!(r.fileName||'').includes('Kaufbeleg')&&!(r.fileName||'').includes('Reservierung')&&!(r.fileName||'').includes('Kaufbeleg')&&!(r.fileName||'').includes('Reservierung')&&r.category!=="NACHWEIS");
  const otherTrips=allTrips.filter((t:any)=>t.id!==id);

  return (
    <div>
      {previewModal}
      {isSubmitted && <div style={{padding:"12px 20px",borderRadius:10,background:"#d1fae5",color:"#065f46",fontSize:14,fontWeight:700,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>✓ Diese Reise wurde als eingereicht markiert<button onClick={reopenTrip} style={{padding:"4px 12px",borderRadius:6,border:"1px solid #065f46",background:"transparent",color:"#065f46",fontSize:12,cursor:"pointer"}}>↩ Wieder öffnen</button></div>}
      <button onClick={()=>router.push("/reisen")} style={{border:"none",background:"none",color:"#003056",fontSize:13,fontWeight:700,cursor:"pointer",padding:0}}>← Zurück</button>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginTop:8,marginBottom:20,gap:12,flexWrap:"wrap"}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:"#003056",margin:0,cursor:"pointer"}} onClick={()=>{const n=prompt("Reisezweck umbenennen:",trip.purpose);if(n&&n!==trip.purpose)fetch("/api/trips",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,purpose:n})}).then(()=>load())}}>{trip.purpose} <span style={{fontSize:14,color:"#9e9a92",fontWeight:400}}>✏️</span></h1>
          <p style={{fontSize:14,color:"#7a756c",margin:"4px 0 0"}}>{trip.travelMode==="PRIVAT_PKW"?"🚗":trip.travelMode==="MIETWAGEN"?"🚙":"🚂"} {trip.route||"—"}</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8,alignItems:"end"}}>
            <div><label style={{fontSize:10,color:"#9e9a92",display:"block"}}>Beginn</label><input type="date" defaultValue={trip.startDate?.split("T")[0]} onBlur={e=>fetch("/api/trips",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,startDate:e.target.value})}).then(()=>load())} style={{padding:"4px 8px",border:"1px solid #d4d0c8",borderRadius:6,fontSize:13}}/></div>
            <div><label style={{fontSize:10,color:"#9e9a92",display:"block"}}>Uhrzeit</label><input type="time" defaultValue={trip.startTime||""} onBlur={e=>fetch("/api/trips",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,startTime:e.target.value})}).then(()=>load())} style={{padding:"4px 8px",border:"1px solid #d4d0c8",borderRadius:6,fontSize:13}}/></div>
            <div><label style={{fontSize:10,color:"#9e9a92",display:"block"}}>Ende</label><input type="date" defaultValue={trip.endDate?.split("T")[0]||""} onBlur={e=>fetch("/api/trips",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,endDate:e.target.value})}).then(()=>load())} style={{padding:"4px 8px",border:"1px solid #d4d0c8",borderRadius:6,fontSize:13}}/></div>
            <div><label style={{fontSize:10,color:"#9e9a92",display:"block"}}>Uhrzeit</label><input type="time" defaultValue={trip.endTime||""} onBlur={e=>fetch("/api/trips",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,endTime:e.target.value})}).then(()=>load())} style={{padding:"4px 8px",border:"1px solid #d4d0c8",borderRadius:6,fontSize:13}}/></div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={delTrip} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #d4d0c8",background:"#fff",color:"#5c5850",fontSize:13,cursor:"pointer"}}>Löschen</button>
          <button onClick={downloadPdf} disabled={!receipts.length&&!trip.kmAmount&&trip.travelMode==="BAHN"||hasIncomplete} style={{padding:"8px 16px",borderRadius:8,border:"none",background:hasIncomplete?"#d4d0c8":"#003056",color:"#fff",fontSize:13,fontWeight:700,cursor:hasIncomplete?"not-allowed":"pointer"}}>📄 PDF-Paket erstellen</button>
          {!isSubmitted ? <button onClick={submitTrip} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #2D6A4F",background:"#d1fae5",color:"#065f46",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Als eingereicht markieren</button> : <button onClick={reopenTrip} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #d4d0c8",background:"#fff",color:"#7a756c",fontSize:13,cursor:"pointer"}}>↩ Wieder öffnen</button>}
        </div>
      </div>

      {hasIncomplete && <div style={{padding:"10px 16px",borderRadius:8,background:"#fef3c7",color:"#92400e",fontSize:13,fontWeight:600,marginBottom:16,border:"1px solid #fde68a"}}>⚠️ {receipts.filter((r:any)=>r.amount===0&&!(r.fileName||'').includes('Kaufbeleg')&&!(r.fileName||'').includes('Reservierung')&&!(r.fileName||'').includes('Kaufbeleg')&&!(r.fileName||'').includes('Reservierung')&&r.category!=="NACHWEIS").length} Beleg(e) ohne Betrag</div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))",gap:10,marginBottom:20}}>
        {[{l:"Fahrt",v:trip.travelMode==="PRIVAT_PKW"?(trip.kmAmount||0):byC("FAHRT")},{l:"Unterkunft",v:byC("UNTERKUNFT")},{l:"Verpflegung",v:byC("VERPFLEGUNG")},{l:"Nebenkosten",v:byC("NEBENKOSTEN")},{l:"Gesamt",v:total,a:true}].map((c,i)=>(
          <div key={i} style={{background:c.a?"#003056":"#fff",borderRadius:10,padding:"12px 14px",border:c.a?"none":"1px solid #d4d0c8",color:c.a?"#fff":"#1a1815"}}>
            <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:0.6,fontWeight:600,opacity:0.6,marginBottom:4}}>{c.l}</div>
            <div style={{fontSize:18,fontWeight:700}}>{fmt(c.v)}</div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",border:"1px solid #d4d0c8",marginBottom:16}}>
      {(trip.travelMode==="PRIVAT_PKW"||trip.travelMode==="MIETWAGEN") && (
      <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",border:"1px solid #d4d0c8",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <label style={{fontSize:12,fontWeight:600,color:"#5c5850",textTransform:"uppercase",letterSpacing:0.6}}>
            {trip.travelMode==="PRIVAT_PKW"?"Kilometerabrechnung (0,20 €/km)":"Fahrtstrecken (Mietwagen)"}
          </label>
          <span style={{fontWeight:700,fontSize:16,color:"#003056"}}>
            {trip.travelMode==="PRIVAT_PKW"?`${kmLegs.reduce((s:number,l:any)=>s+l.km,0)} km · ${(kmLegs.reduce((s:number,l:any)=>s+l.km,0)*0.20).toFixed(2).replace(".",",")} €`:`${kmLegs.reduce((s:number,l:any)=>s+l.km,0)} km`}
          </span>
        </div>
        {kmLegs.map((leg:any,i:number)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 70px auto auto",gap:8,marginBottom:8,alignItems:"end"}}>
            <div><label style={{fontSize:11,fontWeight:600,color:"#5c5850",display:"block",marginBottom:3}}>VON</label><input value={leg.from} onChange={e=>{const n=[...kmLegs];n[i]={...n[i],from:e.target.value};setKmLegs(n)}} onBlur={()=>saveKm(kmLegs)} placeholder="z.B. Mönchengladbach" style={{width:"100%",padding:"7px 10px",border:"1.5px solid #d4d0c8",borderRadius:6,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
            <div><label style={{fontSize:11,fontWeight:600,color:"#5c5850",display:"block",marginBottom:3}}>NACH</label><input value={leg.to} onChange={e=>{const n=[...kmLegs];n[i]={...n[i],to:e.target.value};setKmLegs(n)}} onBlur={()=>saveKm(kmLegs)} placeholder="z.B. Neuss" style={{width:"100%",padding:"7px 10px",border:"1.5px solid #d4d0c8",borderRadius:6,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
            <div><label style={{fontSize:11,fontWeight:600,color:"#5c5850",display:"block",marginBottom:3}}>KM</label><input type="number" value={leg.km||""} onChange={e=>{const n=[...kmLegs];n[i]={...n[i],km:parseInt(e.target.value)||0};setKmLegs(n)}} onBlur={()=>saveKm(kmLegs)} style={{width:"100%",padding:"7px 10px",border:"1.5px solid #d4d0c8",borderRadius:6,fontSize:13,outline:"none",textAlign:"right"}}/></div>
            <button onClick={()=>lookupKm(i)} disabled={!leg.from||!leg.to||kmLoading!==null} title="Entfernung berechnen (OpenStreetMap)" style={{padding:"7px 10px",borderRadius:6,border:"1px solid #d4d0c8",background:kmLoading===i?"#dbeafe":"#fff",color:"#003056",fontSize:13,cursor:"pointer"}}>{kmLoading===i?"⏳":"📍"}</button>
            <button onClick={()=>{const n=kmLegs.filter((_:any,j:number)=>j!==i);setKmLegs(n);saveKm(n)}} style={{border:"none",background:"none",color:"#9e9a92",fontSize:16,cursor:"pointer",padding:"8px"}}>✕</button>
          </div>
        ))}
        <button onClick={()=>{setKmLegs([...kmLegs,{from:"",to:"",km:0}])}} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #00305640",background:"transparent",color:"#003056",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Strecke hinzufügen</button>
        <p style={{fontSize:11,color:"#9e9a92",marginTop:8,marginBottom:0}}>📍 = Entfernung per OpenStreetMap berechnen (DSGVO-konform). Alternativ manuell eingeben.</p>
      </div>)}

      {trip.startTime && trip.endTime && (
      <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",border:"1px solid #d4d0c8",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <label style={{fontSize:12,fontWeight:600,color:"#5c5850",textTransform:"uppercase",letterSpacing:0.6}}>Verpflegungspauschale</label>
          <span style={{fontSize:13,color:"#7a756c"}}>{(()=>{
            const s=new Date(`${trip.startDate?.split("T")[0]}T${trip.startTime}`);
            const e=new Date(`${(trip.endDate||trip.startDate)?.split("T")[0]}T${trip.endTime}`);
            const days=Math.ceil((e.getTime()-s.getTime())/(1000*60*60*24));
            const hours=(e.getTime()-s.getTime())/(1000*60*60);
            if(days<=0&&hours<=8)return "Abwesenheit ≤ 8h — keine Pauschale";
            if(days<=0&&hours>8)return `${hours.toFixed(1)}h Abwesenheit → 14,00 €`;
            const anreise=14;const abreise=14;const zwischen=(days-1)*28;
            const total=anreise+abreise+zwischen;
            return `${days+1} Tage → ${total.toFixed(2).replace(".",",")} € (${anreise}+${zwischen>0?zwischen+"+(Zwischentage) ":""}${abreise})`;
          })()}</span>
        </div>
        <p style={{fontSize:11,color:"#9e9a92",margin:"6px 0 0"}}>Anreisetag: 14 € · Ganzer Tag: 28 € · Abreisetag: 14 € — Kürzungen bei gestellten Mahlzeiten nicht berücksichtigt</p>
      </div>)}

      <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",border:"1px solid #d4d0c8",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <label style={{fontSize:12,fontWeight:600,color:"#5c5850",textTransform:"uppercase",letterSpacing:0.6}}>🌱 CO₂-Fußabdruck</label>
          <span style={{fontWeight:700,fontSize:16,color:trip.travelMode==="BAHN"?"#2D6A4F":"#b45309"}}>{(()=>{
            const factors:any={BAHN:32,PRIVAT_PKW:154,MIETWAGEN:154,DIENSTWAGEN:154,FLUGZEUG:214};
            const f=factors[trip.travelMode]||0;
            let km=0;
            if(trip.kmLegs){try{km=JSON.parse(trip.kmLegs).reduce((s:number,l:any)=>s+l.km,0)}catch{}}
            if(!km&&trip.travelMode==="BAHN"){const fahrten=receipts.filter((r:any)=>r.category==="FAHRT"&&r.fromStation&&r.toStation);km=fahrten.length*300}
            const co2=Math.round(f*km/100)/10;
            return co2>0?co2.toFixed(1)+" kg CO₂":"—";
          })()}</span>
        </div>
        <div style={{fontSize:11,color:"#9e9a92",marginTop:6}}>
          {trip.travelMode==="BAHN"?"🚂 Bahn: 32 g/km — umweltfreundlichste Wahl":"🚗 PKW: 154 g/km"}
          {trip.travelMode==="BAHN"?" · Bis zu 80% weniger CO₂ als PKW":""}
        </div>
      </div>
        <label style={{display:"block",fontSize:12,fontWeight:600,color:"#5c5850",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Hinweise für Buchhaltung / Kassenprüfung</label>
        <textarea value={notes} onChange={e=>{setNotes(e.target.value)}} onBlur={e=>saveNotes(e.target.value)} placeholder="z.B. Zwei Reservierungen, weil eine für Person X damit wir zusammensitzen..." rows={3} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #d4d0c8",borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"}}/>
      </div>
      <div style={{background:"#fff",borderRadius:12,padding:24,border:"1px solid #d4d0c8"}}>
        <h3 style={{fontSize:12,fontWeight:600,color:"#7a756c",textTransform:"uppercase",letterSpacing:1,marginTop:0,marginBottom:16}}>Belege ({receipts.length})</h3>

        {receipts.map((rc:any) => editing===rc.id ? (
          <div key={rc.id} style={{background:"#f5f3ef",borderRadius:10,padding:"16px 18px",marginBottom:8}}>
            <div style={{display:"grid",gap:10}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
                <div><label style={S.label}>Beschreibung</label><input value={editData.description} onChange={e=>upEdit("description",e.target.value)} style={S.input}/></div>
                <div><label style={S.label}>Kategorie</label><select value={editData.category} onChange={e=>upEdit("category",e.target.value)} style={{...S.input,background:"#fff"}}><option value="FAHRT">{trip.travelMode==="MIETWAGEN"?"Mietwagen / Tanken / Maut":trip.travelMode==="PRIVAT_PKW"?"PKW-Kosten / Tanken":"Fahrtkosten"}</option><option value="UNTERKUNFT">Unterkunft</option><option value="VERPFLEGUNG">Verpflegung</option><option value="NEBENKOSTEN">{(trip.travelMode==="PRIVAT_PKW"||trip.travelMode==="MIETWAGEN")?"Parkgebühren / Sonstiges":"Nebenkosten"}</option></select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={S.label}>Betrag (€)</label><input type="number" step="0.01" value={editData.amount} onChange={e=>upEdit("amount",e.target.value)} style={{...S.input,borderColor:editData.amount==0?"#f59e0b":"#d4d0c8"}} autoFocus/></div>
                <div><label style={S.label}>Datum</label><input type="date" value={editData.date} onChange={e=>upEdit("date",e.target.value)} style={S.input}/></div>
              </div>
              {editData.category==="FAHRT"&&trip.travelMode==="BAHN"&&<>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><label style={S.label}>Von</label><input value={editData.fromStation} onChange={e=>upEdit("fromStation",e.target.value)} style={S.input}/></div>
                  <div><label style={S.label}>Nach</label><input value={editData.toStation} onChange={e=>upEdit("toStation",e.target.value)} style={S.input}/></div>
                </div>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#5c5850",cursor:"pointer"}}>
                  <input type="checkbox" checked={editData.isHandyticket} onChange={e=>upEdit("isHandyticket",e.target.checked)} style={{width:18,height:18,accentColor:"#003056"}}/>📱 Handyticket
                </label>
              </>}
            </div>
            <div style={{display:"flex",gap:8,marginTop:12,justifyContent:"flex-end"}}>
              <button onClick={()=>setEditing(null)} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #d4d0c8",background:"#fff",color:"#5c5850",fontSize:13,cursor:"pointer"}}>Abbrechen</button>
              <button onClick={()=>saveEdit(rc.id)} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#003056",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Speichern</button>
            </div>
          </div>
        ) : moving===rc.id ? (
          <div key={rc.id} style={{background:"#dbeafe",borderRadius:10,padding:"14px 18px",marginBottom:8}}>
            <div style={{fontSize:13,fontWeight:600,color:"#1e40af",marginBottom:8}}>Beleg verschieben nach:</div>
            {otherTrips.length===0 ? (
              <div style={{fontSize:13,color:"#7a756c"}}>Keine andere Reise vorhanden. Erstelle zuerst eine neue Reise.</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {otherTrips.map((t:any)=>(
                  <button key={t.id} onClick={()=>moveReceipt(rc.id,t.id)} style={{padding:"10px 14px",borderRadius:8,border:"1px solid #bfdbfe",background:"#fff",color:"#1a1815",fontSize:13,cursor:"pointer",textAlign:"left"}}>
                    <strong>{t.purpose}</strong> <span style={{color:"#7a756c"}}>· {new Date(t.startDate).toLocaleDateString("de-DE")}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={async()=>{const purpose=prompt("Reisezweck für neue Reise:");if(!purpose)return;const res=await fetch("/api/trips",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({purpose,startDate:new Date().toISOString(),travelMode:"BAHN"})});if(res.ok){const trip=await res.json();await moveReceipt(rc.id,trip.id)}}} style={{padding:"10px 14px",borderRadius:8,border:"2px dashed #003056",background:"#f5f3ef",color:"#003056",fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left",width:"100%"}}>+ Neue Reise mit diesem Beleg erstellen</button>
            <button onClick={()=>setMoving(null)} style={{marginTop:8,padding:"6px 14px",borderRadius:6,border:"1px solid #bfdbfe",background:"transparent",color:"#1e40af",fontSize:12,cursor:"pointer"}}>Abbrechen</button>
          </div>
        ) : (
          <div key={rc.id} style={{display:"flex",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f5f3ef",gap:10}}>
            <span style={{fontSize:18,width:28,textAlign:"center"}}>{rc.category==="FAHRT"?"🎫":rc.category==="UNTERKUNFT"?"🏨":rc.category==="VERPFLEGUNG"?"🍽":"📎"}</span>
            <div style={{flex:1,cursor:"pointer"}} onClick={()=>startEdit(rc)}>
              <div style={{fontSize:14,fontWeight:600,color:"#1a1815",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                {rc.description||rc.category}
                {rc.description?.startsWith("Per E-Mail:")&&<Badge color="blue">📩 E-Mail</Badge>}
                {rc.description?.startsWith("DB #")&&<Badge color="blue">🚂 DB</Badge>}
                {rc.amount===0&&<Badge color="amber">⚠️ Betrag fehlt</Badge>}
              </div>
              <div style={{fontSize:12,color:"#9e9a92"}}>{new Date(rc.date).toLocaleDateString("de-DE")}{rc.fromStation?` · ${rc.fromStation} → ${rc.toStation}`:""}{rc.isHandyticket?" · 📱 HT":""}{rc.fileName?` · `:""}{rc.fileName&&rc.filePath?<span onClick={(e:any)=>{e.stopPropagation();showPreview(rc.filePath)}} style={{color:"#003056",cursor:"pointer",textDecoration:"underline"}}>📎 {rc.fileName}</span>:null}</div>
            </div>
            <div style={{fontWeight:700,fontSize:15,color:rc.amount===0?"#f59e0b":"#003056"}}>{rc.amount===0?"—":fmt(rc.amount)}</div>
            <button onClick={()=>{setMoving(rc.id);setEditing(null)}} title="Verschieben" style={{border:"none",background:"none",color:"#9e9a92",cursor:"pointer",fontSize:18,padding:"8px"}}>↗️</button>
            <button onClick={(e)=>{e.stopPropagation();delReceipt(rc.id)}} style={{border:"none",background:"none",color:"#9e9a92",cursor:"pointer",fontSize:20,padding:"8px"}}>✕</button>
          </div>
        ))}

        {adding ? (
          <div style={{background:"#f5f3ef",borderRadius:10,padding:"18px 20px",marginTop:12}}>
            <div style={{display:"grid",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
                <div><label style={S.label}>Beschreibung</label><input value={r.description} onChange={e=>up("description",e.target.value)} placeholder="z.B. DB Sparpreis" style={S.input}/></div>
                <div><label style={S.label}>Kategorie</label><select value={r.category} onChange={e=>up("category",e.target.value)} style={{...S.input,background:"#fff"}}><option value="FAHRT">{trip.travelMode==="MIETWAGEN"?"Mietwagen / Tanken / Maut":trip.travelMode==="PRIVAT_PKW"?"PKW-Kosten / Tanken":"Fahrtkosten"}</option><option value="UNTERKUNFT">Unterkunft</option><option value="VERPFLEGUNG">Verpflegung</option><option value="NEBENKOSTEN">{(trip.travelMode==="PRIVAT_PKW"||trip.travelMode==="MIETWAGEN")?"Parkgebühren / Sonstiges":"Nebenkosten"}</option></select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={S.label}>Betrag (€)</label><input type="number" step="0.01" value={r.amount} onChange={e=>up("amount",e.target.value)} placeholder="44.80" style={S.input}/></div>
                <div><label style={S.label}>Datum</label><input type="date" value={r.date} onChange={e=>up("date",e.target.value)} style={S.input}/></div>
              </div>
              {r.category==="FAHRT"&&trip.travelMode==="BAHN"&&<>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><label style={S.label}>Von</label><input value={r.fromStation} onChange={e=>up("fromStation",e.target.value)} placeholder="München Hbf" style={S.input}/></div>
                  <div><label style={S.label}>Nach</label><input value={r.toStation} onChange={e=>up("toStation",e.target.value)} placeholder="Montabaur" style={S.input}/></div>
                </div>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#5c5850",cursor:"pointer"}}>
                  <input type="checkbox" checked={r.isHandyticket} onChange={e=>up("isHandyticket",e.target.checked)} style={{width:18,height:18,accentColor:"#003056"}}/>📱 Handyticket
                </label>
              </>}
            </div>
            <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
            <label style={{display:"inline-flex",padding:"8px 16px",borderRadius:8,border:"1px solid #d4d0c8",background:uploadFile?"#d1fae5":"#fff",color:"#003056",fontSize:13,fontWeight:600,cursor:"pointer",gap:6,alignItems:"center"}}>{uploadFile?`📎 ${uploadFile.name}`:"📤 Beleg hochladen"}<input type="file" accept=".pdf,.jpg,.png" hidden onChange={e=>setUploadFile(e.target.files?.[0]||null)}/></label>
              <button onClick={()=>setAdding(false)} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #d4d0c8",background:"#fff",color:"#5c5850",fontSize:13,cursor:"pointer"}}>Abbrechen</button>
              <button onClick={addReceipt} disabled={!r.date} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#003056",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:(!r.date)?0.5:1}}>Speichern</button>
            </div>
          </div>
        ) : (
          <button onClick={()=>setAdding(true)} disabled={isSubmitted} style={{marginTop:12,padding:"8px 18px",borderRadius:8,border:"1px solid #00305640",background:"transparent",color:"#003056",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Beleg hinzufügen</button>
        )}
      </div>
    </div>
  );
}
