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
  const cardLabels: any = { BC25:"BahnCard 25",BC50:"BahnCard 50",BC100:"BahnCard 100",MY_BC25:"My BahnCard 25",MY_BC50:"My BahnCard 50",JUGEND_BC25:"Jugend BahnCard 25",SENIOR_BC25:"Senioren BahnCard 25",SENIOR_BC50:"Senioren BahnCard 50",BIZ_BC25:"BahnCard Business 25",BIZ_BC50:"BahnCard Business 50" };
  const cardLabel = cardLabels[bc.cardType] || bc.cardType;
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("de-DE") : "";

  // Signature
  let sigPath = "";
  if (user.signaturePath && existsSync(user.signaturePath)) {
    const isCanvas = user.signaturePath.includes("_canvas");
    if (isCanvas) {
      sigPath = user.signaturePath;
    } else {
      const tmpSig = `/tmp/sig_bc_${randomBytes(4).toString("hex")}.png`;
      try {
        execSync(`python3 /app/pdf-generator/process_signature.py "${user.signaturePath}" "${tmpSig}"`, { timeout: 10000 });
        sigPath = tmpSig;
      } catch { sigPath = user.signaturePath; }
    }
  }

  // Build Sachkosten input for BahnCard
  const skInput = {
    name,
    address: `${user.street || ""}, ${user.zipCode || ""} ${user.city || ""}`.trim().replace(/^,\s*/, ""),
    iban: user.ibanEncrypted || "",
    bic: user.bic || "",
    bank: user.bank || "",
    account_holder: user.accountHolder || name,
    gremium: (user as any).gremium || "",
    year: bc.year,
    quarter: 0,
    items: [
      {
        date: fmtDate(bc.validFrom || new Date()),
        description: `${cardLabel} ${bc.class}. Klasse${bc.bahnCardNr ? " (Nr. " + bc.bahnCardNr + ")" : ""}${bc.justification ? " — " + bc.justification.substring(0, 80) : ""}`,
        amount: bc.cost,
      },
    ],
    notes: `Gültigkeit: ${fmtDate(bc.validFrom)} – ${fmtDate(bc.validTo)}`,
    signature_path: sigPath,
  };

  const tmp = `/tmp/bc_${randomBytes(8).toString("hex")}`;
  const inFile = `${tmp}.json`, outFile = `${tmp}.pdf`, mergedFile = `${tmp}_merged.pdf`;
  writeFileSync(inFile, JSON.stringify(skInput));

  try {
    execSync(`python3 /app/pdf-generator/generate_sachkosten.py ${inFile} ${outFile}`, { timeout: 30000 });

    // Merge with uploaded Belege (BCBP PDF + receipt)
    const belegs: string[] = [];
    if (bc.filePath && existsSync(bc.filePath)) belegs.push(bc.filePath);
    if (bc.receiptFilePath && existsSync(bc.receiptFilePath)) belegs.push(bc.receiptFilePath);

    if (belegs.length > 0) {
      try {
        const belegJson = `/tmp/bc_belegs_${randomBytes(4).toString("hex")}.json`;
        writeFileSync(belegJson, JSON.stringify(belegs));
        execSync(`python3 /app/pdf-generator/merge_belege.py ${outFile} ${belegJson} ${mergedFile}`, { timeout: 15000 });
        const pdf = readFileSync(mergedFile);
        cleanup(inFile, outFile, mergedFile, belegJson);
        return pdfResponse(pdf, `BahnCard_${cardLabel}_${bc.year}.pdf`);
      } catch {}
    }

    const pdf = readFileSync(outFile);
    cleanup(inFile, outFile, mergedFile);
    return pdfResponse(pdf, `BahnCard_${cardLabel}_${bc.year}.pdf`);
  } catch (e: any) {
    cleanup(inFile, outFile, mergedFile);
    return NextResponse.json({ error: "PDF failed: " + e.message }, { status: 500 });
  }
}

function pdfResponse(data: Buffer | Uint8Array, filename: string) {
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` },
  });
}

function cleanup(...files: string[]) {
  for (const f of files) { try { if (existsSync(f)) unlinkSync(f); } catch {} }
}
