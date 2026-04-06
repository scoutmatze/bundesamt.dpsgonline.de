#!/usr/bin/env python3
"""Parse generic receipts (Tankquittungen, Rechnungen, etc.) to extract total amount.
Usage: parse_receipt.py <pdf_path>
Returns JSON: {"amount": 27.35, "text_preview": "..."}
"""
import sys, json, re

def parse_receipt(pdf_path):
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(p.extract_text() or "" for p in pdf.pages[:2])
    except:
        from pypdf import PdfReader
        text = "\n".join(p.extract_text() or "" for p in PdfReader(pdf_path).pages[:2])

    result = {"amount": None, "text_preview": text[:500]}

    # Try various amount patterns (most specific first)
    patterns = [
        # German formats
        r'Gesamtbetrag[:\s]*(\d+[.,]\d{2})\s*(?:EUR|€)',
        r'Gesamt\s*betrag[:\s]*(\d+[.,]\d{2})',
        r'Summe\s*(?:\(brutto\))?\s*[:=]?\s*(\d+[.,]\d{2})\s*(?:EUR|€)',
        r'Total[:\s]*(\d+[.,]\d{2})\s*(?:EUR|€)',
        r'Endbetrag[:\s]*(\d+[.,]\d{2})',
        r'Rechnungsbetrag[:\s]*(\d+[.,]\d{2})',
        r'Zahlbetrag[:\s]*(\d+[.,]\d{2})',
        r'Betrag[:\s]*(\d+[.,]\d{2})\s*(?:EUR|€)',
        r'zu\s*zahlen[:\s]*(\d+[.,]\d{2})',
        r'Zahlung\s*erfolgt.*?(\d+[.,]\d{2})\s*(?:EUR|€)',
        # Amount followed by EUR
        r'(\d+[.,]\d{2})\s*EUR',
        # Brutto
        r'Brutto[:\s]*(\d+[.,]\d{2})',
        # Fallback: largest amount in text
    ]

    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            result["amount"] = float(m.group(1).replace(",", "."))
            break

    # Fallback: find all amounts and take the largest (likely total)
    if result["amount"] is None:
        amounts = re.findall(r'(\d+[.,]\d{2})\s*(?:EUR|€)', text)
        if amounts:
            values = [float(a.replace(",", ".")) for a in amounts]
            result["amount"] = max(values)

    return result

if __name__ == "__main__":
    r = parse_receipt(sys.argv[1])
    print(json.dumps(r, ensure_ascii=False))
