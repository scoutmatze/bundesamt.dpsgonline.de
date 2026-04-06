import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";

async function getUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { sessionToken: token }, select: { userId: true, expires: true } });
  if (!session || session.expires < new Date()) return null;
  return session.userId;
}

// GET: List inbox items
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items: any[] = await prisma.$queryRaw`
    SELECT * FROM "InboxItem" WHERE "userId"=${userId} ORDER BY "createdAt" DESC
  `;
  return NextResponse.json(items);
}

// POST: Assign item to a target (trip receipt, sachkosten, bewirtung, bahncard)
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const { itemId, targetType, targetId } = data;

  // Verify ownership
  const [item]: any[] = await prisma.$queryRaw`
    SELECT * FROM "InboxItem" WHERE id=${itemId} AND "userId"=${userId}
  `;
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (targetType === "trip") {
    // Create receipt in trip
    const rid = "c" + randomBytes(12).toString("hex");
    await prisma.$executeRaw`
      INSERT INTO "Receipt" (id, "tripId", description, amount, date, category, "fileName", "filePath", "mimeType", "fileSize", "createdAt")
      VALUES (${rid}, ${targetId}, ${item.subject || item.fileName}, 0, NOW(), 'NEBENKOSTEN', ${item.fileName}, ${item.filePath}, ${item.mimeType}, ${item.fileSize}, NOW())
    `;
  } else if (targetType === "sachkosten") {
    const sid = "si" + randomBytes(12).toString("hex");
    await prisma.$executeRaw`
      INSERT INTO "SachkostenItem" (id, "sachkostenId", date, description, amount, "fileName", "filePath", "createdAt")
      VALUES (${sid}, ${targetId}, NOW(), ${item.subject || item.fileName}, 0, ${item.fileName}, ${item.filePath}, NOW())
    `;
  } else if (targetType === "bewirtung") {
    await prisma.$executeRaw`
      UPDATE "Bewirtung" SET "fileName"=${item.fileName}, "filePath"=${item.filePath} WHERE id=${targetId} AND "userId"=${userId}
    `;
  } else if (targetType === "bahncard") {
    await prisma.$executeRaw`
      UPDATE "BahnCard" SET "fileName"=${item.fileName}, "filePath"=${item.filePath} WHERE id=${targetId} AND "userId"=${userId}
    `;
  }

  // Mark as assigned
  await prisma.$executeRaw`
    UPDATE "InboxItem" SET status='ASSIGNED', "assignedTo"=${targetId}, "assignedType"=${targetType} WHERE id=${itemId}
  `;

  return NextResponse.json({ ok: true });
}

// DELETE
export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.$executeRaw`DELETE FROM "InboxItem" WHERE id=${id} AND "userId"=${userId}`;
  return NextResponse.json({ ok: true });
}
