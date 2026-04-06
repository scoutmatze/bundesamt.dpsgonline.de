#!/usr/bin/env python3
"""Merge a main PDF with Beleg PDFs.
Usage: merge_belege.py <main.pdf> <paths.json> <output.pdf>
"""
import sys, json
from pypdf import PdfWriter, PdfReader

def merge(main_path, paths_file, output_path):
    w = PdfWriter()
    for p in PdfReader(main_path).pages:
        w.add_page(p)
    with open(paths_file) as f:
        paths = json.load(f)
    for bp in paths:
        try:
            for p in PdfReader(bp).pages:
                w.add_page(p)
        except Exception as e:
            print(f"Warning: could not add {bp}: {e}")
    with open(output_path, "wb") as f:
        w.write(f)
    print(f"Merged {len(w.pages)} pages")

if __name__ == "__main__":
    merge(sys.argv[1], sys.argv[2], sys.argv[3])
