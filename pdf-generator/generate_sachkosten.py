#!/usr/bin/env python3
"""Generate Sachkostenabrechnung by overlaying data onto the original DPSG PDF template."""
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

TEMPLATE="/app/pdf-generator/templates/Sachkosten-DPSG-Abrechnungsformular_231115.pdf"

# Field positions from annotation rects [x0, y_bottom, x1, y_top]
# reportlab y=0 is bottom, PDF rect y is from bottom
FIELDS = {
    "year":       (199, 789),  # "Sachkostenabrechnung im" field
    "quarter":    (266, 789),
    "name":       (113, 760),  # "undefined" = Nachname
    "vorname":    (113, 742),
    "strasse":    (113, 724),
    "plz_ort":    (113, 707),
    "kontoinhaber":(113, 689),
    "bank":       (113, 671),
    "iban":       (113, 653),
    "bic":        (113, 636),
    "betrifft":   (206, 600),
    # Items: a1-a8 = description, b1-b10 = amount
    # b1=Telefon (y=557), b2=Porto (y=540), a1/b3 (y=523), a2/b4 (y=506)...
    "b1": (412, 557),  # Telefon amount
    "b2": (412, 540),  # Porto amount
    # a1-a8: free text items (rows 3-10)
    "a1": (64, 523), "b3": (412, 523),
    "a2": (64, 506), "b4": (412, 506),
    "a3": (64, 489), "b5": (412, 489),
    "a4": (64, 472), "b6": (412, 472),
    "a5": (64, 455), "b7": (412, 455),
    "a6": (64, 438), "b8": (412, 438),
    "a7": (64, 421), "b9": (412, 421),
    "a8": (68, 404), "b10": (412, 404),
    "summe":    (412, 387),
    "endsumme": (412, 345),
    "datum":    (304, 231),
}

CHECKBOXES = {
    "bankverbindung": (302, 634),  # Kontrollkästchen2
    "dpsg":     (54, 260),  # Kontrollkästchen21
    "solidar":  (54, 248),  # 22
    "stiftung": (54, 235),  # 23
    "jahresaktion": (54, 223),  # 24
    "bar":      (390, 259),  # 25
}

def generate(data, output_path):
    name = data.get("name", "")
    items = data.get("items", [])
    sig = data.get("signature_path")
    today = datetime.date.today().strftime("%d.%m.%Y")

    # Split name into last/first
    parts = name.split()
    vorname = parts[0] if len(parts) > 0 else ""
    nachname = " ".join(parts[1:]) if len(parts) > 1 else ""

    # Create overlay
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setFont(FONT, 10)

    def txt(key, value):
        if key in FIELDS and value:
            x, y = FIELDS[key]
            c.drawString(x, y, str(value))

    def amt(key, value):
        if key in FIELDS and value:
            x, y = FIELDS[key]
            c.drawRightString(x + 140, y, f"{value:.2f}".replace(".", ","))

    def check(key):
        if key in CHECKBOXES:
            x, y = CHECKBOXES[key]
            c.setFont(FONT, 10)
            c.drawString(x, y, "✓")
            c.setFont(FONT, 10)

    txt("year", data.get("year", ""))
    txt("quarter", f"{data.get('quarter', '')}.")
    txt("name", nachname)
    txt("vorname", vorname)
    txt("strasse", data.get("address", "").split(",")[0] if data.get("address") else "")
    plz_city = data.get("address", "").split(",")[1].strip() if "," in data.get("address", "") else ""
    txt("plz_ort", plz_city)
    txt("kontoinhaber", name)
    txt("bank", data.get("bank", ""))
    txt("iban", data.get("iban", ""))
    txt("bic", data.get("bic", ""))
    txt("betrifft", data.get("gremium", ""))
    check("bankverbindung")

    # Items
    total = 0
    for i, item in enumerate(items):
        if i >= 8: break  # max 8 free items (rows 3-10)
        desc = item.get("description", "")
        amount = item.get("amount", 0)
        total += amount
        a_key = f"a{i+1}"
        b_key = f"b{i+3}"  # b3 through b10
        date_str = item.get("date", "")
        txt(a_key, f"{date_str}  {desc}" if date_str else desc)
        amt(b_key, amount)

    amt("summe", total)
    amt("endsumme", total)
    txt("datum", today)

    # Signature
    if sig and os.path.exists(sig):
        try:
            from PIL import Image
            si = Image.open(sig)
            sr = si.height / si.width
            sw, sh = 70, 70 * sr
            c.drawImage(ImageReader(sig), 400, 220, width=sw, height=sh, mask='auto')
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

    # Add page 2 (Anschreiben) if exists
    if len(template.pages) > 1:
        writer.add_page(template.pages[1])

    # Flatten (remove editable fields)
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
