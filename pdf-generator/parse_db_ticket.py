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
    m = re.search(r'Gesamtpreis\s+(\d+[.,]\d{2})\s*€', text)
    if m: result["amount"] = float(m.group(1).replace(",", "."))
    m = re.search(r'Auftragsnummer[:\s]+(\d+)', text)
    if m: result["order_nr"] = m.group(1)
    m = re.search(r'Gültigkeit[:\s]+(\d{2}\.\d{2}\.\d{4})', text)
    if not m: m = re.search(r'Einfache Fahrt am\s+(\d{2}\.\d{2}\.\d{4})', text)
    if m: result["date"] = m.group(1)
    # Route from timetable: find ICE/IC departure and arrival stations
    ice_deps = re.findall(r'^(.+?)\s+\d{2}\.\d{2}\.\s+ab\s+\d+.*?(?:ICE|IC\s)', text, re.MULTILINE)
    ice_arrs = re.findall(r'^(.+?)\s+\d{2}\.\d{2}\.\s+an\s+\d+.*?(?:ICE|IC\s|Res)', text, re.MULTILINE)
    if ice_deps: result["from"] = ice_deps[0].strip()
    if ice_arrs: result["to"] = ice_arrs[-1].strip()
    # Fallback: any departure/arrival if no ICE found
    if not result["from"]:
        deps = re.findall(r'^(.+?)\s+\d{2}\.\d{2}\.\s+ab\s', text, re.MULTILINE)
        arrs = re.findall(r'^(.+?)\s+\d{2}\.\d{2}\.\s+an\s', text, re.MULTILINE)
        if deps: result["from"] = deps[0].strip()
        if arrs: result["to"] = arrs[-1].strip()
    if re.search(r'Online-Ticket|Buchungsbestätigung|Handy.Ticket', text, re.IGNORECASE):
        result["is_handyticket"] = True
    return result
if __name__ == "__main__":
    try: print(json.dumps(parse_db_ticket(sys.argv[1])))
    except Exception as e: print(json.dumps({"error": str(e)}))
