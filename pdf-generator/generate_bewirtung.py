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
