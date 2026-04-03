"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ReisenPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = () => fetch("/api/trips").then(r=>r.json()).then(d => { setTrips(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const fmt = (n: number) => n.toFixed(2).replace(".",",") + " €";

  if (loading) return <div style={{ padding:40, textAlign:"center", color:"#B8B5AF" }}>Lade...</div>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0, fontFamily:"'Source Serif 4',Georgia,serif" }}>Meine Reisen</h1>
          <p style={{ fontSize:14, color:"#6B6862", margin:"4px 0 0" }}>Erstelle und verwalte deine Reisekostenabrechnungen.</p>
        </div>
        <Link href="/reisen/neu" style={{ padding:"10px 20px", borderRadius:8, background:"#8B1A2B", color:"#fff", textDecoration:"none", fontWeight:600, fontSize:14 }}>
          + Neue Reise
        </Link>
      </div>
      {trips.length === 0 ? (
        <div style={{ background:"#fff", borderRadius:12, padding:"48px 24px", border:"1px solid #EDECEA", textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🚂</div>
          <div style={{ fontWeight:600, fontSize:16 }}>Noch keine Reisen</div>
          <div style={{ fontSize:14, color:"#B8B5AF", marginTop:6, marginBottom:16 }}>Erstelle deine erste Reise.</div>
          <Link href="/reisen/neu" style={{ padding:"10px 20px", borderRadius:8, background:"#8B1A2B", color:"#fff", textDecoration:"none", fontWeight:600 }}>
            + Erste Reise anlegen
          </Link>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {trips.map((t: any) => {
            const total = (t.receipts||[]).reduce((s:number,r:any) => s + r.amount, 0);
            return (
              <Link key={t.id} href={`/reisen/${t.id}`} style={{ background:"#fff", borderRadius:12, padding:"18px 22px", border:"1px solid #EDECEA", display:"flex", alignItems:"center", gap:16, textDecoration:"none", color:"inherit" }}>
                <div style={{ width:42, height:42, borderRadius:10, background:"#8B1A2B10", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                  {t.travelMode==="PRIVAT_PKW"?"🚗":"🚂"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.purpose}</div>
                  <div style={{ fontSize:12, color:"#B8B5AF", marginTop:3 }}>
                    {new Date(t.startDate).toLocaleDateString("de-DE")} · {t.route||"Kein Reiseweg"}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontWeight:700, fontSize:16, fontFamily:"'Source Serif 4',serif" }}>{fmt(total)}</div>
                  <div style={{ fontSize:11, color:"#B8B5AF" }}>{(t.receipts||[]).length} Belege</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
