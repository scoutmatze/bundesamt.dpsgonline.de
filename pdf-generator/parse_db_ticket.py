#!/usr/bin/env python3
"""Parse Deutsche Bahn PDF tickets to extract amount, date, from, to."""
import sys, json, re

def parse_db_ticket(pdf_path):
    """Extract travel info from a DB ticket PDF."""
    try:
        import pdfplumber
    except ImportError:
        # Fallback: use pypdf
        from pypdf import PdfReader
        reader = PdfReader(pdf_path)
        text = "\n".join(p.extract_text() or "" for p in reader.pages)
    else:
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(p.extract_text() or "" for p in pdf.pages)

    result = {"amount": None, "date": None, "from": None, "to": None, "is_handyticket": False}

    # Amount: "Summe 44,80 EUR" or "Gesamtpreis: 44,80 EUR" or "Betrag 44,80 EUR"
    for pattern in [
        r'(?:Summe|Gesamtpreis|Betrag|Rechnungsbetrag)[:\s]*(\d+[.,]\d{2})\s*(?:EUR|€)',
        r'(\d+[.,]\d{2})\s*(?:EUR|€)\s*(?:Summe|gesamt|total)',
        r'Zahlbetrag[:\s]*(\d+[.,]\d{2})',
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            result["amount"] = float(m.group(1).replace(",", "."))
            break

    # Date: "Hinfahrt am 02.04.2026" or "Gültig am 02.04.2026" or "Reisetag: 02.04.2026"
    for pattern in [
        r'(?:Hinfahrt|Rückfahrt|Gültig|Reisetag|Fahrt)[:\s]*(?:am\s+)?(\d{2}\.\d{2}\.\d{4})',
        r'(\d{2}\.\d{2}\.\d{4})\s*(?:Hinfahrt|Rückfahrt)',
    ]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            result["date"] = m.group(1)
            break

    # Stations: "München Hbf → Montabaur" or "Von: München Hbf" / "Nach: Montabaur"
    for pattern in [
        r'(?:Von|Ab|Start)[:\s]+([A-ZÄÖÜa-zäöüß\s\.\-]+?)\s*(?:→|->|–|nach|Nach)\s*([A-ZÄÖÜa-zäöüß\s\.\-]+?)(?:\n|$)',
        r'([A-ZÄÖÜa-zäöüß\.\- ]{3,30})\s*(?:→|->|»)\s*([A-ZÄÖÜa-zäöüß\.\- ]{3,30})',
    ]:
        m = re.search(pattern, text)
        if m:
            result["from"] = m.group(1).strip()
            result["to"] = m.group(2).strip()
            break

    # If no arrow pattern found, try "Von:" and "Nach:" on separate lines
    if not result["from"]:
        m_from = re.search(r'(?:Von|Ab)[:\s]+([A-ZÄÖÜa-zäöüß\s\.\-]+?)(?:\n|,)', text)
        m_to = re.search(r'(?:Nach|An|Bis)[:\s]+([A-ZÄÖÜa-zäöüß\s\.\-]+?)(?:\n|,)', text)
        if m_from: result["from"] = m_from.group(1).strip()
        if m_to: result["to"] = m_to.group(1).strip()

    # Handyticket detection
    if re.search(r'(?:Handy|Online|App)[\s-]*(?:Ticket|ticket)', text, re.IGNORECASE):
        result["is_handyticket"] = True
    if re.search(r'(?:Buchungsbestätigung|Auftragsbestätigung)', text, re.IGNORECASE):
        result["is_handyticket"] = True

    return result

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: parse_db_ticket.py <pdf_path>"}))
        sys.exit(1)
    try:
        result = parse_db_ticket(sys.argv[1])
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
