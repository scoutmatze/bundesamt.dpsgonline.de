import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { randomBytes } from "crypto";
import path from "path";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });
  if (!session || session.expires < new Date()) return null;
  return session.user;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tripId = req.nextUrl.searchParams.get("tripId");
  if (!tripId) return NextResponse.json({ error: "tripId required" }, { status: 400 });

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: user.id },
    include: { receipts: { orderBy: { date: "asc" } } },
  });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!trip.receipts.length) return NextResponse.json({ error: "Keine Belege vorhanden" }, { status: 400 });

  const receipts = trip.receipts;
  const byC = (c: string) => receipts.filter(r => r.category === c).reduce((s, r) => s + r.amount, 0);
  const total = receipts.reduce((s, r) => s + r.amount, 0);
  const fmt = (n: number) => n.toFixed(2).replace(".", ",");
  const fmtDate = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const fmtDateFile = (d: Date) => d.toISOString().split("T")[0];

  const tmpId = randomBytes(8).toString("hex");
  const genPath = process.env.PDF_GENERATOR_PATH || path.join(process.cwd(), "pdf-generator");
  const tmpFiles: string[] = [];

  try {
    // ── 1. Process signature ──
    let processedSigPath: string | null = null;
    if (user.signaturePath && existsSync(user.signaturePath)) {
      processedSigPath = `/tmp/sig_${tmpId}.png`;
      try {
        execSync(`python3 ${genPath}/process_signature.py "${user.signaturePath}" "${processedSigPath}"`, { timeout: 10000 });
        tmpFiles.push(processedSigPath);
      } catch { processedSigPath = user.signaturePath; }
    }

    // ── 2. Generate Reisekostenabrechnung ──
    const rkInput = {
      profile: {
        lastName: user.lastName || "",
        firstName: user.firstName || "",
        street: user.street || "",
        zip: user.zipCode || "",
        city: user.city || "",
        accountHolder: user.accountHolder || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        bank: user.bank || "",
        iban: user.ibanEncrypted || "",
        bic: user.bic || "",
        signaturePath: processedSigPath,
      },
      trip: {
        purpose: trip.purpose,
        route: trip.route || "",
        startDate: fmtDate(trip.startDate),
        startTime: trip.startTime || "",
        endDate: fmtDate(trip.endDate || trip.startDate),
        endTime: trip.endTime || "",
        mode: trip.travelMode,
        pkwReason: trip.pkwReason || "",
        licensePlate: trip.licensePlate || "",
        km: trip.travelMode === "PRIVAT_PKW" ? Math.round(byC("FAHRT") / 0.20) : 0,
      },
      costs: {
        travel: fmt(byC("FAHRT")),
        kmMoney: fmt(trip.travelMode === "PRIVAT_PKW" ? byC("FAHRT") : 0),
        lodging: fmt(byC("UNTERKUNFT")),
        meals: fmt(byC("VERPFLEGUNG")),
        other: fmt(byC("NEBENKOSTEN")),
        subtotal: fmt(total),
        reimbursement: fmt(0),
        total: fmt(total),
      },
      checkboxes: {
        bankKnown: true,
        bahn: trip.travelMode === "BAHN",
        auto: trip.travelMode === "PRIVAT_PKW",
        dienstwagen: trip.travelMode === "DIENSTWAGEN",
        flugzeug: trip.travelMode === "FLUGZEUG",
        schiff: false,
        co2: trip.co2Offset || false,
      },
    };

    const rkInputPath = `/tmp/rk_input_${tmpId}.json`;
    const rkOutputPath = `/tmp/rk_output_${tmpId}.pdf`;
    writeFileSync(rkInputPath, JSON.stringify(rkInput));
    tmpFiles.push(rkInputPath, rkOutputPath);

    execSync(`python3 ${genPath}/generate_reisekosten.py ${rkInputPath} ${rkOutputPath}`, { timeout: 30000 });

    // ── 3. Build merge list ──
    const mergeFiles: Array<{ path: string; label: string }> = [];

    // Reisekostenabrechnung first
    mergeFiles.push({ path: rkOutputPath, label: "Reisekostenabrechnung" });

    // TODO: Handyticket-Erklärung (generate if any handytickets)
    // const handytickets = receipts.filter(r => r.isHandyticket);
    // if (handytickets.length > 0) { ... }

    // All receipt files (Belege)
    for (const receipt of receipts) {
      if (receipt.filePath && existsSync(receipt.filePath)) {
        const label = receipt.description || `Beleg ${receipt.category}`;
        mergeFiles.push({ path: receipt.filePath, label });
      }
    }

    // ── 4. Merge into one PDF ──
    const mergeInputPath = `/tmp/merge_input_${tmpId}.json`;
    const mergeOutputPath = `/tmp/merge_output_${tmpId}.pdf`;
    writeFileSync(mergeInputPath, JSON.stringify({ files: mergeFiles }));
    tmpFiles.push(mergeInputPath, mergeOutputPath);

    execSync(`python3 ${genPath}/merge_package.py ${mergeInputPath} ${mergeOutputPath}`, { timeout: 60000 });

    const pdf = readFileSync(mergeOutputPath);

    // ── 5. Filename: YYYY-MM-DD_Reisezweck_Nachname.pdf ──
    const safePurpose = trip.purpose
      .replace(/[^a-zA-ZäöüÄÖÜß0-9\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 40);
    const filename = `${fmtDateFile(trip.startDate)}_${safePurpose}_${user.lastName || "Abrechnung"}.pdf`;

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    console.error("PDF generation error:", e.message);
    return NextResponse.json({ error: "PDF-Generierung fehlgeschlagen: " + e.message }, { status: 500 });
  } finally {
    for (const f of tmpFiles) {
      try { unlinkSync(f); } catch {}
    }
  }
}
