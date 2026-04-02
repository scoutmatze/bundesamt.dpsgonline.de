# PDF-Generator — Technische Dokumentation

**Stand:** 02.04.2026 | **Status:** Validiert (Prototyp)

---

## Übersicht

Der PDF-Generator erzeugt ausgefüllte DPSG-Formulare aus den Original-Vorlagen. Er läuft als Python-Service und wird vom Next.js-Backend per Subprocess oder HTTP aufgerufen.

## Abhängigkeiten

```txt
# requirements.txt
pypdf>=4.0
reportlab>=4.0
python-docx>=1.0
Pillow>=10.0
numpy>=1.24
pdfplumber>=0.10     # nur für Koordinaten-Extraktion (Entwicklung)
```

System-Abhängigkeiten:
```bash
apt install fonts-dejavu-core libreoffice-writer
```

---

## 1. Reisekostenabrechnung

### Eingabe (JSON)

```json
{
  "profile": {
    "lastName": "Müller",
    "firstName": "Mathias",
    "street": "Musterstraße 42",
    "zip": "80333",
    "city": "München",
    "accountHolder": "Mathias Müller",
    "bank": "Commerzbank",
    "iban": "DE89 3704 0044 0532 0130 00",
    "bic": "COBADEFFXXX",
    "signaturePath": "/signatures/user123.png"
  },
  "trip": {
    "purpose": "BAK Internationale Arbeit – Sitzung",
    "route": "München Hbf – Montabaur – Westernohe – Montabaur – München Hbf",
    "startDate": "15.03.2026",
    "startTime": "08:30",
    "endDate": "17.03.2026",
    "endTime": "18:45",
    "mode": "BAHN",
    "pkwReason": null,
    "licensePlate": null,
    "km": 0
  },
  "costs": {
    "travel": 89.60,
    "kmMoney": 0.00,
    "lodging": 0.00,
    "meals": 0.00,
    "other": 4.50,
    "subtotal": 94.10,
    "reimbursement": 0.00,
    "total": 94.10
  },
  "checkboxes": {
    "bankKnown": true,
    "bahn": true,
    "auto": false,
    "dienstwagen": false,
    "flugzeug": false,
    "schiff": false,
    "co2": false
  }
}
```

### Ausgabe

Geflattened PDF (keine editierbaren Felder, maschinenlesbarer Text).

### Algorithmus

```python
# 1. Overlay erstellen (reportlab)
canvas = Canvas(buffer, pagesize=A4)
for field in FIELD_MAPPING:
    canvas.setFont("DVSans", field.size)
    if field.align == "right":
        canvas.drawRightString(field.x1 - 4, field.y0 + 2, value)
    else:
        canvas.drawString(field.x0 + 2, field.y0 + 2, value)

# 2. Checkmarks zeichnen
for checkbox in checked_boxes:
    # Kleines ✓ als Linien
    canvas.line(cx-sz/3, cy, cx-sz/8, cy-sz/3)
    canvas.line(cx-sz/8, cy-sz/3, cx+sz/3, cy+sz/3)

# 3. Signatur einbetten
canvas.drawImage(signature_path, x=383, y=201, width=80, height=45, mask='auto')

# 4. Overlay auf Original mergen + Flatten
reader = PdfReader(TEMPLATE)
page = reader.pages[0]
# Alle Widget-Annotations entfernen (= Flatten)
page["/Annots"] = [a for a in page["/Annots"]
                   if a.get_object().get("/Subtype") != "/Widget"]
page.merge_page(overlay)
```

### Feld-Koordinaten

Alle Koordinaten sind in PDF-Punkten (1pt = 1/72 Zoll), y=0 am unteren Seitenrand.

Siehe `KONZEPT.md`, Kapitel 6.3 für die vollständige Feld-Mapping-Tabelle.

### Zahlenformat

Beträge werden als String mit Komma übergeben: `"89,60"` (deutsches Format).

---

## 2. Handyticket-Erklärung

### Eingabe (JSON)

```json
{
  "name": "Mathias Müller",
  "date": "02.04.2026",
  "signaturePath": "/signatures/user123.png",
  "tickets": [
    { "date": "15.03.2026", "from": "München Hbf", "to": "Montabaur", "amount": "44,80" },
    { "date": "17.03.2026", "from": "Montabaur", "to": "München Hbf", "amount": "44,80" }
  ]
}
```

