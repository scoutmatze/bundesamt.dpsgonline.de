# DPSG Reisekosten-Tool — Konzept & Architektur

**Projektname:** `dpsg-reisekosten`
**Version:** 0.2.0 (Prototyp validiert)
**Stand:** 02. April 2026
**Domain:** `bundesamt.dpsgonline.de`
**Repository:** GitHub (privat, Übergabe an Bundesverband geplant)
**Hosting:** Hetzner Cloud (eigener Server)
**Zielgruppe:** Ehrenamtliche Gremienmitglieder auf DPSG-Bundesebene
**Auftraggeber-Vision:** Bundesverband-fähiges, DSGVO-konformes Self-Service-Tool zur digitalen Reise- und Sachkostenabrechnung

---

## 1. Problemstellung

Ehrenamtliche der DPSG auf Bundesebene müssen regelmäßig Reisekosten, Sachkosten und Bewirtungsaufwendungen abrechnen. Der aktuelle Prozess ist:

- **Manuell:** PDF-Formulare müssen händisch oder mit PDF-Editor ausgefüllt werden
- **Fehleranfällig:** Beträge müssen manuell summiert, Belege zugeordnet werden
- **Zeitaufwändig:** Belege zusammensuchen, scannen, in eine E-Mail packen
- **Unstrukturiert:** Keine zentrale Übersicht über offene/eingereichte Abrechnungen
- **Nicht überprüfbar:** Keine automatische Validierung gegen die Abrechnungsregeln

**Resultat:** Viele Ehrenamtliche rechnen verspätet oder gar nicht ab, die Buchhaltung erhält unvollständige Unterlagen.

---

## 2. Lösung: dpsg-reisekosten

Eine Web-Applikation, die den gesamten Abrechnungsprozess digitalisiert.

### 2.1 Kernfunktionen

| # | Feature | Beschreibung | Status |
|---|---------|-------------|--------|
| F1 | **Benutzerverwaltung** | Registrierung/Login per E-Mail + Magic Link. Profildaten hinterlegen | Prototyp ✓ |
| F2 | **Reisen erstellen** | Reise anlegen mit Datum, Zweck, Reiseweg. Auch für die Zukunft planbar | Prototyp ✓ |
| F3 | **Belege zuordnen** | Upload per Drag & Drop, Belege einer Reise zuordnen | Prototyp ✓ |
| F4 | **Beleg-OCR** | Automatisches Auslesen von Betrag, Datum, Strecke aus DB-Tickets | Konzept |
| F5 | **Auto-Reise aus Beleg** | Bei DB-Ticket-Upload: automatisch Reise erstellen | Konzept |
| F6 | **Reisen zusammenführen** | Hin- und Rückfahrt zu einer Reise zusammenführen | Konzept |
| F7 | **Auto-Reiseweg** | Reiseweg wird automatisch aus Fahrtkosten-Belegen (Von/Nach) gebaut | Prototyp ✓ |
| F8 | **Datum-Warnung** | Warnung wenn Belegdatum außerhalb des Reisezeitraums liegt (dismiss-bar) | Prototyp ✓ |
| F9 | **Kilometer-Berechnung** | Google Maps API: Adresssuche, Route berechnen, km eintragen | Konzept |
| F10 | **Regelwerk-Validierung** | 0,20 €/km, 130 € PKW-Grenze, keine Alkohol-Kosten, 3-Monats-Frist | Teilweise ✓ |
| F11 | **Sachkosten pro Quartal** | Quartalsweise Sachkostenabrechnung | Konzept |
| F12 | **Bewirtungsbelege** | Spezialformular nach § 4 Abs. 5 Nr. 2 EStG | Konzept |
| F13 | **BahnCard-Antrag** | Amortisationsberechnung mit geplanten Fahrten | Konzept |
| F14 | **Eigenbelege** | Formular für verlorene Quittungen mit Zweit-Unterschrift | Konzept |
| F15 | **Unterschrift** | Canvas-Zeichnung ODER Bild-Upload (PNG). Transparenz-Verarbeitung. | Prototyp ✓ |
| F16 | **PDF: Reisekostenabrechnung** | Original-DPSG-PDF befüllen (Overlay + Flatten) | **Validiert ✓** |
| F17 | **PDF: Handyticket-Erklärung** | Original-DPSG-DOCX befüllen, zu PDF konvertieren | **Validiert ✓** |
| F18 | **Download-Paket** | ZIP mit Formularen + Belegen | Konzept |
| F19 | **Direkt-Versand** | E-Mail an reisekosten@dpsg.de | Konzept |
| F20 | **Beleg-Eingang per E-Mail** | Persönliche Eingangsadresse für Beleg-Weiterleitung | Konzept |

