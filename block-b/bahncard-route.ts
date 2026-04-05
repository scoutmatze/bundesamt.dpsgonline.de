import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

async function getUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { sessionToken: token }, select: { userId: true, expires: true } });
  if (!session || session.expires < new Date()) return null;
  return session.userId;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items: any[] = await prisma.$queryRaw`
    SELECT * FROM "BahnCard" WHERE "userId" = ${userId} ORDER BY year DESC
  `;
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const id = "bc" + randomBytes(12).toString("hex");

  await prisma.$executeRaw`
    INSERT INTO "BahnCard" (id, "userId", year, "cardType", class, cost,
      "validFrom", "validTo", "bahnCardNr", justification, notes)
    VALUES (${id}, ${userId}, ${data.year}, ${data.cardType || "BC50"}, ${data.class || 2},
      ${data.cost || 0},
      ${data.validFrom ? new Date(data.validFrom) : null},
      ${data.validTo ? new Date(data.validTo) : null},
      ${data.bahnCardNr || null}, ${data.justification || null}, ${data.notes || null})
  `;

  return NextResponse.json({ id }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();

  await prisma.$executeRaw`
    UPDATE "BahnCard" SET
      "cardType" = ${data.cardType || "BC50"}, class = ${data.class || 2},
      cost = ${data.cost || 0},
      "validFrom" = ${data.validFrom ? new Date(data.validFrom) : null},
      "validTo" = ${data.validTo ? new Date(data.validTo) : null},
      "bahnCardNr" = ${data.bahnCardNr || null},
      justification = ${data.justification || null},
      notes = ${data.notes || null}, "updatedAt" = NOW()
    WHERE id = ${data.id} AND "userId" = ${userId}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.$executeRaw`
    DELETE FROM "BahnCard" WHERE id = ${id} AND "userId" = ${userId}
  `;
  return NextResponse.json({ ok: true });
}