### Algorithmus

```python
# 1. DOCX-Vorlage befüllen
doc = Document(TEMPLATE_DOCX)
p = doc.paragraphs[13]  # Haupttext-Paragraph
for run in p.runs:
    run.text = ""
p.alignment = WD_ALIGN_PARAGRAPH.LEFT

# Text aufbauen (ohne "(Name, Vorname)")
if len(tickets) == 1:
    text = f"Ich, {name} bestätige hiermit, dass\nich die Fahrt am ..."
else:
    text = f"Ich, {name} bestätige hiermit, dass\nich die folgenden Fahrten ...\n\n"
    for i, t in enumerate(tickets, 1):
        text += f"    {i}. am {t.date}:  {t.from} - {t.to}  ({t.amount} EUR)\n"

p.runs[0].text = text
p.runs[0].font.size = Pt(11)

# Datum an Paragraph 21 (Unterstrich-Linie)
doc.paragraphs[21].runs[0].text = today

# 2. DOCX → PDF konvertieren (LibreOffice)
soffice --headless --convert-to pdf output.docx

# 3. Signatur als Overlay
sig_y = ht_line_y - (sig_h * 0.15)  # 85% über, 15% unter der Linie
canvas.drawImage(signature, x=120, y=sig_y, ...)
page.merge_page(overlay)
```

### Signatur-Position

Per `pdfplumber` aus dem konvertierten PDF extrahiert:
- "Datum, Unterschrift" Labels: `top=635.4` (pdfplumber, y von oben)
- Linie darüber: `RECT top=634.1`
- PDF y = 841.89 - 634.1 = **207.8**

---

## 3. Unterschrift-Verarbeitung

### Eingabe

PNG oder JPG, beliebiger Hintergrund (schwarz, weiß, farbig).

### Verarbeitung

```python
# 1. Hintergrund entfernen
img = Image.open(file).convert("RGBA")
data = np.array(img)
brightness = data[:,:,0] + data[:,:,1] + data[:,:,2]
data[brightness < 120] = [0, 0, 0, 0]  # dunkel → transparent

# 2. Whitespace trimmen
alpha = data[:,:,3]
rows, cols = np.where(alpha > 10)
trimmed = img.crop((cols.min(), rows.min(), cols.max()+1, rows.max()+1))

# 3. Speichern als PNG mit Transparenz
trimmed.save("signature.png")
```

### Platzierung

```python
sig_ratio = height / width
sig_w = 80  # PDF-Punkte Breite
sig_h = sig_w * sig_ratio
sig_y = line_y - (sig_h * 0.15)  # 15% unterhalb der Linie

canvas.drawImage(path, x, sig_y, width=sig_w, height=sig_h, mask='auto')
```

---

## 4. API-Endpoint (Next.js)

```typescript
// src/app/api/pdf/generate/route.ts
export async function POST(req: Request) {
  const { tripId } = await req.json();
  
  // Daten aus DB laden
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { receipts: true, user: true }
  });
  
  // JSON für Python-Script erstellen
  const input = buildPdfInput(trip);
  const inputPath = `/tmp/pdf_input_${tripId}.json`;
  fs.writeFileSync(inputPath, JSON.stringify(input));
  
  // Python-Script aufrufen
  const result = execSync(
    `python3 /app/pdf-generator/generate_reisekosten.py ${inputPath} /tmp/output_${tripId}.pdf`
  );
  
  // PDF zurückgeben
  const pdf = fs.readFileSync(`/tmp/output_${tripId}.pdf`);
  return new Response(pdf, {
    headers: { 'Content-Type': 'application/pdf' }
  });
}
```

---

## 5. Bekannte Einschränkungen

| Einschränkung | Workaround |
|---------------|-----------|
| LibreOffice für DOCX→PDF nötig | Docker-Image enthält `libreoffice-writer` |
| Signatur-Transparenz bei CMYK-PDFs | Nur RGB-Signaturen verwenden |
| Reiseweg-Feld hat begrenzte Breite (432pt) | Font-Size auf 7.5pt bei langen Routen |
| pdftoppm zeigt Umlaute nicht korrekt | Nur Vorschau-Problem, PDF-Reader zeigen korrekt |
