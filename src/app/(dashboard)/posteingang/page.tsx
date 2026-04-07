"use client";
import HelpBox from "@/components/HelpBox";
import { useState, useEffect } from "react";

const S = {
  label: { display:"block", fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:5, textTransform:"uppercase" as const, letterSpacing:0.6 },
};

interface InboxItem { id:string; fileName:string; filePath:string; subject?:string; preview?:string; status:string; assignedType?:string; createdAt:string; amount?:number; }

export default function PosteingangPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [sachkosten, setSachkosten] = useState<any[]>([]);
  const [bewirtung, setBewirtung] = useState<any[]>([]);
  const [bahncard, setBahncard] = useState<any[]>([]);
  const [assigning, setAssigning] = useState<string|null>(null);
  const [preview, setPreview] = useState<{text?:string;url?:string;fileName?:string}|null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [inbox, t, sk, bw, bc] = await Promise.all([
      fetch("/api/inbox").then(r=>r.json()).catch(()=>[]),
      fetch("/api/trips").then(r=>r.json()).catch(()=>[]),
      fetch("/api/sachkosten").then(r=>r.json()).catch(()=>[]),
      fetch("/api/bewirtung").then(r=>r.json()).catch(()=>[]),
      fetch("/api/bahncard").then(r=>r.json()).catch(()=>[]),
    ]);
    setItems(Array.isArray(inbox)?inbox.filter((i:any)=>i.status==="NEW"):[]);
    setTrips(Array.isArray(t)?t:[]);
    setSachkosten(Array.isArray(sk)?sk:[]);
    setBewirtung(Array.isArray(bw)?bw:[]);
    setBahncard(Array.isArray(bc)?bc:[]);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const assign = async (itemId:string, targetType:string, targetId:string) => {
    await fetch("/api/inbox",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({itemId,targetType,targetId})});
    setAssigning(null); load();
  };

  const del = async (id:string) => {
    if(!confirm("Beleg löschen?"))return;
    await fetch("/api/inbox",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    load();
  };

  const showPreview = async (filePath:string) => {
    const res = await fetch(`/api/preview?path=${encodeURIComponent(filePath)}`);
    if(res.ok) { const data = await res.json(); setPreview(data); }
  };

  if(loading) return <div style={{padding:40,textAlign:"center",color:"#9e9a92"}}>Lade...</div>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:"#003056",margin:0}}>Posteingang</h1>
          <p style={{fontSize:13,color:"#7a756c",margin:"4px 0 0"}}>Belege per E-Mail an die App senden und hier zuweisen</p>
        </div>
      </div>
      <HelpBox title="So funktioniert es">
        <p>Leite Rechnungen, Quittungen oder Belege per E-Mail an <strong>belege_reisekosten@bundesamt.dpsgonline.de</strong> weiter. Nicht-DB-Belege landen hier. Klicke <strong>„Zuweisen"</strong> um sie einer Reise, Sachkostenabrechnung oder Bewirtung zuzuordnen. Mit 👁 kannst du eine Vorschau ansehen.</p>
      </HelpBox>

      {/* Preview Modal */}
      {preview && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setPreview(null)}>
          <div style={{background:"#fff",borderRadius:12,padding:24,maxWidth:600,maxHeight:"80vh",overflow:"auto",width:"100%"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{fontSize:16,fontWeight:700,color:"#003056",margin:0}}>📄 {preview.fileName}</h3>
              <button onClick={()=>setPreview(null)} style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:"#9e9a92"}}>✕</button>
            </div>
            {preview.text && <pre style={{fontSize:12,color:"#1a1815",background:"#f5f3ef",padding:16,borderRadius:8,whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:400,overflow:"auto"}}>{preview.text}</pre>}
            {preview.url && <img src={preview.url} style={{maxWidth:"100%",borderRadius:8}} alt="Beleg"/>}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div style={{textAlign:"center",padding:60,color:"#9e9a92"}}>
          <div style={{fontSize:40,marginBottom:12}}>📬</div>
          <p>Keine neuen Belege im Posteingang.</p>
          <p style={{fontSize:12}}>Leite Rechnungen, Quittungen oder Belege per E-Mail weiter — sie landen automatisch hier.</p>
        </div>
      )}

      {items.map(item => (
        <div key={item.id} style={{background:"#fff",borderRadius:12,padding:"16px 20px",border:"1px solid #d4d0c8",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{flex:1,cursor:"pointer"}} onClick={()=>showPreview(item.filePath)}>
              <div style={{fontSize:15,fontWeight:600,color:"#1a1815",display:"flex",alignItems:"center",gap:8}}>
                📎 {item.fileName}
                {item.amount?<span style={{padding:"2px 8px",borderRadius:12,background:"#d1fae5",color:"#065f46",fontSize:11,fontWeight:700}}>{item.amount.toFixed(2).replace(".",",")} €</span>:null}
                <span style={{padding:"2px 8px",borderRadius:12,background:"#dbeafe",color:"#1e40af",fontSize:11,fontWeight:700}}>Neu</span>
              </div>
              <div style={{fontSize:12,color:"#9e9a92",marginTop:2}}>
                {item.subject && `${item.subject} · `}{new Date(item.createdAt).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
              </div>
              {item.preview && <div style={{fontSize:11,color:"#7a756c",marginTop:4,maxHeight:40,overflow:"hidden"}}>{item.preview.substring(0,150)}...</div>}
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>showPreview(item.filePath)} title="Vorschau" style={{padding:"6px 10px",borderRadius:6,border:"1px solid #d4d0c8",background:"#fff",color:"#003056",fontSize:13,cursor:"pointer"}}>👁</button>
              <button onClick={()=>setAssigning(assigning===item.id?null:item.id)} style={{padding:"6px 12px",borderRadius:6,border:"none",background:assigning===item.id?"#003056":"#dbeafe",color:assigning===item.id?"#fff":"#1e40af",fontSize:12,fontWeight:700,cursor:"pointer"}}>Zuweisen</button>
              <button onClick={()=>del(item.id)} style={{border:"none",background:"none",color:"#9e9a92",fontSize:16,cursor:"pointer"}}>✕</button>
            </div>
          </div>

          {assigning===item.id && (
            <div style={{marginTop:12,background:"#f5f3ef",borderRadius:8,padding:16}}>
              <div style={{fontSize:12,fontWeight:600,color:"#5c5850",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Zuweisen an:</div>

              {trips.length>0 && <>
                <div style={{fontSize:11,fontWeight:700,color:"#7a756c",marginBottom:4,marginTop:8}}>REISEN</div>
                {trips.map(t=>(
                  <button key={t.id} onClick={()=>assign(item.id,"trip",t.id)} style={{display:"block",width:"100%",padding:"8px 12px",borderRadius:6,border:"1px solid #d4d0c8",background:"#fff",color:"#1a1815",fontSize:13,cursor:"pointer",textAlign:"left",marginBottom:4}}>
                    🚂 {t.purpose} <span style={{color:"#9e9a92"}}>· {new Date(t.startDate).toLocaleDateString("de-DE")}</span>
                  </button>
                ))}
              </>}

              {sachkosten.length>0 && <>
                <div style={{fontSize:11,fontWeight:700,color:"#7a756c",marginBottom:4,marginTop:8}}>SACHKOSTEN</div>
                {sachkosten.map(s=>(
                  <button key={s.id} onClick={()=>assign(item.id,"sachkosten",s.id)} style={{display:"block",width:"100%",padding:"8px 12px",borderRadius:6,border:"1px solid #d4d0c8",background:"#fff",color:"#1a1815",fontSize:13,cursor:"pointer",textAlign:"left",marginBottom:4}}>
                    📋 Q{s.quarter}/{s.year}
                  </button>
                ))}
              </>}

              {bewirtung.length>0 && <>
                <div style={{fontSize:11,fontWeight:700,color:"#7a756c",marginBottom:4,marginTop:8}}>BEWIRTUNG</div>
                {bewirtung.map(b=>(
                  <button key={b.id} onClick={()=>assign(item.id,"bewirtung",b.id)} style={{display:"block",width:"100%",padding:"8px 12px",borderRadius:6,border:"1px solid #d4d0c8",background:"#fff",color:"#1a1815",fontSize:13,cursor:"pointer",textAlign:"left",marginBottom:4}}>
                    🍽 {b.occasion} <span style={{color:"#9e9a92"}}>· {new Date(b.date).toLocaleDateString("de-DE")}</span>
                  </button>
                ))}
              </>}

              {bahncard.length>0 && <>
                <div style={{fontSize:11,fontWeight:700,color:"#7a756c",marginBottom:4,marginTop:8}}>BAHNCARD</div>
                {bahncard.map(b=>(
                  <button key={b.id} onClick={()=>assign(item.id,"bahncard",b.id)} style={{display:"block",width:"100%",padding:"8px 12px",borderRadius:6,border:"1px solid #d4d0c8",background:"#fff",color:"#1a1815",fontSize:13,cursor:"pointer",textAlign:"left",marginBottom:4}}>
                    🎫 {b.cardType} {b.year}
                  </button>
                ))}
              </>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
