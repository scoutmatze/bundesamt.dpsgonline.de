#!/usr/bin/env python3
"""Extract text field positions and form fields from DPSG PDF templates.

Run on server:
  docker compose -f docker-compose.prod.yml exec app python3 /app/pdf-generator/extract_fields.py

This outputs coordinates for each template, which we need
to build the overlay generators (reportlab on top of original PDF).
"""
import os, json

TEMPLATE_DIR = "/app/pdf-generator/templates"

def extract_text_positions(pdf_path):
    """Extract all text with coordinates from a PDF."""
    import pdfplumber
    result = {"pages": []}
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            page_data = {
                "page": i + 1,
                "width": page.width,
                "height": page.height,
                "texts": [],
                "lines": [],
                "rects": [],
            }
            # Text with positions
            for char_group in (page.extract_words() or []):
                page_data["texts"].append({
                    "text": char_group["text"],
                    "x0": round(char_group["x0"], 1),
                    "y0": round(char_group["top"], 1),
                    "x1": round(char_group["x1"], 1),
                    "y1": round(char_group["bottom"], 1),
                })
            # Lines (for underscores, table borders)
            for line in (page.lines or []):
                page_data["lines"].append({
                    "x0": round(line["x0"], 1),
                    "y0": round(line["top"], 1),
                    "x1": round(line["x1"], 1),
                    "y1": round(line["bottom"], 1),
                })
            # Rectangles (checkboxes, cells)
            for rect in (page.rects or []):
                page_data["rects"].append({
                    "x0": round(rect["x0"], 1),
                    "y0": round(rect["top"], 1),
                    "x1": round(rect["x1"], 1),
                    "y1": round(rect["bottom"], 1),
                })
            result["pages"].append(page_data)
    return result


def extract_form_fields(pdf_path):
    """Extract AcroForm fields if present."""
    from pypdf import PdfReader
    reader = PdfReader(pdf_path)
    fields = []
    if reader.get_fields():
        for name, field in reader.get_fields().items():
            fields.append({
                "name": name,
                "type": str(field.get("/FT", "")),
                "value": str(field.get("/V", "")),
                "rect": [float(x) for x in field.get("/Rect", [0,0,0,0])],
            })
    return fields


def main():
    templates = [
        "Sachkosten-DPSG-Abrechnungsformular_231115.pdf",
        "Sachkosten-DPSG-Bewirtungsaufwendungen_231115.pdf",
    ]

    for tpl in templates:
        path = os.path.join(TEMPLATE_DIR, tpl)
        if not os.path.exists(path):
            print(f"\n❌ {tpl}: NOT FOUND")
            continue

        print(f"\n{'='*60}")
        print(f"📄 {tpl}")
        print(f"{'='*60}")

        # Text positions
        data = extract_text_positions(path)
        for page in data["pages"]:
            print(f"\n--- Page {page['page']} ({page['width']}x{page['height']}) ---")
            print(f"  Texts: {len(page['texts'])}")
            for t in page["texts"]:
                print(f"    ({t['x0']:6.1f}, {t['y0']:6.1f}) '{t['text']}'")
            print(f"  Lines: {len(page['lines'])}")
            print(f"  Rects: {len(page['rects'])}")

        # Form fields
        fields = extract_form_fields(path)
        if fields:
            print(f"\n  Form Fields ({len(fields)}):")
            for f in fields:
                print(f"    {f['name']}: type={f['type']} rect={f['rect']}")
        else:
            print(f"\n  No AcroForm fields")

    # Also check BahnCard (XLS)
    xls_path = os.path.join(TEMPLATE_DIR, "Reisekosten_DPSG_BahnCard_Antrag.xls")
    if os.path.exists(xls_path):
        print(f"\n{'='*60}")
        print(f"📊 BahnCard template is XLS format")
        print(f"  → Convert to PDF: libreoffice --headless --convert-to pdf '{xls_path}'")
        print(f"  → Then extract fields from the PDF")
        print(f"{'='*60}")

    # Save full data as JSON for programmatic use
    output = {}
    for tpl in templates:
        path = os.path.join(TEMPLATE_DIR, tpl)
        if os.path.exists(path):
            output[tpl] = {
                "positions": extract_text_positions(path),
                "fields": extract_form_fields(path),
            }

    json_path = os.path.join(TEMPLATE_DIR, "field_positions.json")
    with open(json_path, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Full data saved to {json_path}")


if __name__ == "__main__":
    main()
