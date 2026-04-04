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
    # Amount
    m = re.search(r'Gesamtpreis\s+(\d+[.,]\d{2})\s*€', text)
    if m: result["amount"] = float(m.group(1).replace(",", "."))
    # Order number
    m = re.search(r'Auftragsnummer[:\s]+(\d+)', text)
    if m: result["order_nr"] = m.group(1)
    # Route: "Einfache Fahrt München+City Aachen Hbf"
    m = re.search(r'(?:Einfache Fahrt|Hin- und Rückfahrt)\s+(.+)', text)
    if m:
        route = m.group(1).strip()
        # Remove "+City" suffixes
        route = re.sub(r'\+City', '', route)
        # Split: first station vs last station
        # Try to find known station patterns (ending with Hbf, Hbf., or standalone)
        parts = re.split(r'\s{2,}', route)
        if len(parts) >= 2:
            result["from"] = parts[0].strip()
            result["to"] = parts[1].strip()
        else:
            # Try from the route table: first and last station
            stations = re.findall(r'^([A-ZÄÖÜa-zäöüß][\w\s\(\)]+?)\s+\d{2}\.\d{2}\.\s+(?:ab|an)', text, re.MULTILINE)
            if len(stations) >= 2:
                result["from"] = stations[0].strip()
                result["to"] = stations[-1].strip()
    # If route parsing failed, try from timetable
    if not result["from"]:
        stations = re.findall(r'^([A-ZÄÖÜa-zäöüß][\w\s\(\),\.]+?)\s+\d{2}\.\d{2}\.\s+ab', text, re.MULTILINE)
        arrivals = re.findall(r'^([A-ZÄÖÜa-zäöüß][\w\s\(\),\.]+?)\s+\d{2}\.\d{2}\.\s+an', text, re.MULTILINE)
        if stations: result["from"] = stations[0].strip()
        if arrivals: result["to"] = arrivals[-1].strip()
    # Date
    m = re.search(r'(?:Gültigkeit|Fahrt am)[:\s]+(\d{2}\.\d{2}\.\d{4})', text)
    if m: result["date"] = m.group(1)
    if not result["date"]:
        m = re.search(r'Einfache Fahrt am\s+(\d{2}\.\d{2}\.\d{4})', text)
        if m: result["date"] = m.group(1)
    # Handyticket
    if re.search(r'Online-Ticket|Buchungsbestätigung|Handy-Ticket', text, re.IGNORECASE):
        result["is_handyticket"] = True
    return result
if __name__ == "__main__":
    try: print(json.dumps(parse_db_ticket(sys.argv[1])))
    except Exception as e: print(json.dumps({"error": str(e)}))
