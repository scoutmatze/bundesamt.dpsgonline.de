"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

const S = {
  label: { display:"block" as const, fontSize:12, fontWeight:600, color:"#5c5850", marginBottom:5, textTransform:"uppercase" as const, letterSpacing:0.6 },
  input: { width:"100%", padding:"9px 12px", border:"1.5px solid #d4d0c8", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" as const },
};

export default function TripDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [r, setR] = useState({ description:"", amount:"", date:"", category:"FAHRT", fromStation:"", toStation:"", isHandyticket:false });
  const [loading, setLoading] = useState(true);

  const load = async () => { const res = await fetch("/api/trips"); const trips = await res.json(); setTrip(trips.find((t:any)=>t.id===id)||null); setLoading(false); };
  useEffect(() => { load(); }, [id]);

  const addReceipt = async () => { await fetch("/api/receipts", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...r, tripId:id, amount:parseFloat(r.amount)}) }); setR({ description:"", amount:"", date:"", category:"FAHRT", fromStation:"", toStation:"", isHandyticket:false }); setAdding(false); load(); };
  const delReceipt = async (rid:string) => { await fetch("/api/receipts", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id:rid, tripId:id }) }); load(); };
  const delTrip = async () => { if(!confirm("Reise wirklich löschen?"))return; await fetch("/api/trips", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id }) }); router.push("/reisen"); };
  const downloadPdf = async () => { const res = await fetch(`/api/pdf?tripId=${id}`); if(!res.ok){alert("Fehler: "+(await res.json()).error);return;} const blob=await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`Reisekostenabrechnung.pdf`; a.click(); URL.revokeObjectURL(url); };

  const fmt = (n:number) => n.toFixed(2).replace(".",",") + " €";
  const up = (k:string,v:any) => setR(p=>({...p,[k]:v}));

  if (loading) return <div style={{ padding:40, textAlign:"center", color:"#9e9a92" }}>Lade...</div>;
  if (!trip) return <div style={{ padding:40, textAlign:"center" }}>Reise nicht gefunden</div>;

  const receipts = trip.receipts || [];
  const byC = (c:string) => receipts.filter((r:any)=>r.category===c).reduce((s:number,r:any)=>s+r.amount,0);
  const total = receipts.reduce((s:number,r:any)=>s+r.amount,0);

  return (
    <div>
      <button onClick={()=>router.push("/reisen")} style={{ border:"none", background:"none", color:"#003056", fontSize:13, fontWeight:700, cursor:"pointer", padding:0 }}>← Zurück</button>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginTop:8, marginBottom:20, gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, color:"#003056", margin:0 }}>{trip.purpose}</h1>
          <p style={{ fontSize:14, color:"#7a756c", margin:"4px 0 0" }}>{trip.travelMode==="PRIVAT_PKW"?"🚗":"🚂"} {trip.route||"—"} · {new Date(trip.startDate).toLocaleDateString("de-DE")}</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={delTrip} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d4d0c8", background:"#fff", color:"#5c5850", fontSize:13, cursor:"pointer" }}>Löschen</button>
          <button onClick={downloadPdf} disabled={!receipts.length} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#003056", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:receipts.length?1:0.5 }}>📄 PDF erstellen</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
        {[{l:"Fahrt",v:byC("FAHRT")},{l:"Unterkunft",v:byC("UNTERKUNFT")},{l:"Verpflegung",v:byC("VERPFLEGUNG")},{l:"Nebenkosten",v:byC("NEBENKOSTEN")},{l:"Gesamt",v:total,a:true}].map((c,i)=>(
          <div key={i} style={{ background:c.a?"#003056":"#fff", borderRadius:10, padding:"12px 14px", border:c.a?"none":"1px solid #d4d0c8", color:c.a?"#fff":"#1a1815" }}>
            <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:0.6, fontWeight:600, opacity:0.6, marginBottom:4 }}>{c.l}</div>
            <div style={{ fontSize:18, fontWeight:700 }}>{fmt(c.v)}</div>
          </div>
        ))}
      </div>

      <div style={{ background:"#fff", borderRadius:12, padding:24, border:"1px solid #d4d0c8" }}>
        <h3 style={{ fontSize:12, fontWeight:600, color:"#7a756c", textTransform:"uppercase", letterSpacing:1, marginTop:0, marginBottom:16 }}>Belege ({receipts.length})</h3>
        {receipts.map((rc:any) => (
          <div key={rc.id} style={{ display:"flex", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #f5f3ef", gap:10 }}>
            <span style={{ fontSize:18, width:28, textAlign:"center" }}>{rc.category==="FAHRT"?"🎫":rc.category==="UNTERKUNFT"?"🏨":rc.category==="VERPFLEGUNG"?"🍽":"📎"}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#1a1815" }}>{rc.description||rc.category}</div>
              <div style={{ fontSize:12, color:"#9e9a92" }}>{new Date(rc.date).toLocaleDateString("de-DE")}{rc.fromStation?` · ${rc.fromStation} → ${rc.toStation}`:""}{rc.isHandyticket?" · 📱 HT":""}</div>
            </div>
            <div style={{ fontWeight:700, fontSize:15, color:"#003056" }}>{fmt(rc.amount)}</div>
            <button onClick={()=>delReceipt(rc.id)} style={{ border:"none", background:"none", color:"#9e9a92", cursor:"pointer", fontSize:16 }}>✕</button>
          </div>
        ))}

        {adding ? (
          <div style={{ background:"#f5f3ef", borderRadius:10, padding:"18px 20px", marginTop:12 }}>
            <div style={{ display:"grid", gap:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10 }}>
                <div><label style={S.label}>Beschreibung</label><input value={r.description} onChange={e=>up("description",e.target.value)} placeholder="z.B. DB Sparpreis" style={S.input}/></div>
                <div><label style={S.label}>Kategorie</label><select value={r.category} onChange={e=>up("category",e.target.value)} style={{...S.input, background:"#fff"}}><option value="FAHRT">Fahrtkosten</option><option value="UNTERKUNFT">Unterkunft</option><option value="VERPFLEGUNG">Verpflegung</option><option value="NEBENKOSTEN">Nebenkosten</option></select></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={S.label}>Betrag (€)</label><input type="number" step="0.01" value={r.amount} onChange={e=>up("amount",e.target.value)} placeholder="44.80" style={S.input}/></div>
                <div><label style={S.label}>Datum</label><input type="date" value={r.date} onChange={e=>up("date",e.target.value)} style={S.input}/></div>
              </div>
              {r.category==="FAHRT" && <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><label style={S.label}>Von</label><input value={r.fromStation} onChange={e=>up("fromStation",e.target.value)} placeholder="München Hbf" style={S.input}/></div>
                  <div><label style={S.label}>Nach</label><input value={r.toStation} onChange={e=>up("toStation",e.target.value)} placeholder="Montabaur" style={S.input}/></div>
                </div>
                <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#5c5850", cursor:"pointer" }}>
                  <input type="checkbox" checked={r.isHandyticket} onChange={e=>up("isHandyticket",e.target.checked)} style={{ width:18, height:18, accentColor:"#003056" }}/>📱 Handyticket
                </label>
              </>}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:14, justifyContent:"flex-end" }}>
              <button onClick={()=>setAdding(false)} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #d4d0c8", background:"#fff", color:"#5c5850", fontSize:13, cursor:"pointer" }}>Abbrechen</button>
              <button onClick={addReceipt} disabled={!r.amount||!r.date} style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"#003056", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:(!r.amount||!r.date)?0.5:1 }}>Speichern</button>
            </div>
          </div>
        ) : (
          <button onClick={()=>setAdding(true)} style={{ marginTop:12, padding:"8px 18px", borderRadius:8, border:"1px solid #00305640", background:"transparent", color:"#003056", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Beleg hinzufügen</button>
        )}
      </div>
    </div>
  );
}
