# Deployment-Plan für morgen

## Überblick

3 Pakete, in dieser Reihenfolge deployen:

### Paket 1: Original-PDF-Templates (erfordert Server-Arbeit)
**Ziel:** Sachkosten + Bewirtung PDFs auf den Original-DPSG-Vorlagen generieren (wie bei der Reisekostenabrechnung).

**Schritte:**
1. Field-Extraction-Script auf Server ausführen → Koordinaten der Felder ermitteln
2. Overlay-Generatoren schreiben (reportlab auf Original-PDF)
3. Testen + Feintuning der Positionen

**Templates auf dem Server:**
- `pdf-generator/templates/Sachkosten-DPSG-Abrechnungsformular_231115.pdf`
- `pdf-generator/templates/Sachkosten-DPSG-Bewirtungsaufwendungen_231115.pdf`
- `pdf-generator/templates/Reisekosten_DPSG_BahnCard_Antrag.xls` → erst in PDF konvertieren!

**Entscheidungen getroffen:**
- BahnCard-Template ist XLS. → LibreOffice-Konvertierung zu PDF, dann Overlay-Ansatz.
  Falls die Konvertierung nicht sauber aussieht → Custom-Design beibehalten (sieht schon gut aus).
- Ansatz identisch zu generate_reisekosten.py: reportlab-Overlay → pypdf merge → flatten

**Vorbereitet:** `extract_fields.py` — läuft auf dem Server, extrahiert Koordinaten

---

### Paket 2: Beleg-Merge (sofort deploybar!)
**Ziel:** Hochgeladene Belege werden ans PDF-Paket angehängt.

**Dateien → Ziel:**
```
bewirtung-pdf-route.ts  → src/app/api/bewirtung/pdf/route.ts  (überschreiben)
sachkosten-pdf-route.ts → src/app/api/sachkosten/pdf/route.ts  (überschreiben)
bahncard-pdf-route.ts   → src/app/api/bahncard/pdf/route.ts    (überschreiben)
```

**Was passiert:**
- Bewirtung: Formular-PDF + angehängter Bewirtungsbeleg
- Sachkosten: Formular-PDF + alle Item-Belege
- BahnCard: Formular-PDF + BCBP-Ersparnis-PDF oder BahnCard-Scan

**Deploy:**
```bash
cp paket-2-beleg-merge/bewirtung-pdf-route.ts src/app/api/bewirtung/pdf/route.ts
cp paket-2-beleg-merge/sachkosten-pdf-route.ts src/app/api/sachkosten/pdf/route.ts
cp paket-2-beleg-merge/bahncard-pdf-route.ts src/app/api/bahncard/pdf/route.ts
docker compose -f docker-compose.prod.yml up -d --build
```

---

### Paket 3: Usability (sofort deploybar!)
**Ziel:** Bessere UX im gesamten Tool.

**Dateien → Ziel:**
```
dashboard-page.tsx      → src/app/(dashboard)/page.tsx         (überschreiben)
Toast.tsx               → src/components/Toast.tsx              (neu)
migration-usability.sql → DB: Gremium-Feld für User
```

**Was ist neu:**
1. **Dashboard-Übersicht:** Kacheln für Reisen, Sachkosten, Bewirtung, BahnCard mit Beträgen
2. **Quick Actions:** Buttons "Neue Reise", "Sachkosten", "Bewirtung" direkt auf dem Dashboard
3. **Letzte Reisen:** Die 5 neuesten Reisen mit Pending-Badges
4. **Toast-Notifications:** Grüne Bestätigung nach Speichern (component ready, muss in Pages importiert werden)
5. **Gremium-Feld:** Neues Feld im Profil, wird in allen PDFs als Gremium angezeigt

**Deploy:**
```bash
# Migration
docker compose -f docker-compose.prod.yml exec -T db psql -U dpsg -d dpsg_reisekosten < paket-3-usability/migration-usability.sql

# Dateien
cp paket-3-usability/dashboard-page.tsx src/app/(dashboard)/page.tsx
cp paket-3-usability/Toast.tsx src/components/Toast.tsx

# Prisma Schema
sed -i '/gremium/d' prisma/schema.prisma  # falls doppelt
sed -i '/bank.*String?/a\  gremium       String?' prisma/schema.prisma

# Build
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Reihenfolge morgen

1. **Paket 2 + 3 zuerst** (sofort deploybar, kein Template-Arbeit nötig)
2. **Paket 1 danach** (braucht interaktive Arbeit auf dem Server für Koordinaten)

---

## Offene Design-Entscheidung: BahnCard-Template

Das BahnCard-Template ist eine XLS-Datei. Optionen:
- **A)** LibreOffice-Konvertierung → PDF → Overlay (kann funktionieren, muss getestet werden)
- **B)** Custom-Design beibehalten (sieht schon professionell aus, DPSG-Farben)
- **C)** Mathias liefert ein PDF-Export des XLS-Templates

→ Empfehlung: Option A testen, bei Problemen auf B zurückfallen.

---

## Offene Usability-Ideen (Bonus, falls Zeit)

- [ ] Mobile Hamburger-Menü (Navigation ist auf Smartphone eng)
- [ ] Profil: Gremium-Dropdown (Bundesleitung, AG XY, etc.)
- [ ] Sachkosten: Drag-and-Drop für Beleg-Upload
- [ ] Alle Seiten: Auto-Save mit Debounce statt manuelles Speichern
- [ ] Export-Funktion: Alle Abrechnungen eines Jahres als ZIP
- [ ] Profil: Canvas-Signatur Integration (Component existiert schon in src/components/SignaturePad.tsx)
