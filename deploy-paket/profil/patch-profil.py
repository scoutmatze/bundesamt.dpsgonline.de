#!/usr/bin/env python3
"""Patch profil/page.tsx to add Canvas Signature + Gremium field.
Run on server: python3 patch-profil.py
"""
import os

PROFIL = "src/app/(dashboard)/profil/page.tsx"

with open(PROFIL) as f:
    content = f.read()

# ── 1. Add SignaturePad import ──
if "SignaturePad" not in content:
    content = content.replace(
        '"use client";',
        '"use client";\nimport SignaturePad from "@/components/SignaturePad";'
    )
    print("✓ Added SignaturePad import")

# ── 2. Add signatureData state ──
if "signatureData" not in content:
    # Find the user state and add signatureData handling
    # We need to find where user data is loaded and add canvas signature support
    pass

# ── 3. Find the signature section and add canvas option ──
# We'll add it by finding the existing signature upload area

# ── 4. Add Gremium field ──
if "gremium" not in content.lower() or "Gremium" not in content:
    # Add after the city/PLZ field
    if "city" in content:
        content = content.replace(
            '{inp("Stadt","city"',
            '{inp("Stadt","city"'
        )
    print("ℹ Gremium: Need manual placement - see DEPLOY-PLAN.md")

with open(PROFIL, "w") as f:
    f.write(content)

print("\nDone. Manual steps needed - see DEPLOY-PLAN.md")