### 2.2 Abgrenzung (explizit NICHT im Scope)

- Keine Buchhaltungsfunktion (kein Diamant-Ersatz)
- Keine Genehmigungsworkflows (nur Erstellung & Einreichung)
- Kein Zahlungsverkehr
- Keine Integration in das KJP-Abrechnungssystem

---

## 3. Architektur

### 3.1 Technologie-Entscheidungen

| Bereich | Technologie | Begründung |
|---------|-------------|------------|
| **Framework** | Next.js 15 (App Router) | SSR, API Routes, Middleware, bewährt im DPSG-Umfeld |
| **Sprache** | TypeScript | Typsicherheit, bessere Wartbarkeit |
| **Datenbank** | PostgreSQL 16 | ACID, bewährt, DSGVO-konforme Datenhaltung |
| **ORM** | Prisma | Typsichere Queries, Migrationen |
| **Auth** | NextAuth.js v5 | Magic Link (E-Mail), optional M365 SSO |
| **PDF-Generierung** | pypdf + reportlab (Python) | Overlay-Ansatz, validiert (siehe Kapitel 7) |
| **DOCX-Befüllung** | python-docx + LibreOffice | Handyticket-Vorlage befüllen und zu PDF konvertieren |
| **Unterschrift** | Canvas API + Bild-Upload | PIL für Transparenz-Verarbeitung |
| **Font** | DejaVu Sans (TTF) | Umlaut-sicher, systemweit verfügbar |
| **Maps** | Google Maps JavaScript API | Kilometerberechnung (Phase 2) |
| **File Storage** | MinIO (S3-kompatibel) | Belege verschlüsselt ablegen |
| **Styling** | Tailwind CSS + shadcn/ui | Konsistentes Design |
| **Deployment** | Docker Compose | Portabel, Hetzner-kompatibel |
| **CI/CD** | GitHub Actions | Automatische Tests, Builds |

