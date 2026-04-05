#!/usr/bin/env python3
"""Generate BahnCard-Antrag PDF.

Usage: generate_bahncard.py <input.json> <output.pdf>

Input JSON:
{
  "name": "Mathias Meyer",
  "address": "Musterstr. 1, 12345 Musterstadt",
  "gremium": "Bundesleitung",
  "year": 2026,
  "card_type": "BC50",
  "class": 1,
  "cost": 536.00,
  "valid_from": "01.04.2026",
  "valid_to": "31.03.2027",
  "bahncard_nr": "7081 4012 3456 7890",
  "justification": "Regelmäßige Reisen zu BL-Sitzungen (6x/Jahr) und AG-Treffen (4x/Jahr). Ersparnis gegenüber Normalpreis: ca. 1.200 €/Jahr.",
  "previous_savings": 1247.50,
  "expected_trips": 10,
  "notes": "Optional",
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

CARD_LABELS = {
    "BC25": "BahnCard 25",
    "BC50": "BahnCard 50",
    "BC100": "BahnCard 100",
}


def generate(data, output_path):
    name = data["name"]
    sig = data.get("signature_path")
    notes = data.get("notes", "")
    today = datetime.date.today().strftime("%d.%m.%Y")
    year = data.get("year", datetime.date.today().year)
    card_type = data.get("card_type", "BC50")
    card_label = CARD_LABELS.get(card_type, card_type)
    cls = data.get("class", 2)

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    # ── Header ──
    c.setFillColor(DPSG_RED)
    c.rect(0, h - 8, w, 8, fill=True, stroke=False)

    c.setFillColor(DPSG_BLUE)
    c.setFont(FONTB, 16)
    c.drawString(60, h - 50, "BahnCard-Antrag / -Erstattung")
    c.setFont(FONT, 11)
    c.setFillColor("#5c5850")
    c.drawString(60, h - 68, f"DPSG Bundesverband · Jahr {year}")

    y = h - 100

    # ── Persönliche Daten ──
    def field(label, value):
        nonlocal y
        c.setFont(FONTB, 9)
        c.setFillColor("#5c5850")
        c.drawString(60, y, label)
        c.setFont(FONT, 10)
        c.setFillColor("#1a1815")
        c.drawString(180, y, str(value))
        y -= 16

    field("Name:", name)
    field("Adresse:", data.get("address", ""))
    field("Gremium:", data.get("gremium", ""))
    y -= 6

    # ── BahnCard-Daten ──
    c.setFont(FONTB, 9)
    c.setFillColor("#5c5850")
    c.drawString(60, y, "BAHNCARD-DATEN:")
    y -= 16

    field("Typ:", f"{card_label}, {cls}. Klasse")
    field("Kosten:", f"{data.get('cost', 0):.2f} €".replace(".", ","))
    if data.get("bahncard_nr"):
        field("BahnCard-Nr.:", data["bahncard_nr"])
    if data.get("valid_from"):
        field("Gültig:", f"{data['valid_from']} bis {data.get('valid_to', '')}")
    y -= 6

    # ── Begründung ──
    c.setFont(FONTB, 9)
    c.setFillColor("#5c5850")
    c.drawString(60, y, "BEGRÜNDUNG:")
    y -= 14

    justification = data.get("justification", "")
    if justification:
        c.setFont(FONT, 10)
        c.setFillColor("#1a1815")
        for line in simpleSplit(justification, FONT, 10, w - 120):
            c.drawString(60, y, line)
            y -= 14
    y -= 6

    # ── Wirtschaftlichkeitsberechnung ──
    prev_savings = data.get("previous_savings")
    expected_trips = data.get("expected_trips")
    cost = data.get("cost", 0)

    if prev_savings or expected_trips:
        c.setFont(FONTB, 9)
        c.setFillColor("#5c5850")
        c.drawString(60, y, "WIRTSCHAFTLICHKEIT:")
        y -= 16

        c.setFont(FONT, 10)
        c.setFillColor("#1a1815")

        if prev_savings:
            c.drawString(60, y, f"Bisherige Ersparnis durch BahnCard:")
            c.drawRightString(w - 65, y, f"{prev_savings:.2f} €".replace(".", ","))
            y -= 16

        if expected_trips:
            c.drawString(60, y, f"Erwartete Dienstreisen im Zeitraum:")
            c.drawRightString(w - 65, y, str(expected_trips))
            y -= 16

        c.drawString(60, y, f"Kosten BahnCard:")
        c.drawRightString(w - 65, y, f"{cost:.2f} €".replace(".", ","))
        y -= 16

        if prev_savings and cost:
            ratio = prev_savings / cost if cost > 0 else 0
            c.setFont(FONTB, 10)
            color = "#2D6A4F" if ratio >= 1.0 else "#b45309"
            c.setFillColor(color)
            c.drawString(60, y, f"Amortisationsfaktor:")
            c.drawRightString(w - 65, y, f"{ratio:.1f}x")
            y -= 16

    # ── Notes ──
    if notes and notes.strip():
        y -= 10
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
    txt = ("Ich beantrage hiermit die Erstattung der BahnCard-Kosten. "
           "Die BahnCard wird ausschließlich für dienstliche Reisen im Rahmen meiner "
           "ehrenamtlichen Tätigkeit für die DPSG genutzt. Private Nutzung wird anteilig "
           "selbst getragen.")
    for line in simpleSplit(txt, FONT, 8, w - 120):
        c.drawString(60, y, line)
        y -= 11

    # ── Checkboxen ──
    y -= 10
    c.setFont(FONT, 9)
    c.setFillColor("#1a1815")

    checks = [
        "BahnCard-Scan beigefügt",
        "Rechnung / Zahlungsnachweis beigefügt",
    ]
    for label in checks:
        c.rect(60, y - 2, 10, 10, fill=False, stroke=True)
        c.drawString(76, y, label)
        y -= 16

    # ── Unterschrift ──
    y -= 14
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

    # ── Genehmigung (untere Hälfte) ──
    y -= 60
    c.setStrokeColor("#d4d0c8")
    c.setDash(3, 3)
    c.line(55, y, w - 55, y)
    c.setDash()
    y -= 20
    c.setFont(FONTB, 11)
    c.setFillColor(DPSG_BLUE)
    c.drawString(60, y, "Genehmigung durch Vorstand / Geschäftsführung")
    y -= 24
    c.setFont(FONT, 9)
    c.setFillColor("#1a1815")
    c.drawString(60, y, "☐ genehmigt")
    c.drawString(200, y, "☐ abgelehnt")
    y -= 30
    c.line(60, y, 250, y)
    c.line(300, y, 500, y)
    c.setFont(FONT, 8)
    c.setFillColor("#7a756c")
    c.drawString(60, y - 12, "Datum")
    c.drawString(300, y - 12, "Unterschrift")

    # ── Footer ──
    c.setFillColor(DPSG_RED)
    c.rect(0, 0, w, 6, fill=True, stroke=False)
    c.setFont(FONT, 7)
    c.setFillColor("#9e9a92")
    c.drawString(60, 12, f"© Bundesamt Sankt Georg e.V. · BahnCard-Antrag {year}")

    c.save()
    buf.seek(0)
    with open(output_path, "wb") as f:
        f.write(buf.getvalue())


if __name__ == "__main__":
    with open(sys.argv[1]) as f:
        data = json.load(f)
    generate(data, sys.argv[2])
