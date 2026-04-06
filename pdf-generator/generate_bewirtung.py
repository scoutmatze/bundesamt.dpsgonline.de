#!/usr/bin/env python3
"""Generate Bewirtungsaufwendungen by overlaying data onto the original DPSG PDF template."""
import sys, json, io, os, datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from pypdf import PdfWriter, PdfReader

FP="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
if os.path.exists(FP):pdfmetrics.registerFont(TTFont("DVSans",FP));FONT="DVSans"
else:FONT="Helvetica"

TEMPLATE="/app/pdf-generator/templates/Sachkosten-DPSG-Bewirtungsaufwendungen_231115.pdf"

# Field positions [x, y] (reportlab coordinates, y from bottom)
FIELDS = {
    "ort":     (57, 672),   # "undefined" = Ort
    "tag1":    (201, 686),  # "1" = Tag row 1
    "tag2":    (201, 672),  # "2" = Tag row 2
    # Bewirtete Personen 1-17, each ~13.3pt apart starting at y=633
    "datum":   (73, 164),   # Text3
    "datum2":  (219, 164),  # Text4
}

# Bewirtete Personen: 17 rows, starting at y_bottom=630.7, spacing ~13.3
PERSONEN_START_Y = 633
PERSONEN_SPACING = 13.3
PERSONEN_X = 57

# Anlass: 3 rows starting at y=379
ANLASS_Y = [382, 368, 355]
ANLASS_X = 57

# Checkboxes
CB_GASTSTAETTE = (57, 296)  # Kontrollkästchen2
CB_ANDERE = (303, 296)      # Kontrollkästchen1

# Beträge (unnamed fields with "?" - at y~257)
BETRAG_GASTSTAETTE = (71, 257)   # rect [65.7, 254.6, 229.1, 267.8]
BETRAG_ANDERE = (313, 257)       # rect [311.5, 254.6, 475.0, 267.8]

def generate(data, output_path):
    name = data.get("name", "")
    sig = data.get("signature_path")
    today = datetime.date.today().strftime("%d.%m.%Y")
    bew_date = data.get("date", today)
    location = data.get("location", "")
    occasion = data.get("occasion", "")
    participants = data.get("participants", [])
    amt_food = data.get("amount_food", 0)
    amt_drinks = data.get("amount_drinks", 0)
    amt_tip = data.get("amount_tip", 0)
    amt_total = amt_food + amt_drinks + amt_tip

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setFont(FONT, 9)

    # Ort der Bewirtung
    c.drawString(FIELDS["ort"][0], FIELDS["ort"][1], location)

    # Tag der Bewirtung
    c.drawString(FIELDS["tag1"][0], FIELDS["tag1"][1], bew_date)

    # Bewirtete Personen (max 17)
    for i, p in enumerate(participants):
        if i >= 17: break
        y = PERSONEN_START_Y - (i * PERSONEN_SPACING)
        p_name = p.get("name", "") if isinstance(p, dict) else str(p)
        p_role = p.get("role", "") if isinstance(p, dict) else ""
        text = f"{p_name}" + (f" ({p_role})" if p_role else "")
        c.drawString(PERSONEN_X, y, text)

    # Add host as last person
    host_idx = len(participants)
    if host_idx < 17:
        y = PERSONEN_START_Y - (host_idx * PERSONEN_SPACING)
        host = data.get("host_name") or name
        c.drawString(PERSONEN_X, y, f"{host} (bewirtende Person)")

    # Anlass der Bewirtung (max 3 lines, ~65 chars per line)
    words = occasion.split()
    lines = []
    current = ""
    for w in words:
        if len(current + " " + w) > 70:
            lines.append(current)
            current = w
        else:
            current = (current + " " + w).strip()
    if current: lines.append(current)

    for i, line in enumerate(lines[:3]):
        c.drawString(ANLASS_X, ANLASS_Y[i], line)

    # Checkbox: Gaststätte
    c.setFont(FONT, 10)
    c.drawString(CB_GASTSTAETTE[0], CB_GASTSTAETTE[1], "✓")
    c.setFont(FONT, 9)

    # Betrag
    total_str = f"{amt_total:.2f} €".replace(".", ",")
    c.drawString(BETRAG_GASTSTAETTE[0], BETRAG_GASTSTAETTE[1], total_str)

    # Datum + Ort
    c.drawString(FIELDS["datum"][0], FIELDS["datum"][1], f"{data.get('gremium', '')} / {location}")
    c.drawString(FIELDS["datum2"][0], FIELDS["datum2"][1], today)

    # Signature
    if sig and os.path.exists(sig):
        try:
            from PIL import Image
            si = Image.open(sig)
            sr = si.height / si.width
            sw, sh = 70, 70 * sr
            c.drawImage(ImageReader(sig), 380, 155, width=sw, height=sh, mask='auto')
        except: pass

    c.save()
    buf.seek(0)

    # Merge overlay onto template
    template = PdfReader(TEMPLATE)
    overlay = PdfReader(buf)
    writer = PdfWriter()

    page = template.pages[0]
    page.merge_page(overlay.pages[0])
    writer.add_page(page)

    # Flatten
    try:
        for page in writer.pages:
            if "/Annots" in page:
                del page["/Annots"]
    except: pass

    with open(output_path, "wb") as f:
        writer.write(f)

if __name__ == "__main__":
    with open(sys.argv[1]) as f: data = json.load(f)
    generate(data, sys.argv[2])
