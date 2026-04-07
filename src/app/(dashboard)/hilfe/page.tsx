"use client";

const S = {
  h2: { fontSize: 20, fontWeight: 700, color: "#003056", margin: "32px 0 12px" } as const,
  h3: { fontSize: 16, fontWeight: 700, color: "#5c5850", margin: "20px 0 8px" } as const,
  p: { fontSize: 14, color: "#1a1815", lineHeight: 1.7, margin: "0 0 12px" } as const,
  step: { fontSize: 14, color: "#1a1815", lineHeight: 1.7, margin: "0 0 8px", paddingLeft: 8 } as const,
  tip: { padding: "12px 16px", borderRadius: 8, background: "#d1fae5", color: "#065f46", fontSize: 13, margin: "12px 0" } as const,
  warn: { padding: "12px 16px", borderRadius: 8, background: "#fef3c7", color: "#92400e", fontSize: 13, margin: "12px 0" } as const,
  code: { fontWeight: 700, color: "#003056" } as const,
};

export default function HilfePage() {
  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#003056", margin: "0 0 4px" }}>Anleitung</h1>
      <p style={{ fontSize: 14, color: "#7a756c", margin: "0 0 24px" }}>So nutzt du das DPSG Reisekosten-Tool.</p>

      {/* ── Profil ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #d4d0c8", marginBottom: 16 }}>
        <h2 style={{ ...S.h2, marginTop: 0 }}>📋 Profil einrichten</h2>
        <p style={S.p}>Unter <strong>Profil</strong> hinterlegst du einmalig deine Stammdaten. Diese werden automatisch in alle Abrechnungsformulare eingesetzt:</p>
        <ul style={{ fontSize: 14, lineHeight: 1.8, color: "#1a1815", paddingLeft: 20 }}>
          <li><strong>Name, Adresse</strong> — für alle Formulare</li>
          <li><strong>Bankverbindung</strong> (IBAN, BIC, Bank) — für die Erstattung</li>
          <li><strong>Gremium</strong> — z.B. Bundesleitung, AG Finanzen</li>
          <li><strong>Unterschrift</strong> — im Browser zeichnen oder als Bild hochladen</li>
          <li><strong>Passwort</strong> — für den Login ohne E-Mail-Code</li>
        </ul>
        <div style={S.tip}>✓ <strong>Tipp:</strong> Setze sofort ein persönliches Passwort, damit du dich ohne Code anmelden kannst.</div>
      </div>

      {/* ── Reisekostenabrechnung ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #d4d0c8", marginBottom: 16 }}>
        <h2 style={{ ...S.h2, marginTop: 0 }}>🚂 Reisekostenabrechnung</h2>

        <h3 style={S.h3}>Reise anlegen</h3>
        <p style={S.step}>1. Dashboard → <strong>„+ Neue Reise"</strong></p>
        <p style={S.step}>2. Reisezweck eingeben (z.B. „BL-Sitzung März 2026")</p>
        <p style={S.step}>3. Datum und Uhrzeiten eintragen (wichtig für Verpflegungspauschale)</p>
        <p style={S.step}>4. Reisemittel wählen: Bahn, Privat-PKW oder Mietwagen</p>

        <h3 style={S.h3}>Belege hinzufügen — 3 Wege</h3>

        <p style={{ ...S.p, fontWeight: 700 }}>📩 Per E-Mail (empfohlen):</p>
        <p style={S.p}>Leite deine DB-Tickets, Rechnungen oder Quittungen weiter an:</p>
        <p style={{ textAlign: "center", margin: "12px 0", fontSize: 15 }}>
          <strong style={{ color: "#003056" }}>belege_reisekosten@bundesamt.dpsgonline.de</strong>
        </p>
        <p style={S.p}>DB-Tickets werden automatisch erkannt (Betrag, Strecke, Datum). Andere Belege landen im Posteingang.</p>

        <p style={{ ...S.p, fontWeight: 700 }}>📤 Manuell in der Reise:</p>
        <p style={S.p}>„+ Beleg hinzufügen" → Beschreibung, Betrag, Datum eingeben + Datei hochladen.</p>

        <p style={{ ...S.p, fontWeight: 700 }}>📬 Über den Posteingang:</p>
        <p style={S.p}>Nicht-DB-Belege (Tankquittungen, Hotelrechnungen) erscheinen im Posteingang. Dort „Zuweisen" klicken.</p>

        <h3 style={S.h3}>PDF-Paket erstellen</h3>
        <p style={S.step}>1. Prüfe, dass alle Belege einen Betrag haben</p>
        <p style={S.step}>2. <strong>„PDF-Paket erstellen"</strong> klicken</p>
        <p style={S.step}>3. PDF enthält: Reisekostenabrechnung + Handyticket-Erklärung + alle Belege</p>
        <p style={S.step}>4. <strong>PDF per E-Mail an reisekosten@dpsg.de senden</strong></p>

        <div style={S.warn}>⚠️ <strong>Wichtig:</strong> Jede*r ist selbst verantwortlich für die Richtigkeit der eingereichten Abrechnung.</div>
      </div>

      {/* ── PKW / Mietwagen ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #d4d0c8", marginBottom: 16 }}>
        <h2 style={{ ...S.h2, marginTop: 0 }}>🚗 Privat-PKW und Mietwagen</h2>

        <h3 style={S.h3}>Privat-PKW</h3>
        <ul style={{ fontSize: 14, lineHeight: 1.8, color: "#1a1815", paddingLeft: 20 }}>
          <li>Erstattung: <strong>0,20 €/km</strong></li>
          <li>Begründung für PKW-Nutzung erforderlich</li>
          <li>Strecken eingeben → 📍-Button berechnet Kilometer per OpenStreetMap</li>
        </ul>

        <h3 style={S.h3}>Mietwagen / Dienstfahrzeug</h3>
        <ul style={{ fontSize: 14, lineHeight: 1.8, color: "#1a1815", paddingLeft: 20 }}>
          <li>Keine km-Pauschale — Belege einreichen (Mietwagenrechnung, Tank, Maut, Parken)</li>
          <li><strong>Erlaubnis durch Bundesvorstand erforderlich</strong></li>
        </ul>
      </div>

      {/* ── Sachkosten ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #d4d0c8", marginBottom: 16 }}>
        <h2 style={{ ...S.h2, marginTop: 0 }}>📋 Sachkostenabrechnung</h2>
        <p style={S.p}>Pro Quartal eine Abrechnung für Telefon, Porto, Büromaterial etc.</p>
        <p style={S.step}>1. „Sachkosten" → „+ Neue Abrechnung" → Quartal wählen</p>
        <p style={S.step}>2. Positionen hinzufügen (Datum, Beschreibung, Betrag)</p>
        <p style={S.step}>3. Beleg pro Position hochladen</p>
        <p style={S.step}>4. 📄 PDF erstellen → herunterladen → per Mail senden</p>
      </div>

      {/* ── Bewirtung ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #d4d0c8", marginBottom: 16 }}>
        <h2 style={{ ...S.h2, marginTop: 0 }}>🍽 Bewirtungsaufwendungen</h2>
        <p style={S.step}>1. „Bewirtung" → „+ Neue Bewirtung"</p>
        <p style={S.step}>2. Datum, Ort, Anlass der Bewirtung eingeben</p>
        <p style={S.step}>3. Bewirtete Personen mit Name und Funktion erfassen</p>
        <p style={S.step}>4. Kosten aufschlüsseln: Speisen, Getränke, Trinkgeld</p>
        <p style={S.step}>5. Restaurantrechnung als Beleg hochladen</p>
        <p style={S.step}>6. 📄 PDF erstellen → herunterladen → per Mail senden</p>
      </div>

      {/* ── BahnCard ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #d4d0c8", marginBottom: 16 }}>
        <h2 style={{ ...S.h2, marginTop: 0 }}>🎫 BahnCard-Antrag</h2>
        <p style={S.p}>Einmal jährlich könnt ihr eine BahnCard beantragen.</p>
        <p style={S.step}>1. „BahnCard" → „+ Neuer Antrag"</p>
        <p style={S.step}>2. Typ, Klasse, Kosten und Gültigkeitszeitraum eingeben</p>
        <p style={S.step}>3. Begründung: Warum BahnCard? Erwartete Fahrten, Ersparnis</p>
        <p style={S.step}>4. Ersparnis berechnen auf <a href="https://bcbp.db-app.de/bcbpmain" target="_blank" rel="noopener" style={{ color: "#003056", fontWeight: 700 }}>bcbp.db-app.de</a> → PDF hochladen</p>
        <p style={S.step}>5. 📄 PDF erstellen → herunterladen → per Mail senden</p>
      </div>

      {/* ── Posteingang ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #d4d0c8", marginBottom: 16 }}>
        <h2 style={{ ...S.h2, marginTop: 0 }}>📬 Posteingang</h2>
        <p style={S.p}>Alle E-Mail-Anhänge die keine DB-Tickets sind (Tankquittungen, Hotelrechnungen etc.) landen automatisch im Posteingang. Von dort kannst du sie per Klick der richtigen Reise, Sachkostenabrechnung oder Bewirtung zuweisen.</p>
        <p style={S.p}>Das Tool versucht automatisch den Betrag aus dem Beleg zu erkennen. Du kannst jeden Beleg per 👁-Button in der Vorschau ansehen.</p>
      </div>

      {/* ── CO2 ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #d4d0c8", marginBottom: 16 }}>
        <h2 style={{ ...S.h2, marginTop: 0 }}>🌱 CO₂-Bilanz</h2>
        <p style={S.p}>Jede Reise zeigt automatisch den CO₂-Fußabdruck. Die Berechnung basiert auf Emissionsfaktoren des Umweltbundesamts:</p>
        <ul style={{ fontSize: 14, lineHeight: 1.8, color: "#1a1815", paddingLeft: 20 }}>
          <li>🚂 Bahn: <strong>32 g/km</strong> — umweltfreundlichste Wahl</li>
          <li>🚗 PKW: <strong>154 g/km</strong></li>
          <li>✈️ Flugzeug: <strong>214 g/km</strong></li>
        </ul>
        <p style={S.p}>Die Gesamtbilanz aller Reisen siehst du auf dem Dashboard.</p>
      </div>

      {/* ── Hinweise ── */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #d4d0c8", marginBottom: 16 }}>
        <h2 style={{ ...S.h2, marginTop: 0 }}>⚠️ Wichtige Hinweise</h2>
        <div style={S.warn}>
          <strong>Eigenverantwortung:</strong> Jede*r Nutzer*in ist selbst verantwortlich für die Richtigkeit und Vollständigkeit der eingereichten Abrechnungen. Das Tool unterstützt bei der Erstellung, ersetzt aber nicht die persönliche Prüfung.
        </div>
        <ul style={{ fontSize: 14, lineHeight: 1.8, color: "#1a1815", paddingLeft: 20 }}>
          <li>PDFs müssen von euch selbst per E-Mail an <strong>reisekosten@dpsg.de</strong> gesendet werden</li>
          <li>Prüft vor dem Versand, dass alle Angaben korrekt sind</li>
          <li>Original-Belege mindestens <strong>10 Jahre aufbewahren</strong></li>
          <li>Eure Daten sind verschlüsselt auf einem Server in Deutschland gespeichert</li>
        </ul>
      </div>
    </div>
  );
}
