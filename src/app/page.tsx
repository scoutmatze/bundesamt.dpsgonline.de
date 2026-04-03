import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"#003056", color:"#fff", padding:"80px 24px 60px", textAlign:"center", position:"relative" }}>
        <h1 style={{ fontSize:32, fontWeight:700, margin:"0 0 8px" }}>DPSG Reisekosten</h1>
        <p style={{ fontSize:16, opacity:0.8, margin:0 }}>Digitale Reise- und Sachkostenabrechnung für Gremienmitglieder</p>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:4, background:"#8b0a1e" }} />
      </div>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 24px" }}>
        <div style={{ textAlign:"center", maxWidth:400 }}>
          <p style={{ fontSize:15, color:"#5c5850", margin:"0 0 28px", lineHeight:1.6 }}>
            Belege hochladen, Reisen anlegen, PDF-Abrechnung automatisch erstellen — alles an einem Ort.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
            <Link href="/login" style={{ padding:"12px 28px", borderRadius:8, background:"#003056", color:"#fff", textDecoration:"none", fontWeight:700, fontSize:15 }}>
              Anmelden
            </Link>
            <Link href="/impressum" style={{ padding:"12px 28px", borderRadius:8, background:"#e8e5df", color:"#3d3a36", textDecoration:"none", fontWeight:700, fontSize:15 }}>
              Impressum
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
