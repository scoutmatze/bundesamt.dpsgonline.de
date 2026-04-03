import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Source Sans 3', system-ui, sans-serif",
      background: "#FAF9F6",
      color: "#2A2826",
    }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏕️</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Source Serif 4', Georgia, serif", color: "#8B1A2B", margin: "0 0 8px" }}>
          DPSG Reisekosten
        </h1>
        <p style={{ fontSize: 16, color: "#6B6862", margin: "0 0 32px" }}>
          Digitale Reise- und Sachkostenabrechnung für Gremienmitglieder
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/login" style={{
            padding: "12px 28px", borderRadius: 8, background: "#8B1A2B",
            color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 15,
          }}>
            Anmelden
          </Link>
          <Link href="/impressum" style={{
            padding: "12px 28px", borderRadius: 8, border: "1px solid #D8D6D2",
            color: "#6B6862", textDecoration: "none", fontWeight: 500, fontSize: 15,
          }}>
            Impressum
          </Link>
        </div>
      </div>
    </main>
  );
}
