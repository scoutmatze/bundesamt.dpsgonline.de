#!/usr/bin/env python3
"""
Merges multiple PDFs + images into one PDF package.
Usage: merge_package.py <input_files.json> <output.pdf>

input_files.json format:
{
  "files": [
    {"path": "/tmp/reisekosten.pdf", "label": "Reisekostenabrechnung"},
    {"path": "/tmp/handyticket.pdf", "label": "Handyticket-Erklärung"},
    {"path": "/app/uploads/user/ticket.pdf", "label": "Beleg: DB Ticket"},
    {"path": "/app/uploads/user/hotel.jpg", "label": "Beleg: Hotelrechnung"}
  ]
}
"""
import sys, json, os
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
import io

def img_to_pdf(img_path):
    """Convert an image to a single-page PDF."""
    img = Image.open(img_path)
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    w, h = img.size
    page_w, page_h = A4
    scale = min(page_w / w, page_h / h) * 0.9  # 90% of page
    draw_w, draw_h = w * scale, h * scale
    x = (page_w - draw_w) / 2
    y = (page_h - draw_h) / 2

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.drawImage(ImageReader(img), x, y, width=draw_w, height=draw_h)
    c.save()
    buf.seek(0)
    return buf

def merge(input_json, output_path):
    with open(input_json) as f:
        data = json.load(f)

    writer = PdfWriter()

    for entry in data["files"]:
        path = entry["path"]
        label = entry.get("label", "")

        if not os.path.exists(path):
            print(f"  Skip (not found): {path}")
            continue

        ext = os.path.splitext(path)[1].lower()

        try:
            if ext == ".pdf":
                reader = PdfReader(path)
                for page in reader.pages:
                    writer.add_page(page)
                print(f"  + {label} ({len(reader.pages)} Seiten)")
            elif ext in (".jpg", ".jpeg", ".png", ".webp"):
                pdf_buf = img_to_pdf(path)
                reader = PdfReader(pdf_buf)
                for page in reader.pages:
                    writer.add_page(page)
                print(f"  + {label} (Bild → PDF)")
            else:
                print(f"  Skip (unsupported): {path}")
        except Exception as e:
            print(f"  Error {label}: {e}")

    with open(output_path, "wb") as f:
        writer.write(f)

    print(f"OK {len(writer.pages)} Seiten → {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.json> <output.pdf>")
        sys.exit(1)
    merge(sys.argv[1], sys.argv[2])
