#!/usr/bin/env python3
"""Parse DB ticket PDFs and Kaufbelege (invoices).

Handles:
- Online-Ticket PDFs (Ticket_*.pdf)
- Kaufbelege / Rechnungsbelege (DB_Kaufbeleg_*.pdf)
- Extracts: amount, date, from/to stations, handyticket flag, order number
- Kaufbelege: also extracts line items (Fahrkarte, Reservierung, etc.)

Usage: parse_db_ticket.py <pdf_path>
Returns JSON to stdout.
"""
import sys, json, re, os


def parse_db_ticket(pdf_path):
    # Extract text
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(p.extract_text() or "" for p in pdf.pages)
    except Exception:
        from pypdf import PdfReader
        text = "\n".join(p.extract_text() or "" for p in PdfReader(pdf_path).pages)

    result = {
        "amount": None,
        "date": None,
        "from": None,
        "to": None,
        "is_handyticket": False,
        "order_nr": None,
        "doc_type": None,       # "ticket" or "kaufbeleg"
        "line_items": [],       # [{description, amount}] for Kaufbelege
        "reservation_amount": None,
    }

    filename = os.path.basename(pdf_path).lower()

    # ── Detect document type ──
    is_kaufbeleg = (
        "kaufbeleg" in filename
        or "Rechnungsnummer" in text
        or "Rechnung\n" in text
        or "Summe (brutto)" in text
    )
    is_ticket = (
        "ticket" in filename
        or "Online-Ticket" in text
        or "Fahrkarte" in text.split("\n")[0] if text else False
    )
    result["doc_type"] = "kaufbeleg" if is_kaufbeleg else "ticket"

    # ── Order number ──
    m = re.search(r'Auftragsnummer[:\s]+(\d{6,})', text)
    if m:
        result["order_nr"] = m.group(1)

    # ── Handyticket detection ──
    if re.search(r'Online-Ticket|Handy-Ticket|Buchungsbestätigung', text, re.IGNORECASE):
        result["is_handyticket"] = True

    if is_kaufbeleg:
        _parse_kaufbeleg(text, result)
    else:
        _parse_ticket(text, result)

    return result


