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
  const fmt = (n: number) => n.toFixed(2).replace(".", ",");
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("de-DE") : "";
  const cardLabels: any = { BC25: "BahnCard 25", BC50: "BahnCard 50", BC100: "BahnCard 100" };
  const cardLabel = cardLabels[bc.cardType] || bc.cardType;

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

  // Build Reisekostenabrechnung input for BahnCard
  const rkInput = {
    profile: {
      lastName: user.lastName || "",
      firstName: user.firstName || "",
      street: user.street || "",
      zip: user.zipCode || "",
      city: user.city || "",
      accountHolder: user.accountHolder || name,
      bank: user.bank || "",
      iban: user.ibanEncrypted || "",
      bic: user.bic || "",
      signaturePath: sigPath,
    },
    trip: {
      purpose: `${cardLabel} ${bc.class}. Klasse — ${bc.year}${bc.justification ? " — " + bc.justification.substring(0, 60) : ""}`,
      route: `${cardLabel} (${fmtDate(bc.validFrom)} – ${fmtDate(bc.validTo)})${bc.bahnCardNr ? " Nr. " + bc.bahnCardNr : ""}`,
      startDate: fmtDate(bc.validFrom || new Date()),
      startTime: "",
      endDate: fmtDate(bc.validTo || new Date()),
      endTime: "",
      mode: "BAHN",
      pkwReason: "",
      licensePlate: "",
      km: 0,
    },
    costs: {
      travel: fmt(bc.cost),
      kmMoney: fmt(0),
      lodging: fmt(0),
      meals: fmt(0),
      other: fmt(0),
      subtotal: fmt(bc.cost),
      reimbursement: fmt(0),
      total: fmt(bc.cost),
    },
    checkboxes: {
      bankKnown: true,
      bahn: true,
      auto: false,
      dienstwagen: false,
      flugzeug: false,
      schiff: false,
      co2: false,
    },
  };

  const tmp = `/tmp/bc_${randomBytes(8).toString("hex")}`;
  const inFile = `${tmp}.json`, outFile = `${tmp}.pdf`, mergedFile = `${tmp}_merged.pdf`;
  writeFileSync(inFile, JSON.stringify(rkInput));

  try {
    execSync(`python3 /app/pdf-generator/generate_reisekosten.py ${inFile} ${outFile}`, { timeout: 30000 });

    // Merge with uploaded Beleg (BCBP PDF etc.)
    const belegs: string[] = [];
    if (bc.filePath && existsSync(bc.filePath)) belegs.push(bc.filePath);
    if (bc.receiptFilePath && existsSync(bc.receiptFilePath)) belegs.push(bc.receiptFilePath);
    if (belegs.length > 0) {
      try {
        execSync(`python3 /app/pdf-generator/merge_belege.py ${outFile} /dev/stdin ${mergedFile}`, {
          input: JSON.stringify(belegs),
          timeout: 15000,
        });
        const pdf = readFileSync(mergedFile);
        cleanup(inFile, outFile, mergedFile);
        return pdfResponse(pdf, `BahnCard_${bc.year}.pdf`);
      } catch {}
    }

    const pdf = readFileSync(outFile);
    cleanup(inFile, outFile, mergedFile);
    return pdfResponse(pdf, `BahnCard_${bc.year}.pdf`);
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
