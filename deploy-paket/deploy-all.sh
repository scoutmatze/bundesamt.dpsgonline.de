#!/bin/bash
# ══════════════════════════════════════════════════════
# DPSG Reisekosten — Deploy-Paket: Alle offenen Punkte
# Auf dem Server ausführen: bash deploy-all.sh
# ══════════════════════════════════════════════════════
set -e
cd ~/dpsg-reisekosten

echo "═══ 1/6: Posteingang Fix (Email-Poller) ═══"

# Fix: execSync import prüfen und dynamischen Import ersetzen
python3 << 'PYEOF'
with open("scripts/poll-emails.mjs") as f:
    c = f.read()

# Ensure execSync is imported
lines = c.split('\n')
has_exec = any('execSync' in l and 'import' in l for l in lines[:15])
if not has_exec:
    for i, l in enumerate(lines):
        if l.startswith('import ') and 'child_process' not in c.split('\n')[i]:
            pass
    # Add after randomBytes import
    for i, l in enumerate(lines):
        if 'randomBytes' in l and 'import' in l:
            lines.insert(i+1, 'import { execSync } from "child_process";')
            print("  ✓ Added execSync import")
            break
    c = '\n'.join(lines)

# Fix dynamic import
if 'await import("child_process")' in c:
    old_line = None
    for i, l in enumerate(c.split('\n')):
        if 'await import("child_process")' in l:
            old_line = l
            break
    if old_line:
        new_line = '            try{preview=execSync(`python3 -c "import pdfplumber\\nwith pdfplumber.open(\'${fp}\') as pdf:\\n  for p in pdf.pages[:1]:\\n    t=p.extract_text()\\n    if t: print(t[:500])"`,{timeout:10000}).toString().trim()}catch{}'
        c = c.replace(old_line, new_line)
        print("  ✓ Fixed dynamic import → execSync")
else:
    print("  ○ Already fixed or not found")

with open("scripts/poll-emails.mjs", "w") as f:
    f.write(c)
PYEOF

echo ""
echo "═══ 2/6: Gremium-Feld im Profil ═══"

# DB already has gremium column (from earlier migration)
# Add to Prisma schema if not there
if ! grep -q "gremium" prisma/schema.prisma; then
    sed -i '/bank.*String?/a\  gremium       String?' prisma/schema.prisma
    echo "  ✓ Added gremium to Prisma schema"
else
    echo "  ○ Already in schema"
fi

# Add gremium to Profil page
if ! grep -q "gremium\|Gremium" src/app/\(dashboard\)/profil/page.tsx; then
    # Find the city field and add gremium after it
    sed -i '/inp.*Stadt.*city/a\          {inp("Gremium","gremium",{placeholder:"z.B. Bundesleitung, AG Finanzen..."})}' src/app/\(dashboard\)/profil/page.tsx
    echo "  ✓ Added Gremium field to profile UI"
else
    echo "  ○ Already in profile"
fi

# Add gremium to profile API save
if ! grep -q "gremium" src/app/api/profil/route.ts 2>/dev/null; then
    # Find where other fields are saved and add gremium
    sed -i 's/bank: data.bank,/bank: data.bank,\n      gremium: data.gremium,/' src/app/api/profil/route.ts 2>/dev/null || true
    echo "  ✓ Added gremium to profile API"
fi

# Pass gremium to all PDF generators
for route in src/app/api/bewirtung/pdf/route.ts src/app/api/sachkosten/pdf/route.ts src/app/api/bahncard/pdf/route.ts; do
    if [ -f "$route" ] && grep -q 'gremium: ""' "$route"; then
        sed -i 's/gremium: "",/gremium: user.gremium || "",/' "$route"
        echo "  ✓ Gremium in $(basename $(dirname $route)) PDF"
    fi
done

echo ""
echo "═══ 3/6: Canvas-Signatur im Profil ═══"

# Check if SignaturePad is already imported in profil
if ! grep -q "SignaturePad" src/app/\(dashboard\)/profil/page.tsx; then
    # Add import
    sed -i '1 a\import SignaturePad from "@/components/SignaturePad";' src/app/\(dashboard\)/profil/page.tsx

    # Add signatureData to the user state and save logic
    # We need to add the canvas signature section after the existing signature upload
    # First, let's find where the signature section is
    if grep -q "Unterschrift\|signature\|signatur" src/app/\(dashboard\)/profil/page.tsx; then
        echo "  ✓ Added SignaturePad import (manual integration needed for canvas)"
    fi
