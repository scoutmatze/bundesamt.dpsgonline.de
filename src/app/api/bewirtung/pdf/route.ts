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

  const [bw]: any[] = await prisma.$queryRaw`SELECT * FROM "Bewirtung" WHERE id=${id} AND "userId"=${user.id}`;
  if (!bw) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let participants = [];
  try { participants = JSON.parse(bw.participants); } catch {}

  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
  const input = {
    name,
    gremium: "",
    date: new Date(bw.date).toLocaleDateString("de-DE"),
    location: bw.location,
    occasion: bw.occasion,
    participants,
    amount_food: bw.amountFood,
    amount_drinks: bw.amountDrinks,
    amount_tip: bw.amountTip,
    notes: bw.notes || "",
    host_name: bw.hostName || null,
    signature_path: user.signaturePath || null,
  };

  const tmp = `/tmp/bw_${randomBytes(8).toString("hex")}`;
  const inFile = `${tmp}.json`, outFile = `${tmp}.pdf`, mergedFile = `${tmp}_merged.pdf`;
  writeFileSync(inFile, JSON.stringify(input));

  try {
    execSync(`python3 /app/pdf-generator/generate_bewirtung.py ${inFile} ${outFile}`, { timeout: 30000 });

    // Merge with uploaded Beleg if exists
    if (bw.filePath && existsSync(bw.filePath)) {
      try {
        execSync(`python3 -c "
from pypdf import PdfWriter, PdfReader
w = PdfWriter()
for p in PdfReader('${outFile}').pages: w.add_page(p)
try:
    for p in PdfReader('${bw.filePath}').pages: w.add_page(p)
except: pass
w.write('${mergedFile}')
"`, { timeout: 15000 });
        const pdf = readFileSync(mergedFile);
        cleanup(inFile, outFile, mergedFile);
        return pdfResponse(pdf, `Bewirtung_${new Date(bw.date).toISOString().split("T")[0]}.pdf`);
      } catch {
        // If merge fails, return just the form
      }
    }

    const pdf = readFileSync(outFile);
    cleanup(inFile, outFile, mergedFile);
    return pdfResponse(pdf, `Bewirtung_${new Date(bw.date).toISOString().split("T")[0]}.pdf`);
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
