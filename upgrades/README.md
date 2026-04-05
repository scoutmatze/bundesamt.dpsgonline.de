# DPSG Reisekosten — Upgrade-Pakete

## Übersicht

### Block A: Bestehende Features erweitern
- **Canvas-Signatur**: Im Browser unterschreiben (statt Bild-Upload)
- **Verpflegungspauschalen**: Automatische Berechnung nach Reisedauer (14€ / 28€)
- **Kilometerabrechnung**: Strecken mit km-Eingabe + Google Maps Distanzberechnung

### Block B: Neue Dokumenttypen
- **Sachkostenabrechnung**: Pro Quartal, Positionen mit Belegen, PDF-Generierung
- **Bewirtungsaufwendungen**: Anlass, Teilnehmer, Kosten, PDF-Generierung
- **BahnCard-Antrag**: Jährlich, Wirtschaftlichkeitsberechnung, PDF-Generierung

---

## Deployment-Reihenfolge

### 1. Dateien kopieren

```
# Block A
cp block-a/SignaturePad.tsx          → src/components/SignaturePad.tsx
cp block-a/VerpflegungsSection.tsx   → src/components/VerpflegungsSection.tsx
cp block-a/KilometerSection.tsx      → src/components/KilometerSection.tsx
cp block-a/verpflegung.ts           → src/lib/verpflegung.ts
cp block-a/distance-route.ts        → src/app/api/distance/route.ts

# Block B
cp block-b/generate_sachkosten.py   → pdf-generator/generate_sachkosten.py
cp block-b/generate_bewirtung.py    → pdf-generator/generate_bewirtung.py
cp block-b/generate_bahncard.py     → pdf-generator/generate_bahncard.py
cp block-b/sachkosten-route.ts      → src/app/api/sachkosten/route.ts
cp block-b/bewirtung-route.ts       → src/app/api/bewirtung/route.ts
cp block-b/bahncard-route.ts        → src/app/api/bahncard/route.ts
```

### 2. Datenbank migrieren

```bash
# Block A
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U dpsg -d dpsg_reisekosten < block-a/migration-block-a.sql

# Block B
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U dpsg -d dpsg_reisekosten < block-b/migration-block-b.sql
```

### 3. Prisma Schema aktualisieren

Die Felder aus `prisma-additions.prisma` in `prisma/schema.prisma` einfügen:
- Neue Felder zum User-Model (signatureData, Relations)
- Neue Felder zum Trip-Model (startTime, endTime, verpflegung*, km*)
- Neue Models: Sachkosten, SachkostenItem, Bewirtung, BahnCard

### 4. In bestehende UI integrieren

#### Canvas-Signatur im Profil:
In `src/app/(dashboard)/profil/page.tsx`:
```tsx
import SignaturePad from "@/components/SignaturePad";

// Im Profil-Formular (statt oder zusätzlich zum Datei-Upload):
<SignaturePad
  initialData={user.signatureData}
  onSave={async (dataUrl) => {
    await fetch("/api/profil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureData: dataUrl }),
    });
  }}
/>
```

#### Verpflegung + Kilometer in Reise-Detail:
In `src/app/(dashboard)/reisen/[id]/page.tsx`:
```tsx
import VerpflegungsSection from "@/components/VerpflegungsSection";
import KilometerSection from "@/components/KilometerSection";

// Nach den Kosten-Kacheln, vor dem Hinweisfeld:
<VerpflegungsSection
  tripId={trip.id}
  startDate={trip.startDate?.split("T")[0]}
  startTime={trip.startTime || ""}
  endDate={trip.endDate?.split("T")[0] || ""}
  endTime={trip.endTime || ""}
  onUpdate={(amount) => { /* Speichern */ }}
/>

{trip.travelMode === "PRIVAT_PKW" && (
  <KilometerSection
    tripId={trip.id}
    initialLegs={trip.kmLegs ? JSON.parse(trip.kmLegs) : []}
    rate={trip.kmRate || 0.30}
    onUpdate={async (legs, km, amount) => {
      await fetch("/api/trips", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: trip.id,
          kmLegs: JSON.stringify(legs),
          kmTotal: km,
          kmAmount: amount,
        }),
      });
    }}
  />
)}
```

#### Startzeit + Endzeit im Reise-Detail:
Zusätzliche Felder für die Zeiten im Trip-Header einbauen
(benötigt für Verpflegungspauschale-Berechnung):
```tsx
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
  <div>
    <label>Abfahrt</label>
    <input type="time" value={trip.startTime || ""} onChange={...} />
  </div>
  <div>
    <label>Rückkehr</label>
    <input type="time" value={trip.endTime || ""} onChange={...} />
  </div>
</div>
```

### 5. Optional: Google Maps API Key

Für die automatische Kilometerberechnung:
```bash
# .env ergänzen
GOOGLE_MAPS_API_KEY=dein_api_key
```

Google Cloud Console → APIs & Services → Distance Matrix API aktivieren.
Ohne API Key funktioniert die manuelle km-Eingabe trotzdem.

### 6. Navigation erweitern

Im Dashboard-Layout neue Menüpunkte:
- 📋 Sachkosten → /sachkosten
- 🍽 Bewirtung → /bewirtung
- 🎫 BahnCard → /bahncard

### 7. Build + Deploy

```bash
git add -A
git commit -m "feat: Block A+B upgrades"
git push origin main

# Auf dem Server:
cd ~/dpsg-reisekosten
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Verpflegungspauschalen — Regeln

| Abwesenheit | Pauschale |
|---|---|
| ≤ 8 Stunden | 0 € |
| > 8 Stunden (eintägig) | 14 € |
| Anreisetag (mehrtägig) | 14 € |
| Ganzer Zwischentag | 28 € |
| Abreisetag (mehrtägig) | 14 € |

**Kürzungen bei gestellten Mahlzeiten:**
- Frühstück: −5,60 € (20% von 28 €)
- Mittagessen: −11,20 € (40% von 28 €)
- Abendessen: −11,20 € (40% von 28 €)

---

## Dateien-Übersicht

```
upgrades/
├── README.md                          ← diese Datei
├── prisma-additions.prisma            ← Schema-Ergänzungen
│
├── block-a/
│   ├── migration-block-a.sql          ← DB: Zeiten, Verpflegung, km, Signatur
│   ├── SignaturePad.tsx               → src/components/SignaturePad.tsx
│   ├── VerpflegungsSection.tsx        → src/components/VerpflegungsSection.tsx
│   ├── KilometerSection.tsx           → src/components/KilometerSection.tsx
│   ├── verpflegung.ts                → src/lib/verpflegung.ts
│   └── distance-route.ts             → src/app/api/distance/route.ts
│
└── block-b/
    ├── migration-block-b.sql          ← DB: Sachkosten, Bewirtung, BahnCard
    ├── generate_sachkosten.py         → pdf-generator/generate_sachkosten.py
    ├── generate_bewirtung.py          → pdf-generator/generate_bewirtung.py
    ├── generate_bahncard.py           → pdf-generator/generate_bahncard.py
    ├── sachkosten-route.ts            → src/app/api/sachkosten/route.ts
    ├── bewirtung-route.ts             → src/app/api/bewirtung/route.ts
    └── bahncard-route.ts              → src/app/api/bahncard/route.ts
```