### 3.2 System-Architektur

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Dashboard │ │  Reisen  │ │  Belege  │ │   Profil   │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  ┌──────────┐ ┌──────────┐                              │
│  │ Signatur │ │   Maps   │                              │
│  │(Canvas/  │ │(Phase 2) │                              │
│  │ Upload)  │ │          │                              │
│  └──────────┘ └──────────┘                              │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS (TLS 1.3)
┌───────────────────────┴─────────────────────────────────┐
│                 Next.js Server (App Router)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │API Routes│ │Middleware │ │ Server   │ │  PDF-Gen   │ │
│  │(REST)    │ │(Auth,CORS│ │ Actions  │ │ (Python    │ │
│  │          │ │ Rate Lim)│ │          │ │  Subprocess│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
└───────┬──────────────┬──────────────┬───────────────────┘
        │              │              │
   ┌────┴────┐   ┌─────┴─────┐  ┌────┴────┐
   │PostgreSQL│   │   MinIO   │  │ Python  │
   │  (Data)  │   │ (Dateien) │  │ PDF-Gen │
   └──────────┘   └───────────┘  └─────────┘
```

### 3.3 Datenmodell (Prisma Schema — Kernentitäten)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  firstName     String?
  street        String?
  zipCode       String?
  city          String?
  iban          String?   // AES-256 verschlüsselt
  bic           String?
  bank          String?
  accountHolder String?
  signaturePath String?   // Pfad zur PNG-Datei in MinIO
  kmRate        Float     @default(0.20)
  
  trips         Trip[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Trip {
  id            String     @id @default(cuid())
  userId        String
  user          User       @relation(fields: [userId], references: [id])
  purpose       String
  route         String?    // Auto-generiert aus Belegen
  startDate     DateTime
  startTime     String?
  endDate       DateTime?
  endTime       String?
  travelMode    TravelMode @default(BAHN)
  pkwReason     String?
  licensePlate  String?
  status        TripStatus @default(DRAFT)
  submittedAt   DateTime?
  
  receipts      Receipt[]
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
}

model Receipt {
  id            String          @id @default(cuid())
  tripId        String
  trip          Trip            @relation(fields: [tripId], references: [id])
  description   String?
  amount        Float
  date          DateTime
  category      ReceiptCategory
  fromStation   String?         // nur bei FAHRT
  toStation     String?         // nur bei FAHRT
  isHandyticket Boolean         @default(false)
  filePath      String?         // Beleg-Scan in MinIO
  
  createdAt     DateTime        @default(now())
}

enum TravelMode { BAHN, PRIVAT_PKW, DIENSTWAGEN, FLUGZEUG, FAHRRAD, MIETWAGEN }
enum TripStatus { DRAFT, READY, SUBMITTED, ARCHIVED }
enum ReceiptCategory { FAHRT, UNTERKUNFT, VERPFLEGUNG, NEBENKOSTEN }
```

---

## 4. Sicherheit & DSGVO

### 4.1 DSGVO-Maßnahmen

| Anforderung | Umsetzung |
|-------------|-----------|
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Datensparsamkeit** | Nur für Abrechnung notwendige Daten |
| **Verschlüsselung at rest** | IBAN/BIC: AES-256-GCM. Belege: verschlüsselt in MinIO |
| **Verschlüsselung in transit** | TLS 1.3 (Let's Encrypt), HSTS |
| **Recht auf Löschung** | Account-Löschung löscht alle Daten. Aufbewahrungspflicht 10 Jahre |
| **Recht auf Auskunft** | Export-Funktion: alle Daten als JSON |
| **Cookie-Consent** | Nur technisch notwendige Cookies |
| **Impressum/Datenschutz** | Öffentlich zugänglich, NICHT hinter Login |

### 4.2 Security-Maßnahmen

| Bereich | Maßnahme |
|---------|----------|
| **Authentication** | Magic Link, Session-Cookies (HttpOnly, Secure, SameSite=Strict) |
| **Authorization** | Row-Level Security in allen Queries |
| **Rate Limiting** | Upstash Redis: Login 5/min, API 100/min, Upload 20/min |
| **Input Validation** | Zod-Schemas für alle Eingaben |
| **File Upload** | MIME + Magic-Byte Validierung, Max 10 MB, ClamAV |
| **PDF-Output** | Geflattened (keine editierbaren Felder), maschinenlesbar |
| **CSP** | Strenge Content Security Policy mit Nonces |

---

## 5. Unterschrift-Verarbeitung

### 5.1 Eingabe

Zwei Möglichkeiten, gleichwertig:

1. **Canvas-Zeichnung:** Touch/Maus direkt im Browser, Export als PNG
2. **Bild-Upload:** PNG/JPG hochladen (z.B. gescannte Unterschrift)

### 5.2 Verarbeitung (Server-seitig)

```python
from PIL import Image
import numpy as np

img = Image.open(uploaded_file).convert("RGBA")
data = np.array(img)

# Schwarzen/weißen Hintergrund entfernen → transparent
brightness = data[:,:,0].astype(int) + data[:,:,1].astype(int) + data[:,:,2].astype(int)
mask = brightness < 120  # dunkle Pixel = Hintergrund
data[mask] = [0, 0, 0, 0]

# Whitespace trimmen
alpha = data[:,:,3]
rows = np.any(alpha > 10, axis=1)
cols = np.any(alpha > 10, axis=0)
rmin, rmax = np.where(rows)[0][[0,-1]]
cmin, cmax = np.where(cols)[0][[0,-1]]
trimmed = Image.fromarray(data).crop((cmin, rmin, cmax+1, rmax+1))
trimmed.save("signature_processed.png")
```

### 5.3 Platzierung im PDF

Die Unterschrift wird so platziert, dass sie natürlich wirkt: 85% über der Linie, 15% darunter (für Unterlängen wie y, g, p).

```python
sig_ratio = sig_height / sig_width
sig_w = 80  # PDF-Punkte
sig_h = sig_w * sig_ratio
sig_y = line_y - (sig_h * 0.15)  # 15% unter der Linie
```

---

## 6. PDF-Generierung (Validiert ✓)

### 6.1 Grundsatz: Original befüllen, nicht nachbauen

> **Wichtigste Erkenntnis aus der Prototyp-Phase:** Die PDF-Ausgabe muss die **Original-DPSG-Formulare** verwenden, nicht eigene HTML/CSS-Nachbauten. Die Buchhaltung erwartet exakt das bekannte Layout.

### 6.2 Ansatz: Overlay + Flatten

Der naive Ansatz (AcroForm-Felder befüllen) scheitert an:
- Viewer-abhängige Darstellung (Schriftgröße, Alignment)
- NeedAppearances-Flag wird nicht von allen Viewern unterstützt
- Formular bleibt editierbar

**Stattdessen: Text-Overlay mit reportlab + Flatten mit pypdf**

```
Original-PDF (mit leeren Formularfeldern)
        │
        ▼
  ┌─────────────┐
  │ reportlab    │ ← Erstellt Overlay-PDF mit:
  │ Canvas       │    - Text an exakten Koordinaten
  │              │    - Checkmarks an Checkbox-Positionen
  │              │    - Signatur-PNG eingebettet
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ pypdf        │ ← Merged Overlay auf Original-Seite
  │ merge_page   │    Entfernt alle /Widget Annotations
  │              │    → Keine editierbaren Felder mehr
  └──────┬──────┘
         │
         ▼
  Geflattened PDF (unveränderlich, maschinenlesbar)
```

### 6.3 Reisekostenabrechnung — Feld-Mapping

Quelldatei: `Reisekosten-DPSG-Gremienmitglieder_231115.pdf`

| Feld | PDF-Koordinaten [x0, y0, x1, y1] | Inhalt | Font | Align |
|------|----------------------------------|--------|------|-------|
| Name | [111.4, 757.2, 396.8, 774.0] | Nachname | DejaVu Sans 10pt | links |
| Vorname | [111.4, 739.2, 396.8, 756.0] | Vorname | DejaVu Sans 10pt | links |
| Straße | [111.4, 721.2, 396.8, 738.0] | Straße | DejaVu Sans 10pt | links |
| PLZ Ort | [111.4, 703.2, 396.8, 720.0] | PLZ + Stadt | DejaVu Sans 10pt | links |
| Kontoinhaber | [111.4, 685.2, 396.8, 702.0] | Name | DejaVu Sans 10pt | links |
| Bank | [111.4, 667.2, 396.8, 684.0] | Bankname | DejaVu Sans 10pt | links |
| IBAN | [111.4, 649.4, 396.8, 666.2] | IBAN | DejaVu Sans 9pt | links |
| BIC | [111.4, 632.2, 261.4, 649.0] | BIC | DejaVu Sans 9pt | links |
| Reisebeginn Datum | [117.3, 592.6, 207.1, 604.2] | DD.MM.YYYY | DejaVu Sans 9pt | links |
| Reisebeginn Uhrzeit | [209.1, 592.6, 298.9, 604.2] | HH:MM | DejaVu Sans 9pt | links |
| Reiseende Datum | [371.6, 591.6, 461.4, 603.1] | DD.MM.YYYY | DejaVu Sans 9pt | links |
| Reiseende Uhrzeit | [463.4, 591.6, 553.1, 603.1] | HH:MM | DejaVu Sans 9pt | links |
| Reiseweg | [119.0, 570.1, 551.8, 581.6] | Route | DejaVu Sans 7.5pt | links |
| Reisezweck | [118.7, 552.8, 551.5, 564.4] | Zweck | DejaVu Sans 9pt | links |
| Kennzeichen | [334.3, 533.8, 391.1, 550.2] | KFZ | DejaVu Sans 9pt | links |
| Kilometer | [178.6, 468.0, 220.2, 481.1] | Zahl | DejaVu Sans 10pt | rechts |
| Kosten 1 (Fahrt) | [410.5, 484.1, 552.5, 497.7] | Betrag | DejaVu Sans 10pt | **rechts** |
| Kosten 2 (km-Geld) | [410.8, 468.1, 552.7, 481.7] | Betrag | DejaVu Sans 10pt | **rechts** |
| Kosten 3 (Unterkunft) | [410.6, 443.5, 553.4, 459.7] | Betrag | DejaVu Sans 10pt | **rechts** |
| Kosten 4 (Verpflegung) | [410.6, 420.7, 553.4, 437.0] | Betrag | DejaVu Sans 10pt | **rechts** |
| Kosten 5 (Nebenkosten) | [410.6, 398.2, 553.4, 414.4] | Betrag | DejaVu Sans 10pt | **rechts** |
| Kosten 6 (Zwischensumme) | [410.3, 376.1, 553.1, 392.3] | Betrag | DejaVu Sans 10pt | **rechts** |
| Kosten 7 (Erstattung) | [410.6, 358.5, 553.4, 374.7] | Betrag | DejaVu Sans 10pt | **rechts** |
| Kosten 8 (Endsumme) | [411.0, 341.2, 553.8, 357.4] | Betrag | DejaVu Sans 10pt | **rechts** |
| Datum (Verzicht) | [302.4, 207.8, 373.4, 224.6] | DD.MM.YYYY | DejaVu Sans 9pt | links |

#### Checkboxen

| Checkbox | PDF-Koordinaten | Zustand |
|----------|----------------|---------|
| Bankverbindung bekannt | [300.4, 631.6, 306.8, 638.0] | Immer ✓ |
| Dienstwagen | [117.1, 533.8, 123.5, 540.2] | Bei mode=DIENSTWAGEN |
| Auto (Privat-PKW) | [219.2, 533.8, 225.6, 540.2] | Bei mode=PKW |
| Bahn | [117.2, 521.0, 123.6, 527.5] | Bei mode=BAHN |
| Schiff | [219.3, 521.0, 225.7, 527.5] | — |
| Flugzeug | [117.1, 507.9, 123.4, 514.3] | Bei mode=FLUGZEUG |
| CO₂-Kompensation | [219.2, 507.7, 225.6, 514.1] | Optional |

#### Unterschrift-Position (Verzichtsspende)

```
Linie "Unterschrift": RECT x0=388.3 x1=476.7 y=634.1 (pdfplumber, y von oben)
                       → PDF y = 841.89 - 634.1 = 207.8 (y von unten)

Signatur-Platzierung: x=383, y=201 (bottom), Breite=80pt
                      → 85% über der Linie, 15% darunter
```

### 6.4 Handyticket-Erklärung

Quelldatei: `Reisekosten_DPSG_Handyticket_151015.docx`

**Ansatz:** Original-DOCX mit python-docx befüllen, dann mit LibreOffice zu PDF konvertieren. Signatur als Overlay per reportlab auf das konvertierte PDF.

**Textstruktur (Paragraph 13):**
- Einzel-Ticket: `"Ich, {Name} bestätige hiermit, dass\nich die Fahrt am {Datum} ({Von} - {Nach}, {Betrag} EUR) mit diesem Handyticket angetreten habe."`
- Mehrere Tickets: `"Ich, {Name} bestätige hiermit, dass\nich die folgenden Fahrten mit dem jeweiligen Handyticket angetreten habe:\n\n    1. am {Datum}:  {Von} - {Nach}  ({Betrag} EUR)\n    2. am {Datum}:  {Von} - {Nach}  ({Betrag} EUR)"`

**Wichtig:**
- `(Name, Vorname)` wird NICHT mit ausgegeben — nur der Name selbst
- Paragraph-Alignment auf LEFT setzen (Original ist Blocksatz, zerreißt den Text)
- Font Size: 11pt
- Paragraph 21 (Unterstrich-Linie) → Eintragungsdatum eintragen

**Signatur-Position im konvertierten PDF:**
```
"Datum, Unterschrift" Labels: pdfplumber top=635.4 → PDF y = 206.5
Signatur: x=120, y=ht_line_y - sig_h*0.15
```

### 6.5 Weitere Formulare (Phase 2+)

| Formular | Quelldatei | Ansatz |
|----------|-----------|--------|
| Sachkostenabrechnung | `Sachkosten-DPSG-Abrechnungsformular_231115.pdf` | Overlay + Flatten (wie RK) |
| Bewirtungsaufwendungen | `Sachkosten-DPSG-Bewirtungsaufwendungen_231115.pdf` | Overlay + Flatten |
| BahnCard-Antrag | `Reisekosten_DPSG_BahnCard_Antrag.xls` | openpyxl befüllen, xlsx ausgeben |
| Eigenbeleg | `Eigenbeleg.doc` | python-docx befüllen, PDF konvertieren |
| Vergabevermerk | `190315_Vorlage_Unterschwellenvergabeverordnung_Stand_03_2019.docx` | python-docx befüllen |

### 6.6 Zahlenformat

Alle Beträge werden mit **Komma** als Dezimaltrenner ausgegeben (deutsches Format): `89,60` nicht `89.60`.

### 6.7 Learnings aus der Prototyp-Phase

| Problem | Lösung |
|---------|--------|
| AcroForm-Felder zeigen in jedem Viewer andere Schrift/Größe/Alignment | Overlay-Ansatz: Text wird als feste Textebene gezeichnet |
| `NeedAppearances` Flag wird von pdftoppm nicht unterstützt | Irrelevant beim Overlay-Ansatz |
| Helvetica hat keine Umlaute (ü, ö, ä, ß) | DejaVu Sans TTF verwenden |
| Formular bleibt nach Befüllung editierbar | Flatten: alle `/Widget`-Annotations entfernen |
| Unterschrift-PNG mit schwarzem Hintergrund | PIL: Brightness-Threshold → Transparent |
| Unterschrift schwebt über dem Text statt auf der Linie | Exakte Koordinaten per pdfplumber extrahieren, 85/15 Regel |
| Blocksatz in Handyticket-DOCX zerreißt Text | `WD_ALIGN_PARAGRAPH.LEFT` setzen |

---

## 7. UI/UX-Konzept

### 7.1 Design-System

- **Primärfarbe:** DPSG-Rot `#8B1A2B`
- **Akzent:** DPSG-Gold `#C4943D`
- **Hintergrund:** `#FAF9F6` (warm off-white)
- **Font Display:** Source Serif 4
- **Font Body:** Source Sans 3
- **Icons:** Lucide React

### 7.2 Kern-Workflows (validiert im Prototyp)

**Workflow: Bahnreise mit Handyticket abrechnen**

1. Profil einmalig ausfüllen (Name, Adresse, Bank, Unterschrift)
2. Neue Reise anlegen (Zweck, Datum, Bahn)
3. Fahrtkosten-Belege hinzufügen (Betrag, Datum, Von, Nach)
4. Als "📱 Handyticket" markieren → erscheint auf der HT-Erklärung
5. Reiseweg wird automatisch aus Belegen gebaut
6. "Abrechnung erstellen" → Server generiert:
   - Reisekostenabrechnung (Original-PDF, geflattened)
   - Handyticket-Erklärung (Original-DOCX → PDF)
7. Download als ZIP oder Direkt-Versand

---

## 8. Abrechnungsregeln (Leitfaden Stand 12/2025)

| Regel | Validierung | Verhalten |
|-------|-------------|-----------|
| PKW: 0,20 €/km | Automatisch | Konfigurierbar |
| PKW: max 130 € KJP-förderbar | Warnung | Gelb |
| PKW: Begründung erforderlich | Pflichtfeld | Blockiert |
| Bahn: 2. Klasse + GKR 5% | Info | Hinweis |
| Parkgebühren: max 5 €/Tag | Warnung | Gelb |
| Alkohol/Energy: nicht erstattbar | Blocker | Rot |
| Geschenke: max 30 € | Warnung | Gelb |
| Frist: 3 Monate nach Reise | Warnung | Gelb/Rot |
| Frist: 1. Werktag Januar Folgejahr | Blocker | Rot |
| Handyticket: Fahrtbestätigung | Auto | PDF wird erzeugt |
| Taxi: Begründung erforderlich | Pflichtfeld | Blockiert |
| Unterkunft: max 51 €/Person/Tag | Warnung | Gelb |
| Gutschein-Tickets: nicht erstattbar | Info | Banner |
| Originalbelege: 5/10 Jahre aufbewahren | Info | Hinweis |
| Anschaffung > 1.000 €: 3 Angebote | Info | Vergabevermerk |

---

## 9. Repo-Struktur

```
dpsg-reisekosten/
├── .github/
│   ├── workflows/ci.yml
│   ├── workflows/deploy.yml
│   ├── CODEOWNERS
│   └── dependabot.yml
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── reisen/
│   │   │   ├── belege/
│   │   │   ├── sachkosten/
│   │   │   ├── profil/
│   │   │   └── downloads/
│   │   ├── api/
│   │   │   ├── trips/
│   │   │   ├── receipts/
│   │   │   └── pdf/generate/   # Ruft Python-Script auf
│   │   ├── impressum/          # Öffentlich!
│   │   └── datenschutz/        # Öffentlich!
│   ├── components/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── encryption.ts
│   │   ├── validators.ts
│   │   └── rules.ts
│   └── types/
├── pdf-generator/              # Python PDF-Generator
│   ├── generate_reisekosten.py
│   ├── generate_handyticket.py
│   ├── process_signature.py
│   ├── templates/              # Original-DPSG-Vorlagen
│   │   ├── Reisekosten-DPSG-Gremienmitglieder_231115.pdf
│   │   ├── Reisekosten_DPSG_Handyticket_151015.docx
│   │   ├── Sachkosten-DPSG-Abrechnungsformular_231115.pdf
│   │   ├── Sachkosten-DPSG-Bewirtungsaufwendungen_231115.pdf
│   │   ├── Reisekosten_DPSG_BahnCard_Antrag.xls
│   │   └── Eigenbeleg.doc
│   └── requirements.txt        # pypdf, reportlab, python-docx, Pillow, numpy
├── docs/
│   ├── KONZEPT.md              # Dieses Dokument
│   ├── SETUP.md
│   ├── API.md
│   ├── PDF-GENERATOR.md        # Technische Doku zum PDF-Ansatz
│   └── DEPLOYMENT.md
├── tests/
├── .env.example
├── next.config.ts
├── package.json
└── README.md
```

---

## 10. Deployment & Betrieb

### 10.1 Infrastruktur

- **Server:** Hetzner Cloud (Standort: Deutschland)
- **Domain:** `bundesamt.dpsgonline.de`
- **SSL:** Let's Encrypt (auto-renew via Traefik)
- **Reverse Proxy:** Traefik v3

### 10.2 Docker Compose

```yaml
services:
  app:
    build: .
    depends_on: [db, minio]
    restart: unless-stopped

  pdf-generator:
    build: ./pdf-generator
    volumes:
      - templates:/app/templates
      - signatures:/app/signatures
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    restart: unless-stopped

  minio:
    image: minio/minio
    volumes: [minio_data:/data]
    restart: unless-stopped

  traefik:
    image: traefik:v3
    ports: ["443:443", "80:80"]
    restart: unless-stopped
```

### 10.3 Übergabe an den Bundesverband

1. **GitHub Repository:** Vollständiger Source Code mit CI/CD
2. **Docker:** `docker compose up` startet alles
3. **Dokumentation:** Setup-Guide, API-Docs, Deployment-Guide, PDF-Generator-Doku
4. **Kein Vendor Lock-In:** Alles Open Source
5. **Backup-Skripte:** Automatisierte DB- und File-Backups

---

## 11. Roadmap

### Phase 1: MVP — Reisekostenabrechnung (6 Wochen)
- [x] PDF-Generator: Reisekostenabrechnung (validiert)
- [x] PDF-Generator: Handyticket-Erklärung (validiert)
- [x] Unterschrift-Verarbeitung (Canvas + Upload, validiert)
- [x] Prototyp UI: Reisen, Belege, Profil
- [ ] Next.js Projekt-Setup (Prisma, Auth, Docker)
- [ ] Profilverwaltung + Signatur-Upload
- [ ] Reisen CRUD + Beleg-Zuordnung
- [ ] PDF-Generierung als API-Endpoint
- [ ] Download-Paket (ZIP)

### Phase 2: Automatisierung (4 Wochen)
- [ ] OCR für Belege (Betragsauslese)
- [ ] DB-Ticket-Parser
- [ ] Auto-Reise-Erstellung aus Beleg
- [ ] Reisen zusammenführen
- [ ] Google Maps Kilometer-Berechnung

### Phase 3: Vollständige Formulare (4 Wochen)
- [ ] Sachkosten-Quartalsabrechnung (PDF)
- [ ] Bewirtungsbeleg (PDF)
- [ ] BahnCard-Antrag (XLSX)
- [ ] Eigenbeleg (PDF)
- [ ] Vergabevermerk (PDF)

### Phase 4: Multi-User & E-Mail (4 Wochen)
- [ ] Registrierung/Einladung
- [ ] E-Mail-Beleg-Empfang
- [ ] Direkt-Versand an reisekosten@dpsg.de

### Phase 5: Produktion & Übergabe (2 Wochen)
- [ ] Security Audit
- [ ] Performance-Tests
- [ ] Dokumentation finalisieren
- [ ] Deployment auf Bundesverband-Server

---

## 12. Entscheidungslog

| Datum | Entscheidung | Begründung |
|-------|-------------|------------|
| 04/2026 | Next.js statt Remix | DPSG-Erfahrung vorhanden |
| 04/2026 | Magic Link statt Passwort | Sicherer, einfacher |
| 04/2026 | PostgreSQL statt SQLite | Multi-User, Skalierbarkeit |
| 04/2026 | **Overlay+Flatten statt AcroForm** | AcroForm viewerabhängig, unzuverlässig |
| 04/2026 | **DejaVu Sans statt Helvetica** | Umlaute (ü,ö,ä,ß) korrekt |
| 04/2026 | **reportlab für Overlay** | Exakte Koordinaten, Font-Kontrolle |
| 04/2026 | **python-docx für Handyticket** | Original-Template behalten (Logo, Wasserzeichen) |
| 04/2026 | **PIL für Signatur-Verarbeitung** | Hintergrund entfernen, Whitespace trimmen |
| 04/2026 | Docker Compose statt K8s | Angemessen für Nutzerzahl |
| 04/2026 | Google Maps statt OSM | Bessere Geocoding-Qualität DE |
| 04/2026 | Eigener Mailserver statt SaaS | DSGVO: Daten in DE |

---

*Dieses Dokument wird fortlaufend aktualisiert. Stand: 02.04.2026, Version 0.2.0*