fi

# Save signatureData via API
if ! grep -q "signatureData" src/app/api/profil/route.ts 2>/dev/null; then
    sed -i 's/gremium: data.gremium,/gremium: data.gremium,\n      signatureData: data.signatureData,/' src/app/api/profil/route.ts 2>/dev/null || true
fi

# Create a signature-data API endpoint for canvas save
mkdir -p src/app/api/signature-data
cat > src/app/api/signature-data/route.ts << 'SIGEOF'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { writeFileSync, mkdirSync, existsSync } from "fs";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { sessionToken: token }, include: { user: true } });
  if (!session || session.expires < new Date()) return null;
  return session.user;
}

// POST: Save canvas signature as PNG file
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dataUrl } = await req.json();
  if (!dataUrl || !dataUrl.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "Invalid signature data" }, { status: 400 });
  }

  const sigDir = "/app/uploads/signatures";
  if (!existsSync(sigDir)) mkdirSync(sigDir, { recursive: true });

  const sigPath = `${sigDir}/${user.id}_canvas.png`;
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
  writeFileSync(sigPath, Buffer.from(base64Data, "base64"));

  await prisma.user.update({
    where: { id: user.id },
    data: { signaturePath: sigPath, signatureData: dataUrl },
  });

  return NextResponse.json({ ok: true, path: sigPath });
}

// GET: Get current signature data URL
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ signatureData: user.signatureData || null, signaturePath: user.signaturePath || null });
}
SIGEOF
echo "  ✓ Created signature-data API"

echo ""
echo "═══ 4/6: Bewirtung PDF Feintuning (Ort/Datum Fix) ═══"

# Fix: Ort und Tag der Bewirtung waren vertauscht
cat > pdf-generator/generate_bewirtung.py << 'PYEOF'
#!/usr/bin/env python3
"""Generate Bewirtungsaufwendungen by overlaying data onto the original DPSG PDF template."""
import sys, json, io, os, datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader, simpleSplit
from pypdf import PdfWriter, PdfReader

FP="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
if os.path.exists(FP):pdfmetrics.registerFont(TTFont("DVSans",FP));FONT="DVSans"
else:FONT="Helvetica"

TEMPLATE="/app/pdf-generator/templates/Sachkosten-DPSG-Bewirtungsaufwendungen_231115.pdf"

# Annotation rects from the template:
# "undefined"          rect=[ 55.8, 669.7, 193.2, 682.9]  → Tag d. Bewirtung (Ort column)
# "1"                  rect=[199.2, 683.5, 550.7, 696.7]  → Ort d. Bewirtung row 1
# "2"                  rect=[199.2, 669.7, 550.7, 682.9]  → Ort d. Bewirtung row 2
# "Bewirtete Personen 1-17" starting at y=630.7, spacing ~13.3
# "Anlass der Bewirtung 1-3" at y=379.3, 365.6, 352.0
# Kontrollkästchen2   rect=[ 55.7, 293.8,  62.3, 300.3]  → Bei Bewirtung in Gaststätten
# Kontrollkästchen1   rect=[301.7, 293.7, 308.4, 300.2]  → Bei anderen Bewirtungen
# Two unnamed fields at y~257: Beträge
# Text3               rect=[ 71.7, 161.7, 184.0, 183.7]  → Ort+Datum links
# Text4               rect=[217.3, 161.2, 308.1, 183.2]  → Datum rechts

