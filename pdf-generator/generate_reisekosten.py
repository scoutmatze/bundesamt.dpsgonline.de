#!/usr/bin/env python3
"""
Generates a filled, flattened Reisekostenabrechnung PDF.

Usage:
    python generate_reisekosten.py <input.json> <output.pdf>

The input JSON must contain: profile, trip, costs, checkboxes.
See PDF-GENERATOR.md for the full schema.
"""

import sys
import json
import io
import os
import datetime

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject

# Register font with umlaut support
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
if os.path.exists(FONT_PATH):
    pdfmetrics.registerFont(TTFont("DVSans", FONT_PATH))
    FONT = "DVSans"
else:
    FONT = "Helvetica"

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
TEMPLATE_PDF = os.path.join(TEMPLATE_DIR, "Reisekosten-DPSG-Gremienmitglieder_231115.pdf")

# ─── Field mapping: [x0, y0, x1, y1] in PDF coordinates (y=0 at bottom) ───
FIELDS = {
    "name":         {"rect": [111.4, 757.2, 396.8, 774.0], "size": 10},
    "firstName":    {"rect": [111.4, 739.2, 396.8, 756.0], "size": 10},
    "street":       {"rect": [111.4, 721.2, 396.8, 738.0], "size": 10},
    "zipCity":      {"rect": [111.4, 703.2, 396.8, 720.0], "size": 10},
    "accountHolder":{"rect": [111.4, 685.2, 396.8, 702.0], "size": 10},
    "bank":         {"rect": [111.4, 667.2, 396.8, 684.0], "size": 10},
    "iban":         {"rect": [111.4, 649.4, 396.8, 666.2], "size": 9},
    "bic":          {"rect": [111.4, 632.2, 261.4, 649.0], "size": 9},
    "startDate":    {"rect": [117.3, 592.6, 207.1, 604.2], "size": 9},
    "startTime":    {"rect": [209.1, 592.6, 298.9, 604.2], "size": 9},
    "endDate":      {"rect": [371.6, 591.6, 461.4, 603.1], "size": 9},
    "endTime":      {"rect": [463.4, 591.6, 553.1, 603.1], "size": 9},
    "route":        {"rect": [119.0, 570.1, 551.8, 581.6], "size": 7.5},
    "purpose":      {"rect": [118.7, 552.8, 551.5, 564.4], "size": 9},
    "licensePlate": {"rect": [334.3, 533.8, 391.1, 550.2], "size": 9},
    "km":           {"rect": [178.6, 468.0, 220.2, 481.1], "size": 10, "align": "right"},
}

COST_FIELDS = [
    {"rect": [410.5, 484.1, 552.5, 497.7], "key": "travel"},
    {"rect": [410.8, 468.1, 552.7, 481.7], "key": "kmMoney"},
    {"rect": [410.6, 443.5, 553.4, 459.7], "key": "lodging"},
    {"rect": [410.6, 420.7, 553.4, 437.0], "key": "meals"},
    {"rect": [410.6, 398.2, 553.4, 414.4], "key": "other"},
    {"rect": [410.3, 376.1, 553.1, 392.3], "key": "subtotal"},
    {"rect": [410.6, 358.5, 553.4, 374.7], "key": "reimbursement"},
    {"rect": [411.0, 341.2, 553.8, 357.4], "key": "total"},
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

DATUM_FIELD = {"rect": [302.4, 207.8, 373.4, 224.6], "size": 9}
SIGN_LINE_Y = 207.8
SIGN_X = 383


def fmt(value):
    """Format number as German decimal string."""
    if isinstance(value, (int, float)):
        return f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return str(value)


def draw_checkmark(c, rect):
    x0, y0, x1, y1 = rect
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    sz = min(x1 - x0, y1 - y0) * 0.9
    c.setStrokeColor("#000000")
    c.setLineWidth(1.2)
    c.line(cx - sz / 3, cy, cx - sz / 8, cy - sz / 3)
    c.line(cx - sz / 8, cy - sz / 3, cx + sz / 3, cy + sz / 3)


def generate(data: dict, output_path: str):
    profile = data["profile"]
    trip = data["trip"]
    costs = data["costs"]
    checkboxes = data.get("checkboxes", {})
    today = datetime.date.today().strftime("%d.%m.%Y")

    # Map data to fields
    values = {
        "name": profile["lastName"],
        "firstName": profile["firstName"],
        "street": profile.get("street", ""),
        "zipCity": f"{profile.get('zip', '')} {profile.get('city', '')}",
        "accountHolder": profile.get("accountHolder", f"{profile['firstName']} {profile['lastName']}"),
        "bank": profile.get("bank", ""),
        "iban": profile.get("iban", ""),
        "bic": profile.get("bic", ""),
        "startDate": trip["startDate"],
        "startTime": trip.get("startTime", ""),
        "endDate": trip.get("endDate", trip["startDate"]),
        "endTime": trip.get("endTime", ""),
        "route": trip.get("route", ""),
        "purpose": trip["purpose"],
        "licensePlate": trip.get("licensePlate", ""),
        "km": str(trip.get("km", 0)),
    }

    # Create overlay
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    # Text fields
    for key, field in FIELDS.items():
        x0, y0, x1, y1 = field["rect"]
        c.setFont(FONT, field["size"])
        c.setFillColor("#000000")
        val = values.get(key, "")
        if field.get("align") == "right":
            c.drawRightString(x1 - 4, y0 + 2, val)
        else:
            c.drawString(x0 + 2, y0 + 2, val)

    # Cost fields (right-aligned)
    for cf in COST_FIELDS:
        x0, y0, x1, y1 = cf["rect"]
        c.setFont(FONT, 10)
        c.drawRightString(x1 - 4, y0 + 2, fmt(costs.get(cf["key"], 0)))

    # Datum (Verzichtsspende)
    c.setFont(FONT, 9)
    c.drawString(DATUM_FIELD["rect"][0] + 2, DATUM_FIELD["rect"][1] + 2, today)

    # Checkboxes
    for key, rect in CHECKBOXES.items():
        if checkboxes.get(key, False):
            draw_checkmark(c, rect)

    # Signature
    sig_path = profile.get("signaturePath")
    if sig_path and os.path.exists(sig_path):
        from PIL import Image
        sig_img = Image.open(sig_path)
        sig_ratio = sig_img.height / sig_img.width
        sig_w = 80
        sig_h = sig_w * sig_ratio
        sig_y = SIGN_LINE_Y - (sig_h * 0.15)
        c.drawImage(ImageReader(sig_path), SIGN_X, sig_y,
                    width=sig_w, height=sig_h, mask='auto')

    c.save()
    buf.seek(0)

    # Merge overlay onto original + flatten
    reader = PdfReader(TEMPLATE_PDF)
    overlay = PdfReader(buf)
    writer = PdfWriter()

    page = reader.pages[0]
    if "/Annots" in page:
        non_widgets = [a for a in page["/Annots"]
                       if str(a.get_object().get("/Subtype", "")) != "/Widget"]
        if non_widgets:
            page["/Annots"] = ArrayObject(non_widgets)
        else:
            del page["/Annots"]

    page.merge_page(overlay.pages[0])
    writer.add_page(page)

    with open(output_path, "wb") as f:
        writer.write(f)

    print(f"✓ {output_path}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.json> <output.pdf>")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        data = json.load(f)

    generate(data, sys.argv[2])
