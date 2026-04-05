import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
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
  const inFile = `${tmp}.json`, outFile = `${tmp}.pdf`;
  writeFileSync(inFile, JSON.stringify(input));

  try {
    execSync(`python3 /app/pdf-generator/generate_sachkosten.py ${inFile} ${outFile}`, { timeout: 30000 });
    const pdf = readFileSync(outFile);
    unlinkSync(inFile); unlinkSync(outFile);
    const fn = `Sachkosten_Q${sk.quarter}_${sk.year}.pdf`;
    return new NextResponse(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${fn}"` } });
  } catch (e: any) {
    return NextResponse.json({ error: "PDF generation failed: " + e.message }, { status: 500 });
  }
}
