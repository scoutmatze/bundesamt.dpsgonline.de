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

  const [bc]: any[] = await prisma.$queryRaw`SELECT * FROM "BahnCard" WHERE id=${id} AND "userId"=${user.id}`;
  if (!bc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("de-DE") : "";
  const input = {
    name,
    address: [user.street, `${user.zipCode || ""} ${user.city || ""}`].filter(Boolean).join(", "),
    gremium: "", year: bc.year,
    card_type: bc.cardType, class: bc.class, cost: bc.cost,
    valid_from: fmtDate(bc.validFrom), valid_to: fmtDate(bc.validTo),
    bahncard_nr: bc.bahnCardNr || "",
    justification: bc.justification || "",
    notes: bc.notes || "",
    signature_path: user.signaturePath || null,
  };

  const tmp = `/tmp/bc_${randomBytes(8).toString("hex")}`;
  const inFile = `${tmp}.json`, outFile = `${tmp}.pdf`, mergedFile = `${tmp}_merged.pdf`;
  writeFileSync(inFile, JSON.stringify(input));

  try {
    execSync(`python3 /app/pdf-generator/generate_bahncard.py ${inFile} ${outFile}`, { timeout: 30000 });

    // Merge with uploaded Beleg (e.g. BCBP Ersparnis-PDF or BahnCard scan)
    if (bc.filePath && existsSync(bc.filePath)) {
      try {
        execSync(`python3 -c "
from pypdf import PdfWriter, PdfReader
w = PdfWriter()
for p in PdfReader('${outFile}').pages: w.add_page(p)
try:
    for p in PdfReader('${bc.filePath}').pages: w.add_page(p)
except: pass
w.write('${mergedFile}')
"`, { timeout: 15000 });
        const pdf = readFileSync(mergedFile);
        cleanup(inFile, outFile, mergedFile);
        return pdfResponse(pdf, `BahnCard_${bc.year}.pdf`);
      } catch {
        // If merge fails (e.g. image not PDF), return just the form
      }
    }

    const pdf = readFileSync(outFile);
    cleanup(inFile, outFile, mergedFile);
    return pdfResponse(pdf, `BahnCard_${bc.year}.pdf`);
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
