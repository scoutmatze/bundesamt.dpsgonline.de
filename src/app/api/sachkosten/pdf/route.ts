import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { randomBytes } from "crypto";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { sessionToken: token }, include: { user: true } });
  if (!session || session.expires < new Date()) return null;
  return session.user;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [sk]: any[] = await prisma.$queryRaw`SELECT * FROM "Sachkosten" WHERE id=${id} AND "userId"=${user.id}`;
  if (!sk) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items: any[] = await prisma.$queryRaw`SELECT * FROM "SachkostenItem" WHERE "sachkostenId"=${id} ORDER BY date`;

  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
  const input = {
    name,
    address: [user.street, `${user.zipCode || ""} ${user.city || ""}`].filter(Boolean).join(", "),
    iban: "", bic: user.bic || "", bank: user.bank || "", gremium: "",
    year: sk.year, quarter: sk.quarter,
    items: items.map(i => ({ date: new Date(i.date).toLocaleDateString("de-DE"), description: i.description, amount: i.amount })),
    notes: sk.notes || "",
    signature_path: user.signaturePath || null,
  };

  const tmp = `/tmp/sk_${randomBytes(8).toString("hex")}`;
  const inFile = `${tmp}.json`, outFile = `${tmp}.pdf`, mergedFile = `${tmp}_merged.pdf`;
  writeFileSync(inFile, JSON.stringify(input));

  try {
    execSync(`python3 /app/pdf-generator/generate_sachkosten.py ${inFile} ${outFile}`, { timeout: 30000 });

    // Collect all Belege from items
    const belegPaths = items
      .filter(i => i.filePath && existsSync(i.filePath))
      .map(i => i.filePath);

    if (belegPaths.length > 0) {
      const pathsJson = JSON.stringify(belegPaths);
      try {
        execSync(`python3 -c "
import json
from pypdf import PdfWriter, PdfReader
w = PdfWriter()
for p in PdfReader('${outFile}').pages: w.add_page(p)
for bp in ${pathsJson}:
    try:
        for p in PdfReader(bp).pages: w.add_page(p)
    except: pass
w.write('${mergedFile}')
"`, { timeout: 30000 });
        const pdf = readFileSync(mergedFile);
        cleanup(inFile, outFile, mergedFile);
        return pdfResponse(pdf, `Sachkosten_Q${sk.quarter}_${sk.year}.pdf`);
      } catch {
        // If merge fails, return just the form
      }
    }

    const pdf = readFileSync(outFile);
    cleanup(inFile, outFile, mergedFile);
    return pdfResponse(pdf, `Sachkosten_Q${sk.quarter}_${sk.year}.pdf`);
  } catch (e: any) {
    cleanup(inFile, outFile, mergedFile);
    return NextResponse.json({ error: "PDF generation failed: " + e.message }, { status: 500 });
  }
}

function pdfResponse(data: Buffer | Uint8Array | Uint8Array, filename: string) {
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function cleanup(...files: string[]) {
  for (const f of files) {
    try { if (existsSync(f)) unlinkSync(f); } catch {}
  }
}