def generate(data, output_path):
    name = data.get("name", "")
    sig = data.get("signature_path")
    notes = data.get("notes", "")
    today = datetime.date.today().strftime("%d.%m.%Y")
    bew_date = data.get("date", today)
    location = data.get("location", "")
    occasion = data.get("occasion", "")
    participants = data.get("participants", [])
    gremium = data.get("gremium", "")
    host_name = data.get("host_name") or name
    amt_food = data.get("amount_food", 0)
    amt_drinks = data.get("amount_drinks", 0)
    amt_tip = data.get("amount_tip", 0)
    amt_total = amt_food + amt_drinks + amt_tip

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setFont(FONT, 9)

    # ── Tag der Bewirtung (left column, "undefined" field) ──
    c.drawString(57, 672, bew_date)

    # ── Ort der Bewirtung (right column, fields "1" and "2") ──
    # Split location across 2 lines if needed
    if len(location) > 50:
        c.drawString(201, 686, location[:50])
        c.drawString(201, 672, location[50:100])
    else:
        c.drawString(201, 686, location)

    # ── Bewirtete Personen (17 rows, y starts at ~633, spacing ~13.3) ──
    person_y = 633
    person_spacing = 13.3
    idx = 0
    for p in participants:
        if idx >= 16: break  # Leave room for host
        p_name = p.get("name", "") if isinstance(p, dict) else str(p)
        p_role = p.get("role", "") if isinstance(p, dict) else ""
        text = f"{p_name}" + (f" ({p_role})" if p_role else "")
        c.drawString(57, person_y - (idx * person_spacing), text)
        idx += 1

    # Host (bewirtende Person)
    if idx < 17:
        c.drawString(57, person_y - (idx * person_spacing), f"{host_name} (bewirtende Person)")

    # ── Anlass der Bewirtung (3 rows at y=382, 368, 355) ──
    anlass_lines = []
    words = occasion.split()
    current = ""
    for w in words:
        if len(current + " " + w) > 75:
            anlass_lines.append(current)
            current = w
        else:
            current = (current + " " + w).strip()
    if current:
        anlass_lines.append(current)

    anlass_y = [382, 368, 355]
    for i, line in enumerate(anlass_lines[:3]):
        c.drawString(57, anlass_y[i], line)

    # ── Checkbox: Bei Bewirtung in Gaststätten ──
    c.setFont(FONT, 10)
    c.drawString(57, 296, "✓")
    c.setFont(FONT, 9)

    # ── Betrag (Gaststätten-Feld, rect [65.7, 254.6, 229.1, 267.8]) ──
    total_str = f"{amt_total:.2f} €".replace(".", ",")
    c.drawString(71, 257, total_str)

    # Detail if space
    if amt_food or amt_drinks or amt_tip:
        detail = []
        if amt_food: detail.append(f"Speisen: {amt_food:.2f}€".replace(".",","))
        if amt_drinks: detail.append(f"Getränke: {amt_drinks:.2f}€".replace(".",","))
        if amt_tip: detail.append(f"Trinkgeld: {amt_tip:.2f}€".replace(".",","))
        c.setFont(FONT, 7)
        c.drawString(71, 247, " · ".join(detail))
        c.setFont(FONT, 9)

    # ── Notes (between amount and signature) ──
    if notes and notes.strip():
        y = 230
        c.setFont(FONT, 7)
        c.setFillColor("#7a756c")
        c.drawString(57, y, f"Hinweis: {notes[:120]}")
        c.setFillColor("#1a1815")
        c.setFont(FONT, 9)

    # ── Ort + Datum unten (Text3 + Text4) ──
    c.drawString(73, 170, location[:30])
    c.drawString(219, 170, today)

    # ── Unterschrift ──
    if sig and os.path.exists(sig):
        try:
            from PIL import Image
            si = Image.open(sig)
            sr = si.height / si.width
            sw, sh = 70, 70 * sr
            # Signature field is at right side, above the line at y~162
            c.drawImage(ImageReader(sig), 380, 162, width=sw, height=sh, mask='auto')
        except:
            pass

    c.save()
    buf.seek(0)

    # Merge overlay onto template
    template = PdfReader(TEMPLATE)
    overlay = PdfReader(buf)
    writer = PdfWriter()

    page = template.pages[0]
    page.merge_page(overlay.pages[0])
    writer.add_page(page)

    # Flatten (remove editable fields)
    try:
        for pg in writer.pages:
            if "/Annots" in pg:
                del pg["/Annots"]
    except:
        pass

    with open(output_path, "wb") as f:
        writer.write(f)


if __name__ == "__main__":
    with open(sys.argv[1]) as f:
        data = json.load(f)
    generate(data, sys.argv[2])
PYEOF
echo "  ✓ Bewirtung PDF generator updated (Ort/Datum fix)"

echo ""
echo "═══ 5/6: Sachkosten PDF Feintuning ═══"

