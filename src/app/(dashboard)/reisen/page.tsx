"use client";
import HelpBox from "@/components/HelpBox";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ReisenPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/trips").then(r=>r.json()).then(d => { setTrips(d); setLoading(false); }); }, []);
  const fmt = (n: number) => n.toFixed(2).replace(".",",") + " €";
  if (loading) return <div style={{ padding:40, textAlign:"center", color:"#9e9a92" }}>Lade...</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:700, color:"#003056", margin:0 }}>Meine Reisen</h1>
        </div>
        <Link href="/reisen/neu" style={{ padding:"10px 20px", borderRadius:8, background:"#8b0a1e", color:"#fff", textDecoration:"none", fontWeight:700, fontSize:14 }}>
          + Neue Reise
        </Link>
      </div>
      <HelpBox title="So funktioniert es">
        <p><strong>Reise anlegen:</strong> Klicke „+ Neue Reise", gib Reisezweck, Datum und Reisemittel ein.</p>
        <p><strong>Belege:</strong> DB-Tickets per E-Mail an <strong>belege_reisekosten@bundesamt.dpsgonline.de</strong> weiterleiten. Oder manuell hochladen.</p>
        <p><strong>PDF erstellen:</strong> In der Reise „PDF-Paket erstellen" → per Mail an <strong>reisekosten@dpsg.de</strong> senden.</p>
      </HelpBox>
      {trips.length === 0 ? (
        <div style={{ background:"#fff", borderRadius:12, padding:"48px 24px", border:"1px solid #d4d0c8", textAlign:"center" }}>
          <div style={{ fontWeight:700, fontSize:16, color:"#003056" }}>Noch keine Reisen</div>
          <div style={{ fontSize:14, color:"#9e9a92", marginTop:6, marginBottom:16 }}>Erstelle deine erste Reise oder leite ein DB-Ticket weiter!</div>
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/reisen/neu" style={{ padding:"10px 20px", borderRadius:8, background:"#8b0a1e", color:"#fff", textDecoration:"none", fontWeight:700 }}>+ Neue Reise</Link>
            <div style={{ padding:"10px 20px", borderRadius:8, background:"#f5f3ef", color:"#5c5850", fontSize:14 }}>
              📩 Belege an <strong>belege_reisekosten@bundesamt.dpsgonline.de</strong> weiterleiten
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {trips.map((t: any) => {
            const total = (t.receipts||[]).reduce((s:number,r:any) => s + r.amount, 0);
            const pending = (t.receipts||[]).filter((r:any)=>r.amount===0).length;
            const isEmailTrip = t.purpose?.startsWith("Beleg:");
            return (
              <Link key={t.id} href={`/reisen/${t.id}`} style={{ background:"#fff", borderRadius:12, padding:"16px 20px", border:`1px solid ${pending?"#fde68a":"#d4d0c8"}`, display:"flex", alignItems:"center", gap:16, textDecoration:"none", color:"inherit" }}>
                <div style={{ width:40, height:40, borderRadius:8, background: isEmailTrip?"#dbeafe":"#00305610", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                  {isEmailTrip ? "📩" : t.travelMode==="PRIVAT_PKW"?"🚗":"🚂"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:"#1a1815", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}>
                    {t.purpose}
                    {pending > 0 && <span style={{ background:"#fef3c7", color:"#92400e", border:"1px solid #fde68a", fontSize:11, fontWeight:700, padding:"1px 6px", borderRadius:10 }}>⚠️ {pending}</span>}
                  </div>
                  <div style={{ fontSize:12, color:"#9e9a92", marginTop:3 }}>{new Date(t.startDate).toLocaleDateString("de-DE")} · {t.route||"Kein Reiseweg"}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontWeight:700, fontSize:16, color:"#003056" }}>{fmt(total)}</div>
                  <div style={{ fontSize:11, color:"#9e9a92" }}>{(t.receipts||[]).length} Belege</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
