#!/usr/bin/env python3
"""Generates a filled, flattened Reisekostenabrechnung PDF."""
import sys, json, io, os, datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject

FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
if os.path.exists(FONT_PATH):
    pdfmetrics.registerFont(TTFont("DVSans", FONT_PATH))
    FONT = "DVSans"
else:
    FONT = "Helvetica"

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
TEMPLATE_PDF = os.path.join(TEMPLATE_DIR, "Reisekosten-DPSG-Gremienmitglieder_231115.pdf")

FIELDS = [
    ("lastName",       [111.4, 757.2, 396.8, 774.0], 10, "l"),
    ("firstName",      [111.4, 739.2, 396.8, 756.0], 10, "l"),
    ("street",         [111.4, 721.2, 396.8, 738.0], 10, "l"),
    ("zipCity",        [111.4, 703.2, 396.8, 720.0], 10, "l"),
    ("accountHolder",  [111.4, 685.2, 396.8, 702.0], 10, "l"),
    ("bank",           [111.4, 667.2, 396.8, 684.0], 10, "l"),
    ("iban",           [111.4, 649.4, 396.8, 666.2], 9, "l"),
    ("bic",            [111.4, 632.2, 261.4, 649.0], 9, "l"),
    ("startDate",      [117.3, 592.6, 207.1, 604.2], 9, "l"),
    ("startTime",      [209.1, 592.6, 298.9, 604.2], 9, "l"),
    ("endDate",        [371.6, 591.6, 461.4, 603.1], 9, "l"),
    ("endTime",        [463.4, 591.6, 553.1, 603.1], 9, "l"),
    ("route",          [119.0, 570.1, 551.8, 581.6], 7.5, "l"),
    ("purpose",        [118.7, 552.8, 551.5, 564.4], 9, "l"),
    ("licensePlate",   [334.3, 533.8, 391.1, 550.2], 9, "l"),
    ("km",             [178.6, 468.0, 220.2, 481.1], 10, "r"),
]

COST_FIELDS = [
    ([410.5, 484.1, 552.5, 497.7], "travel"),
    ([410.8, 468.1, 552.7, 481.7], "kmMoney"),
    ([410.6, 443.5, 553.4, 459.7], "lodging"),
    ([410.6, 420.7, 553.4, 437.0], "meals"),
    ([410.6, 398.2, 553.4, 414.4], "other"),
    ([410.3, 376.1, 553.1, 392.3], "subtotal"),
    ([410.6, 358.5, 553.4, 374.7], "reimbursement"),
    ([411.0, 341.2, 553.8, 357.4], "total"),
]

CHECKBOXES = {
    "bankKnown":   [300.4, 631.6, 306.8, 638.0],
    "dienstwagen": [117.1, 533.8, 123.5, 540.2],
    "auto":        [219.2, 533.8, 225.6, 540.2],
    "bahn":        [117.2, 521.0, 123.6, 527.5],
    "schiff":      [219.3, 521.0, 225.7, 527.5],
    "flugzeug":    [117.1, 507.9, 123.4, 514.3],
    "co2":         [219.2, 507.7, 225.6, 514.1],
}

DATUM_FIELD = [302.4, 207.8, 373.4, 224.6]
SIGN_LINE_Y = 207.8
SIGN_X = 383

def draw_checkmark(c, rect):
    x0, y0, x1, y1 = rect
    cx, cy = (x0+x1)/2, (y0+y1)/2
    sz = min(x1-x0, y1-y0) * 0.9
    c.setStrokeColor("#000000"); c.setLineWidth(1.2)
    c.line(cx-sz/3, cy, cx-sz/8, cy-sz/3)
    c.line(cx-sz/8, cy-sz/3, cx+sz/3, cy+sz/3)

def generate(data, output_path):
    p = data["profile"]
    t = data["trip"]
    costs = data["costs"]
    cbs = data.get("checkboxes", {})
    today = datetime.date.today().strftime("%d.%m.%Y")

    values = {
        "lastName": p["lastName"], "firstName": p["firstName"],
        "street": p.get("street",""), "zipCity": f"{p.get('zip','')} {p.get('city','')}",
        "accountHolder": p.get("accountHolder", f"{p['firstName']} {p['lastName']}"),
        "bank": p.get("bank",""), "iban": p.get("iban",""), "bic": p.get("bic",""),
        "startDate": t["startDate"], "startTime": t.get("startTime",""),
        "endDate": t.get("endDate", t["startDate"]), "endTime": t.get("endTime",""),
        "route": t.get("route",""), "purpose": t["purpose"],
        "licensePlate": t.get("licensePlate",""), "km": str(t.get("km", 0)),
    }

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    for key, rect, size, align in FIELDS:
        x0, y0, x1, y1 = rect
        c.setFont(FONT, size); c.setFillColor("#000000")
        val = values.get(key, "")
        if align == "r": c.drawRightString(x1-4, y0+2, val)
        else: c.drawString(x0+2, y0+2, val)

    for rect, key in COST_FIELDS:
        x0, y0, x1, y1 = rect
        c.setFont(FONT, 10); c.drawRightString(x1-4, y0+2, str(costs.get(key, "0,00")))

    c.setFont(FONT, 9); c.drawString(DATUM_FIELD[0]+2, DATUM_FIELD[1]+2, today)

    for key, rect in CHECKBOXES.items():
        if cbs.get(key, False): draw_checkmark(c, rect)

    sig = p.get("signaturePath")
    if sig and os.path.exists(sig):
        from PIL import Image
        si = Image.open(sig)
        sr = si.height / si.width
        sw, sh = 80, 80 * sr
        c.drawImage(ImageReader(sig), SIGN_X, SIGN_LINE_Y-(sh*0.15), width=sw, height=sh, mask='auto')

    c.save(); buf.seek(0)

    reader = PdfReader(TEMPLATE_PDF); overlay = PdfReader(buf)
    writer = PdfWriter(); page = reader.pages[0]
    if "/Annots" in page:
        na = [a for a in page["/Annots"] if str(a.get_object().get("/Subtype","")) != "/Widget"]
        if na: page["/Annots"] = ArrayObject(na)
        else: del page["/Annots"]
    page.merge_page(overlay.pages[0]); writer.add_page(page)
    with open(output_path, "wb") as f: writer.write(f)
    print(f"OK {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.json> <output.pdf>"); sys.exit(1)
    with open(sys.argv[1]) as f: data = json.load(f)
    generate(data, sys.argv[2])