def _parse_kaufbeleg(text, result):
    """Parse DB Kaufbeleg / Rechnungsbeleg."""

    # ── Total amount: "Summe (brutto) 101,09 €" ──
    m = re.search(r'Summe\s*\(brutto\)\s+(\d+[.,]\d{2})\s*€', text)
    if m:
        result["amount"] = float(m.group(1).replace(",", "."))

    # Fallback: "Zahlbetrag" or payment line
    if result["amount"] is None:
        m = re.search(r'Zahlung\s+(\d+[.,]\d{2})\s*€', text)
        if m:
            result["amount"] = float(m.group(1).replace(",", "."))

    # ── Line items: extract Fahrkarte, Reservierung, etc. ──
    # Pattern: "DD.MM.YY  Description  Amount €  DD.MM.YY ..."
    # Each line item starts with a date and has a price
    lines = text.split("\n")
    i = 0
    reservation_total = 0.0
    while i < len(lines):
        line = lines[i].strip()

        # Match line items that start with a date (DD.MM.YY)
        m = re.match(r'^(\d{2}\.\d{2}\.\d{2})\s+(.+?)\s+(\d+[.,]\d{2})\s*€', line)
        if m:
            item_date = m.group(1)
            item_desc = m.group(2).strip()
            item_amount = float(m.group(3).replace(",", "."))

            # Gather continuation lines (indented lines without a date prefix)
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                # Stop if next line starts with a date or is a summary line
                if re.match(r'^\d{2}\.\d{2}\.\d{2}\s', next_line):
                    break
                if next_line.startswith("Summe") or next_line.startswith("Zahlungsinformationen"):
                    break
                if next_line:
                    item_desc += " " + next_line
                j += 1

            # Clean up description
            item_desc = re.sub(r'\s+', ' ', item_desc).strip()
            # Remove trailing date/tax info from description
            item_desc = re.sub(r'\s+\d{2}\.\d{2}\.\d{2}\s+\d+\s*%.*$', '', item_desc)
            item_desc = re.sub(r'\s+\d{2}\.\d{2}\.\d{2}\s*$', '', item_desc)

            result["line_items"].append({
                "description": item_desc,
                "amount": item_amount,
                "date": item_date,
            })

            # Track reservation costs
            if re.search(r'Reservierung', item_desc, re.IGNORECASE):
                reservation_total += item_amount

            i = j
            continue
        i += 1

    if reservation_total > 0:
        result["reservation_amount"] = reservation_total

    # ── Date: from Leistungsdatum (travel date, not purchase date) ──
    # Look for dates in the MwSt column pattern: "DD.MM.YY  17 % (D)"
    leistungs_dates = re.findall(r'(\d{2}\.\d{2}\.\d{2})\s+(?:17|7|19)\s*%', text)
    if leistungs_dates:
        d = leistungs_dates[0]
        parts = d.split(".")
        if len(parts[2]) == 2:
            parts[2] = "20" + parts[2]
        result["date"] = ".".join(parts)

    # Fallback: first Leistungsdatum from line items
    if not result["date"] and result["line_items"]:
        for item in result["line_items"]:
            # Use the date from the first Fahrkarte item
            if "Fahrkarte" in item.get("description", ""):
                d = item["date"]
                parts = d.split(".")
                if len(parts[2]) == 2:
                    parts[2] = "20" + parts[2]
                result["date"] = ".".join(parts)
                break

    # ── Route: extract from Fahrkarte description ──
    # "Fahrkarte Super Sparpreis ... Westendstraße, München → Aachen Hbf, 1. Klasse..."
    for item in result["line_items"]:
        desc = item.get("description", "")
        if "Fahrkarte" in desc or "Sparpreis" in desc or "Flexpreis" in desc:
            m = re.search(r'([A-ZÄÖÜa-zäöüß][\w\s\.\-\(\)]+?)\s*→\s*([A-ZÄÖÜa-zäöüß][\w\s\.\-\(\)]+?)(?:,\s*\d|\s*$)', desc)
            if m:
                result["from"] = m.group(1).strip().rstrip(",")
                result["to"] = m.group(2).strip().rstrip(",")
                break

    # Fallback: any arrow pattern in the text
    if not result["from"]:
        m = re.search(r'([A-ZÄÖÜa-zäöüß][\w\s\.\-\(\)]{2,30}?)\s*→\s*([A-ZÄÖÜa-zäöüß][\w\s\.\-\(\)]{2,30}?)(?:,|\n)', text)
        if m:
            result["from"] = m.group(1).strip().rstrip(",")
            result["to"] = m.group(2).strip().rstrip(",")


def _parse_ticket(text, result):
    """Parse DB Online-Ticket PDF."""

    # ── Amount: "Gesamtpreis 101,09 €" ──
    m = re.search(r'Gesamtpreis\s+(\d+[.,]\d{2})\s*€', text)
    if m:
        result["amount"] = float(m.group(1).replace(",", "."))

    # ── Date: "Gültigkeit: 02.04.2026 ..." ──
    m = re.search(r'Gültigkeit[:\s]+(\d{2}\.\d{2}\.\d{4})', text)
    if not m:
        m = re.search(r'Einfache Fahrt am\s+(\d{2}\.\d{2}\.\d{4})', text)
    if not m:
        m = re.search(r'Hin- und Rückfahrt am\s+(\d{2}\.\d{2}\.\d{4})', text)
    if m:
        result["date"] = m.group(1)

    # ── Route from timetable ──
    # First "ab" station with ICE/IC = departure
    # Last "an" station = arrival
    deps = re.findall(r'^(.+?)\s+\d{2}\.\d{2}\.\s+ab\s', text, re.MULTILINE)
    arrs = re.findall(r'^(.+?)\s+\d{2}\.\d{2}\.\s+an\s', text, re.MULTILINE)

    if deps:
        result["from"] = deps[0].strip()
    if arrs:
        result["to"] = arrs[-1].strip()

    # Fallback: "Einfache Fahrt München+City Aachen Hbf"
    if not result["from"]:
        m = re.search(r'(?:Einfache Fahrt|Hin- und Rückfahrt)\s+(.+)', text)
        if m:
            route = re.sub(r'\+City', '', m.group(1)).strip()
            parts = re.split(r'\s{2,}', route)
            if len(parts) >= 2:
                result["from"] = parts[0].strip()
                result["to"] = parts[1].strip()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: parse_db_ticket.py <pdf_path>"}))
        sys.exit(1)
    try:
        r = parse_db_ticket(sys.argv[1])
        print(json.dumps(r, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
