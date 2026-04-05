import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { execSync } from "child_process";
import { randomBytes } from "crypto";
import path from "path";

async function getUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { sessionToken: token }, select: { userId: true, expires: true } });
  if (!session || session.expires < new Date()) return null;
  return session.userId;
}

// GET: List all Sachkosten for user
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.$queryRaw`
    SELECT s.*, 
      (SELECT COALESCE(json_agg(row_to_json(si.*) ORDER BY si.date), '[]'::json)
       FROM "SachkostenItem" si WHERE si."sachkostenId" = s.id) as items
    FROM "Sachkosten" s WHERE s."userId" = ${userId}
    ORDER BY s.year DESC, s.quarter DESC
  `;
  return NextResponse.json(items);
}

// POST: Create new Sachkostenabrechnung
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const id = "sk" + randomBytes(12).toString("hex");

  await prisma.$executeRaw`
    INSERT INTO "Sachkosten" (id, "userId", year, quarter, notes) 
    VALUES (${id}, ${userId}, ${data.year}, ${data.quarter}, ${data.notes || null})
  `;

  return NextResponse.json({ id }, { status: 201 });
}

// PUT: Update Sachkosten + items
export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  
  // Verify ownership
  const [sk]: any[] = await prisma.$queryRaw`
    SELECT id FROM "Sachkosten" WHERE id = ${data.id} AND "userId" = ${userId}
  `;
  if (!sk) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update notes
  if (data.notes !== undefined) {
    await prisma.$executeRaw`
      UPDATE "Sachkosten" SET notes = ${data.notes}, "updatedAt" = NOW() WHERE id = ${data.id}
    `;
  }

  // Upsert items
  if (data.items) {
    // Delete removed items
    const itemIds = data.items.filter((i: any) => i.id).map((i: any) => i.id);
    if (itemIds.length > 0) {
      await prisma.$executeRaw`
        DELETE FROM "SachkostenItem" WHERE "sachkostenId" = ${data.id} AND id != ALL(${itemIds}::text[])
      `;
    } else {
      await prisma.$executeRaw`
        DELETE FROM "SachkostenItem" WHERE "sachkostenId" = ${data.id}
      `;
    }

    for (const item of data.items) {
      const itemId = item.id || ("si" + randomBytes(12).toString("hex"));
      await prisma.$executeRaw`
        INSERT INTO "SachkostenItem" (id, "sachkostenId", date, description, amount)
        VALUES (${itemId}, ${data.id}, ${new Date(item.date)}, ${item.description}, ${item.amount})
        ON CONFLICT (id) DO UPDATE SET
          date = EXCLUDED.date, description = EXCLUDED.description, amount = EXCLUDED.amount
      `;
    }
  }

  return NextResponse.json({ ok: true });
}

// DELETE
export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.$executeRaw`
    DELETE FROM "Sachkosten" WHERE id = ${id} AND "userId" = ${userId}
  `;
  return NextResponse.json({ ok: true });
}
