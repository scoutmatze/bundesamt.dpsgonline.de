import sys, json, re
def parse_db_ticket(pdf_path):
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            text = "\n".join(p.extract_text() or "" for p in pdf.pages)
    except:
        from pypdf import PdfReader
        text = "\n".join(p.extract_text() or "" for p in PdfReader(pdf_path).pages)
    result = {"amount": None, "date": None, "from": None, "to": None, "is_handyticket": False, "order_nr": None}
    # Order number
    m = re.search(r'Auftragsnummer[:\s]+(\d+)', text)
    if m: result["order_nr"] = m.group(1)
    # Amount: try multiple patterns
    for p in [r'Gesamtpreis\s+(\d+[.,]\d{2})\s*€', r'Summe \(brutto\)\s+(\d+[.,]\d{2})\s*€', r'Zahlbetrag[:\s]*(\d+[.,]\d{2})']:
        m = re.search(p, text)
        if m: result["amount"] = float(m.group(1).replace(",", ".")); break
    # Date: ticket format
    m = re.search(r'Gültigkeit[:\s]+(\d{2}\.\d{2}\.\d{4})', text)
    if not m: m = re.search(r'Einfache Fahrt am\s+(\d{2}\.\d{2}\.\d{4})', text)
    # Date: Kaufbeleg format (Leistungsdatum column, e.g. "02.04.26")
    if not m:
        dates = re.findall(r'(\d{2}\.\d{2}\.\d{2})\s+(?:17|7|19)\s*%', text)
        if dates:
            d = dates[0]
            parts = d.split(".")
            if len(parts[2]) == 2: parts[2] = "20" + parts[2]
            result["date"] = ".".join(parts)
    if m: result["date"] = m.group(1)
    # Route: ticket timetable (ICE/IC stations)
    ice_deps = re.findall(r'^(.+?)\s+\d{2}\.\d{2}\.\s+ab\s+\d+.*?(?:ICE|IC\s)', text, re.MULTILINE)
    ice_arrs = re.findall(r'^(.+?)\s+\d{2}\.\d{2}\.\s+an\s+\d+.*?(?:ICE|IC\s|Res)', text, re.MULTILINE)
    if ice_deps: result["from"] = ice_deps[0].strip()
    if ice_arrs: result["to"] = ice_arrs[-1].strip()
    # Route: Kaufbeleg format "München → Aachen Hbf" in description
    if not result["from"]:
        m = re.search(r'[,\s]([A-ZÄÖÜa-zäöüß\s\.\-]+?)\s*→\s*([A-ZÄÖÜa-zäöüß\s\.\-]+?)(?:,|\n)', text)
        if m:
            result["from"] = m.group(1).strip()
            result["to"] = m.group(2).strip()
    # Fallback: any departure/arrival
    if not result["from"]:
        deps = re.findall(r'^(.+?)\s+\d{2}\.\d{2}\.\s+ab\s', text, re.MULTILINE)
        arrs = re.findall(r'^(.+?)\s+\d{2}\.\d{2}\.\s+an\s', text, re.MULTILINE)
        if deps: result["from"] = deps[0].strip()
        if arrs: result["to"] = arrs[-1].strip()
    # Handyticket
    if re.search(r'Online-Ticket|Buchungsbestätigung|Handy.Ticket', text, re.IGNORECASE):
        result["is_handyticket"] = True
    # Kaufbeleg is NOT a Handyticket (it's the invoice)
    if re.search(r'Dieses Dokument berechtigt nicht zur Fahrt', text):
        result["is_handyticket"] = False
    return result
if __name__ == "__main__":
    try: print(json.dumps(parse_db_ticket(sys.argv[1])))
    except Exception as e: print(json.dumps({"error": str(e)}))
