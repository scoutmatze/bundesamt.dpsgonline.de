#!/usr/bin/env python3
"""Fix the email poller's inbox routing.
Run on server: python3 fix-poller-inbox.py
"""

with open("scripts/poll-emails.mjs") as f:
    content = f.read()

# Fix 1: Ensure execSync is imported at the top
if 'import { execSync }' not in content and 'execSync' not in content.split('\n')[0:10].__repr__():
    # Add import after the last import line
    lines = content.split('\n')
    last_import = 0
    for i, line in enumerate(lines):
        if line.startswith('import '):
            last_import = i
    lines.insert(last_import + 1, 'import { execSync } from "child_process";')
    content = '\n'.join(lines)
    print("✓ Added execSync import")

# Fix 2: Replace the broken dynamic import with direct execSync call
old = 'try{const {execSync:ex}=await import("child_process");preview=ex(`python3 -c "import pdfplumber\\nwith pdfplumber.open(\'${fp}\') as pdf:\\n  for p in pdf.pages[:1]:\\n    t=p.extract_text()\\n    if t: print(t[:500])"`,{timeout:10000}).toString().trim()}catch{}'

new = """try{preview=execSync(`python3 -c "
import pdfplumber
with pdfplumber.open('${fp}') as pdf:
  for p in pdf.pages[:1]:
    t=p.extract_text()
    if t: print(t[:500])
"`,{timeout:10000}).toString().trim()}catch{}"""

if old in content:
    content = content.replace(old, new)
    print("✓ Fixed dynamic import → direct execSync")
else:
    print("⚠ Dynamic import pattern not found, checking alternative...")
    # Try simpler pattern
    if 'await import("child_process")' in content:
        # Replace any line containing the dynamic import
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'await import("child_process")' in line:
                lines[i] = '            try{preview=execSync(`python3 -c "import pdfplumber\\nwith pdfplumber.open(\'${fp}\') as pdf:\\n  for p in pdf.pages[:1]:\\n    t=p.extract_text()\\n    if t: print(t[:500])"`,{timeout:10000}).toString().trim()}catch{}'
                print(f"✓ Fixed line {i+1}")
                break
        content = '\n'.join(lines)
    else:
        print("✗ Could not find pattern to fix")

with open("scripts/poll-emails.mjs", "w") as f:
    f.write(content)

print("\nDone. Verify with:")
print("  grep -n 'execSync\\|isDbTicket\\|Inbox' scripts/poll-emails.mjs | head -10")
