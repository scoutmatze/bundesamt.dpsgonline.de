import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

async function getUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { sessionToken: token }, select: { userId: true, expires: true } });
  if (!session || session.expires < new Date()) return null;
  return session.userId;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string;  // bewirtung, sachkosten, bahncard
  const id = formData.get("id") as string;       // record ID

  if (!file || !type || !id) return NextResponse.json({ error: "file, type, id required" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Max 10 MB" }, { status: 400 });

  const dir = `/app/uploads/${type}`;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fp = path.join(dir, `${Date.now()}_${safe}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(fp, buffer);

  // Update the correct table
  if (type === "bewirtung") {
    await prisma.$executeRaw`UPDATE "Bewirtung" SET "fileName"=${safe}, "filePath"=${fp} WHERE id=${id} AND "userId"=${userId}`;
  } else if (type === "bahncard") {
  } else if (type === "bahncard-receipt") {
    await prisma.$executeRaw`UPDATE "BahnCard" SET "receiptFileName"=${safe}, "receiptFilePath"=${fp} WHERE id=${id} AND "userId"=${userId}`;

    await prisma.$executeRaw`UPDATE "BahnCard" SET "fileName"=${safe}, "filePath"=${fp} WHERE id=${id} AND "userId"=${userId}`;
  } else if (type === "receipt") {
    // Just save file, return path (receipt creation handles the rest)
  } else if (type === "sachkosten") {
    // id = SachkostenItem ID, verify via join
    await prisma.$executeRaw`
      UPDATE "SachkostenItem" SET "fileName"=${safe}, "filePath"=${fp}
      WHERE id=${id} AND "sachkostenId" IN (SELECT id FROM "Sachkosten" WHERE "userId"=${userId})
    `;
  }

  return NextResponse.json({ ok: true, fileName: safe, filePath: fp });
}