# The Sachkosten generator looks correct based on field positions.
# Let's do a quick test to verify
cat > /tmp/test_sk.json << 'TESTEOF'
{
  "name": "Mathias Meyer",
  "address": "Musterstr. 1, 12345 Musterstadt",
  "iban": "DE89370400440532013000",
  "bic": "COBADEFFXXX",
  "bank": "Commerzbank",
  "gremium": "Bundesleitung",
  "year": 2026,
  "quarter": 2,
  "items": [
    {"date": "08.04.2026", "description": "Druckerpatronen", "amount": 50.00},
    {"date": "08.04.2026", "description": "Handyabrechnung", "amount": 20.00}
  ],
  "notes": "Test Sachkosten",
  "signature_path": null
}
TESTEOF

docker compose -f docker-compose.prod.yml exec -T app python3 /app/pdf-generator/generate_sachkosten.py /dev/stdin /tmp/test_sk_out.pdf < /tmp/test_sk.json 2>&1 && echo "  ✓ Sachkosten PDF generation OK" || echo "  ✗ Sachkosten PDF generation FAILED"

echo ""
echo "═══ 6/6: Verpflegungspauschalen in Reise-Detail ═══"

# The verpflegung.ts lib exists. We need to integrate it into the trip detail page.
# This requires start/end times which are already in the Trip model.
# For now, we add a simple display section that calculates based on existing times.

# Check if VerpflegungsSection is already in the trip detail
if ! grep -q "Verpflegung.*pauschale\|verpflegung" src/app/\(dashboard\)/reisen/\[id\]/page.tsx; then
    # Add verpflegung calculation after km section, before notes
    # We'll add a simple auto-calculated display
    sed -i '/<label style={{display:"block",fontSize:12,fontWeight:600,color:"#5c5850",textTransform:"uppercase",letterSpacing:0.6,marginBottom:8}}>Hinweise für Buchhaltung/i\
      {trip.startTime && trip.endTime && (\
      <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",border:"1px solid #d4d0c8",marginBottom:16}}>\
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>\
          <label style={{fontSize:12,fontWeight:600,color:"#5c5850",textTransform:"uppercase",letterSpacing:0.6}}>Verpflegungspauschale</label>\
          <span style={{fontSize:13,color:"#7a756c"}}>{(()=>{\
            const s=new Date(`${trip.startDate?.split("T")[0]}T${trip.startTime}`);\
            const e=new Date(`${(trip.endDate||trip.startDate)?.split("T")[0]}T${trip.endTime}`);\
            const days=Math.ceil((e.getTime()-s.getTime())/(1000*60*60*24));\
            const hours=(e.getTime()-s.getTime())/(1000*60*60);\
            if(days<=0&&hours<=8)return "Abwesenheit ≤ 8h — keine Pauschale";\
            if(days<=0&&hours>8)return `${hours.toFixed(1)}h Abwesenheit → 14,00 €`;\
            const anreise=14;const abreise=14;const zwischen=(days-1)*28;\
            const total=anreise+abreise+zwischen;\
            return `${days+1} Tage → ${total.toFixed(2).replace(".",",")} € (${anreise}+${zwischen>0?zwischen+"+(Zwischentage) ":""}${abreise})`;\
          })()}</span>\
        </div>\
        <p style={{fontSize:11,color:"#9e9a92",margin:"6px 0 0"}}>Anreisetag: 14 € · Ganzer Tag: 28 € · Abreisetag: 14 € — Kürzungen bei gestellten Mahlzeiten nicht berücksichtigt</p>\
      </div>)}\
' src/app/\(dashboard\)/reisen/\[id\]/page.tsx
    echo "  ✓ Verpflegungspauschale section added"
else
    echo "  ○ Already present"
fi

echo ""
echo "═══ Build ═══"
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "═══ Commit ═══"
git add -A
git commit -m "feat: Posteingang-Fix, Gremium, Canvas-Signatur API, Bewirtung PDF fix, Verpflegung"
git push origin main

echo ""
echo "════════════════════════════════════════"
echo "✅ DEPLOY COMPLETE"
echo "════════════════════════════════════════"
echo ""
echo "Teste:"
echo "  1. Posteingang: Nicht-DB-Mail weiterleiten → Sync → erscheint im Posteingang"
echo "  2. Profil: Gremium-Feld sollte sichtbar sein"
echo "  3. Bewirtung PDF: Ort/Datum korrekt"
echo "  4. Reise mit Zeiten: Verpflegungspauschale wird angezeigt"
echo ""
echo "Noch manuell zu machen:"
echo "  - Canvas-Signatur Widget in Profil-Seite einbinden (sed zu fragil)"
echo "  - Sachkosten PDF Positionen prüfen (Test-PDF generiert)"
