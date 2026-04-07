export default function DatenschutzPage() {
  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"40px 20px", fontFamily:"system-ui", color:"#1a1815" }}>
      <h1 style={{ fontSize:24, fontWeight:700, color:"#003056" }}>Datenschutzerklärung</h1>
      <p style={{ fontSize:13, color:"#7a756c", marginBottom:24 }}>DPSG Reisekosten — internes Tool zur Reisekostenabrechnung</p>

      <h2 style={{ fontSize:16, fontWeight:700, color:"#003056", marginTop:24 }}>1. Verantwortlicher</h2>
      <p style={{ fontSize:14, lineHeight:1.7 }}>Dieses Tool wird ehrenamtlich betrieben von Mathias Meyer als technische Hilfe für Gremienmitglieder des DPSG Bundesverbands. Es handelt sich um ein internes, nicht-öffentliches Werkzeug ohne kommerziellen Zweck.</p>

      <h2 style={{ fontSize:16, fontWeight:700, color:"#003056", marginTop:24 }}>2. Welche Daten werden verarbeitet?</h2>
      <p style={{ fontSize:14, lineHeight:1.7 }}>Zur Erstellung von Reisekostenabrechnungen werden folgende Daten verarbeitet:</p>
      <ul style={{ fontSize:14, lineHeight:1.8 }}>
        <li><strong>Stammdaten:</strong> Name, Adresse, E-Mail-Adresse, Gremium</li>
        <li><strong>Bankverbindung:</strong> IBAN (AES-256 verschlüsselt), BIC, Bank, Kontoinhaber</li>
        <li><strong>Reisedaten:</strong> Reisezweck, Datum, Strecken, Belege, Kosten</li>
        <li><strong>Unterschrift:</strong> Digitale Unterschrift (als Bilddatei)</li>
        <li><strong>Zugangsdaten:</strong> E-Mail, Passwort (bcrypt-gehasht)</li>
      </ul>

      <h2 style={{ fontSize:16, fontWeight:700, color:"#003056", marginTop:24 }}>3. Zweck der Verarbeitung</h2>
      <p style={{ fontSize:14, lineHeight:1.7 }}>Die Daten dienen ausschließlich der Erstellung von Reisekosten-, Sachkosten- und Bewirtungsabrechnungen auf den offiziellen DPSG-Formularen. Es erfolgt keine Weitergabe an Dritte, keine Analyse, kein Tracking und keine Werbung.</p>

      <h2 style={{ fontSize:16, fontWeight:700, color:"#003056", marginTop:24 }}>4. Speicherung und Sicherheit</h2>
      <ul style={{ fontSize:14, lineHeight:1.8 }}>
        <li>Hosting: <strong>Hetzner Cloud, Deutschland</strong> (kein Transfer in Drittländer)</li>
        <li>Verschlüsselung: HTTPS/TLS, IBAN mit AES-256, Passwörter mit bcrypt</li>
        <li>Routenberechnung: <strong>OpenStreetMap/OSRM</strong> (kein Google, DSGVO-konform)</li>
        <li>Schriftarten: <strong>Lokal eingebunden</strong> (kein Google Fonts, keine externe Verbindung)</li>
        <li>E-Mail: Microsoft Graph API über den DPSG-M365-Tenant</li>
      </ul>

      <h2 style={{ fontSize:16, fontWeight:700, color:"#003056", marginTop:24 }}>5. Deine Rechte (Art. 15–21 DSGVO)</h2>
      <p style={{ fontSize:14, lineHeight:1.7 }}>Du hast das Recht auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit. Du kannst deinen Account jederzeit selbst löschen unter <strong>Profil → Account löschen</strong>. Dabei werden alle deine Daten unwiderruflich entfernt.</p>

      <h2 style={{ fontSize:16, fontWeight:700, color:"#003056", marginTop:24 }}>6. Cookies</h2>
      <p style={{ fontSize:14, lineHeight:1.7 }}>Es wird ausschließlich ein technisch notwendiger Session-Cookie gesetzt (<code>dpsg-session</code>), um den Login aufrechtzuerhalten. Es gibt keine Tracking- oder Analyse-Cookies.</p>

      <h2 style={{ fontSize:16, fontWeight:700, color:"#003056", marginTop:24 }}>7. Kontakt</h2>
      <p style={{ fontSize:14, lineHeight:1.7 }}>Bei Fragen zum Datenschutz wende dich an Mathias Meyer.</p>

      <div style={{ marginTop:40, borderTop:"1px solid #d4d0c8", paddingTop:20 }}>
        <a href="/login" style={{ color:"#003056", fontSize:13, fontWeight:700 }}>← Zurück zum Login</a>
      </div>
    </div>
  );
}
