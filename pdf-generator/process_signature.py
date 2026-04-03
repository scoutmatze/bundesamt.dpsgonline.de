#!/usr/bin/env python3
"""Process signature: remove background, trim whitespace."""
import sys
from PIL import Image
import numpy as np

def process(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)

    # Remove dark background (black or near-black)
    brightness = data[:,:,0].astype(int) + data[:,:,1].astype(int) + data[:,:,2].astype(int)
    data[brightness < 120] = [0, 0, 0, 0]

    # Also remove white/light background
    data[brightness > 700] = [0, 0, 0, 0]

    # Trim whitespace
    alpha = data[:,:,3]
    rows = np.any(alpha > 10, axis=1)
    cols = np.any(alpha > 10, axis=0)
    if not rows.any():
        Image.fromarray(data).save(output_path)
        return
    rmin, rmax = np.where(rows)[0][[0,-1]]
    cmin, cmax = np.where(cols)[0][[0,-1]]
    trimmed = Image.fromarray(data).crop((cmin, rmin, cmax+1, rmax+1))
    trimmed.save(output_path)
    print(f"OK {trimmed.size[0]}x{trimmed.size[1]}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input> <output>")
        sys.exit(1)
    process(sys.argv[1], sys.argv[2])
