#!/usr/bin/env python3
"""Generate Bewirtungsaufwendungen PDF.

Usage: generate_bewirtung.py <input.json> <output.pdf>

Input JSON:
{
  "name": "Mathias Meyer",
  "gremium": "Bundesleitung",
  "date": "15.03.2026",
  "location": "Restaurant Zum Pfadfinder, Mönchengladbach",
  "occasion": "Arbeitstreffen AG Finanzen zur Vorbereitung der Bundesversammlung",
  "participants": [
    {"name": "Max Mustermann", "role": "AG-Leiter"},
    {"name": "Erika Muster", "role": "Schatzmeisterin"}
  ],
  "amount_food": 78.50,
  "amount_drinks": 24.00,
  "amount_tip": 10.00,
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
    sig = data.get("signature_path")
    notes = data.get("notes", "")
    today = datetime.date.today().strftime("%d.%m.%Y")

    amt_food = data.get("amount_food", 0)
    amt_drinks = data.get("amount_drinks", 0)
    amt_tip = data.get("amount_tip", 0)
    amt_total = amt_food + amt_drinks + amt_tip

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    # ── Header ──
    c.setFillColor(DPSG_RED)
    c.rect(0, h - 8, w, 8, fill=True, stroke=False)

    c.setFillColor(DPSG_BLUE)
    c.setFont(FONTB, 16)
    c.drawString(60, h - 50, "Bewirtungsaufwendungen")
    c.setFont(FONT, 11)
    c.setFillColor("#5c5850")
    c.drawString(60, h - 68, "DPSG Bundesverband")

    y = h - 100

    # ── Angaben ──
    def field(label, value, multiline=False):
        nonlocal y
        c.setFont(FONTB, 9)
        c.setFillColor("#5c5850")
        c.drawString(60, y, label)
        c.setFont(FONT, 10)
        c.setFillColor("#1a1815")
        if multiline:
            for line in simpleSplit(str(value), FONT, 10, w - 200):
                c.drawString(160, y, line)
                y -= 14
        else:
            c.drawString(160, y, str(value))
            y -= 16

    field("Bewirtende/r:", name)
    field("Gremium:", data.get("gremium", ""))
    field("Datum:", data.get("date", ""))
    field("Ort:", data.get("location", ""), multiline=True)
    y -= 6
    field("Anlass:", data.get("occasion", ""), multiline=True)
    y -= 10

    # ── Teilnehmer ──
    c.setFont(FONTB, 9)
    c.setFillColor("#5c5850")
    c.drawString(60, y, "BEWIRTETE PERSONEN:")
    y -= 4

    c.setStrokeColor("#d4d0c8")
    c.setFillColor(DPSG_BLUE)
    c.rect(55, y - 2, w - 110, 16, fill=True, stroke=False)
    c.setFillColor("#ffffff")
    c.setFont(FONTB, 9)
    c.drawString(60, y + 2, "NR.")
    c.drawString(90, y + 2, "NAME")
    c.drawString(320, y + 2, "FUNKTION / GREMIUM")
    y -= 18

    participants = data.get("participants", [])
    c.setFillColor("#1a1815")
    c.setFont(FONT, 10)
    for i, p in enumerate(participants, 1):
        if i % 2 == 0:
            c.setFillColor("#f5f3ef")
            c.rect(55, y - 4, w - 110, 16, fill=True, stroke=False)
        c.setFillColor("#1a1815")
        c.drawString(60, y, str(i))
        c.drawString(90, y, p.get("name", ""))
        c.drawString(320, y, p.get("role", ""))
        y -= 16

    # ── + bewirtende Person ──
    nr = len(participants) + 1
    if nr % 2 == 0:
        c.setFillColor("#f5f3ef")
        c.rect(55, y - 4, w - 110, 16, fill=True, stroke=False)
    c.setFillColor("#1a1815")
    c.drawString(60, y, str(nr))
    c.setFont(FONT, 10)
    c.drawString(90, y, f"{name} (bewirtende Person)")
    c.drawString(320, y, data.get("gremium", ""))
    y -= 16

    y -= 10

    # ── Kosten ──
    c.setFont(FONTB, 9)
    c.setFillColor("#5c5850")
    c.drawString(60, y, "KOSTEN:")
    y -= 16

    costs = [
        ("Speisen:", amt_food),
        ("Getränke:", amt_drinks),
        ("Trinkgeld:", amt_tip),
    ]
    for label, amt in costs:
        c.setFont(FONT, 10)
        c.setFillColor("#1a1815")
        c.drawString(320, y, label)
        c.drawRightString(w - 65, y, f"{amt:.2f} €".replace(".", ","))
        y -= 16

    # Summe
    y -= 2
    c.setLineWidth(1.5)
    c.setStrokeColor(DPSG_BLUE)
    c.line(315, y + 4, w - 55, y + 4)
    c.setFont(FONTB, 11)
    c.setFillColor(DPSG_BLUE)
    c.drawString(320, y - 8, "Gesamt:")
    c.drawRightString(w - 65, y - 8, f"{amt_total:.2f} €".replace(".", ","))
    y -= 30

    # ── Notes ──
    if notes and notes.strip():
        c.setFont(FONTB, 9)
        c.setFillColor("#5c5850")
        c.drawString(60, y, "HINWEISE:")
        y -= 14
        c.setFont(FONT, 10)
        c.setFillColor("#1a1815")
        for line in simpleSplit(notes.strip(), FONT, 10, w - 120):
            c.drawString(60, y, line)
            y -= 14
        y -= 10

    # ── Erklärung ──
    c.setFont(FONT, 8)
    c.setFillColor("#7a756c")
    txt = ("Hiermit bestätige ich die Richtigkeit und Vollständigkeit der vorstehenden Angaben. "
           "Die Bewirtung war aus dienstlichem Anlass notwendig. "
           "Der Originalbeleg ist beigefügt.")
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
    c.drawString(60, 12, "© Bundesamt Sankt Georg e.V. · Bewirtungsaufwendungen")

    c.save()
    buf.seek(0)
    with open(output_path, "wb") as f:
        f.write(buf.getvalue())


if __name__ == "__main__":
    with open(sys.argv[1]) as f:
        data = json.load(f)
    generate(data, sys.argv[2])
