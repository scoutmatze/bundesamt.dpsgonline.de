#!/usr/bin/env python3
"""Generate Sachkostenabrechnung PDF.

Usage: generate_sachkosten.py <input.json> <output.pdf>

Input JSON:
{
  "name": "Mathias Meyer",
  "address": "Musterstr. 1, 12345 Musterstadt",
  "iban": "DE89370400440532013000",
  "bic": "COBADEFFXXX",
  "bank": "Commerzbank",
  "gremium": "Bundesleitung",
  "year": 2026,
  "quarter": 1,
  "items": [
    {"date": "15.01.2026", "description": "Druckerpatronen für Gremiensitzung", "amount": 34.99},
    {"date": "22.02.2026", "description": "Porto Einladungen BL-Sitzung", "amount": 12.80}
  ],
  "notes": "Optional: Hinweise",
  "signature_path": "/path/to/sig.png"
}
"""
import sys, json, io, os, datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FP = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FPB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
if os.path.exists(FP):
    pdfmetrics.registerFont(TTFont("DVSans", FP))
    pdfmetrics.registerFont(TTFont("DVSansB", FPB))
    FONT, FONTB = "DVSans", "DVSansB"
else:
    FONT, FONTB = "Helvetica", "Helvetica-Bold"

DPSG_BLUE = "#003056"
DPSG_RED = "#8b0a1e"


def generate(data, output_path):
    name = data["name"]
    items = data.get("items", [])
    sig = data.get("signature_path")
    notes = data.get("notes", "")
    today = datetime.date.today().strftime("%d.%m.%Y")
    q = data.get("quarter", 1)
    year = data.get("year", datetime.date.today().year)
    quarter_label = f"{q}. Quartal {year}"

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    # ── Header ──
    c.setFillColor(DPSG_RED)
    c.rect(0, h - 8, w, 8, fill=True, stroke=False)

    c.setFillColor(DPSG_BLUE)
    c.setFont(FONTB, 16)
    c.drawString(60, h - 50, "Sachkostenabrechnung")
    c.setFont(FONT, 11)
    c.setFillColor("#5c5850")
    c.drawString(60, h - 68, f"DPSG Bundesverband · {quarter_label}")

    y = h - 100

    # ── Persönliche Daten ──
    c.setFont(FONT, 9)
    c.setFillColor("#5c5850")
    fields = [
        ("Name:", name),
        ("Adresse:", data.get("address", "")),
        ("Gremium:", data.get("gremium", "")),
        ("IBAN:", data.get("iban", "")),
        ("BIC:", data.get("bic", "")),
        ("Bank:", data.get("bank", "")),
    ]
    for label, val in fields:
        c.setFont(FONTB, 9)
        c.drawString(60, y, label)
        c.setFont(FONT, 9)
        c.drawString(130, y, val)
        y -= 14
    y -= 10

    # ── Tabelle Header ──
    c.setStrokeColor("#d4d0c8")
    c.setFillColor(DPSG_BLUE)
    c.rect(55, y - 2, w - 110, 16, fill=True, stroke=False)
    c.setFillColor("#ffffff")
    c.setFont(FONTB, 9)
    c.drawString(60, y + 2, "NR.")
    c.drawString(90, y + 2, "DATUM")
    c.drawString(170, y + 2, "BESCHREIBUNG")
    c.drawRightString(w - 65, y + 2, "BETRAG")
    y -= 18

    # ── Items ──
    c.setFillColor("#1a1815")
    c.setFont(FONT, 10)
    total = 0
    for i, item in enumerate(items, 1):
        amt = item.get("amount", 0)
        total += amt

        # Zebra stripe
        if i % 2 == 0:
            c.setFillColor("#f5f3ef")
            c.rect(55, y - 4, w - 110, 16, fill=True, stroke=False)

        c.setFillColor("#1a1815")
        c.setFont(FONT, 10)
        c.drawString(60, y, str(i))
        c.drawString(90, y, item.get("date", ""))

        desc = item.get("description", "")
        # Truncate long descriptions
        if len(desc) > 55:
            desc = desc[:52] + "..."
        c.drawString(170, y, desc)
        c.drawRightString(w - 65, y, f"{amt:.2f} €".replace(".", ","))
        y -= 16

        if y < 120:
            c.showPage()
            y = h - 60

    # ── Summe ──
    y -= 4
    c.setStrokeColor(DPSG_BLUE)
    c.setLineWidth(1.5)
    c.line(350, y, w - 55, y)
    y -= 16
    c.setFont(FONTB, 11)
    c.setFillColor(DPSG_BLUE)
    c.drawString(350, y, "Gesamtsumme:")
    c.drawRightString(w - 65, y, f"{total:.2f} €".replace(".", ","))

    # ── Notes ──
    if notes and notes.strip():
        y -= 30
        c.setFont(FONTB, 9)
        c.setFillColor("#5c5850")
        c.drawString(60, y, "HINWEISE:")
        y -= 14
        c.setFont(FONT, 10)
        c.setFillColor("#1a1815")
        for line in simpleSplit(notes.strip(), FONT, 10, w - 120):
            c.drawString(60, y, line)
            y -= 14

    # ── Erklärung ──
    y -= 20
    c.setFont(FONT, 8)
    c.setFillColor("#7a756c")
    txt = "Ich versichere, dass die vorstehenden Angaben richtig und vollständig sind und die Ausgaben ausschließlich für satzungsgemäße Zwecke der DPSG verwendet wurden."
    for line in simpleSplit(txt, FONT, 8, w - 120):
        c.drawString(60, y, line)
        y -= 11

    # ── Unterschrift ──
    y -= 20
    c.setFont(FONT, 10)
    c.setFillColor("#1a1815")
    c.drawString(60, y, today)
    c.line(300, y - 2, 500, y - 2)
    c.setFont(FONT, 8)
    c.setFillColor("#7a756c")
    c.drawString(300, y - 14, name)
    c.drawString(300, y - 24, "Datum, Unterschrift")

    if sig and os.path.exists(sig):
        try:
            from PIL import Image
            si = Image.open(sig)
            sr = si.height / si.width
            sw, sh = 80, 80 * sr
            c.drawImage(ImageReader(sig), 360, y - 2 - (sh * 0.15), width=sw, height=sh, mask='auto')
        except:
            pass

    # ── Footer ──
    c.setFillColor(DPSG_RED)
    c.rect(0, 0, w, 6, fill=True, stroke=False)
    c.setFont(FONT, 7)
    c.setFillColor("#9e9a92")
    c.drawString(60, 12, f"© Bundesamt Sankt Georg e.V. · Sachkostenabrechnung {quarter_label}")

    c.save()
    buf.seek(0)
    with open(output_path, "wb") as f:
        f.write(buf.getvalue())


if __name__ == "__main__":
    with open(sys.argv[1]) as f:
        data = json.load(f)
    generate(data, sys.argv[2])
