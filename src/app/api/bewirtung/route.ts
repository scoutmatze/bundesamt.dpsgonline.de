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
    SELECT * FROM "Bewirtung" WHERE "userId" = ${userId} ORDER BY date DESC
  `;
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const id = "bw" + randomBytes(12).toString("hex");
  const total = (parseFloat(data.amountFood) || 0) + (parseFloat(data.amountDrinks) || 0) + (parseFloat(data.amountTip) || 0);

  await prisma.$executeRaw`
    INSERT INTO "Bewirtung" (id, "userId", "tripId", date, location, occasion, participants,
      "amountFood", "amountDrinks", "amountTip", "amountTotal", notes)
    VALUES (${id}, ${userId}, ${data.tripId || null}, ${new Date(data.date)},
      ${data.location}, ${data.occasion}, ${JSON.stringify(data.participants || [])},
      ${parseFloat(data.amountFood) || 0}, ${parseFloat(data.amountDrinks) || 0}, ${parseFloat(data.amountTip) || 0},
      ${total}, ${data.notes || null})
  `;

  return NextResponse.json({ id }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const total = (parseFloat(data.amountFood) || 0) + (parseFloat(data.amountDrinks) || 0) + (parseFloat(data.amountTip) || 0);

  await prisma.$executeRaw`
    UPDATE "Bewirtung" SET
      date = ${new Date(data.date)}, location = ${data.location}, occasion = ${data.occasion},
      participants = ${JSON.stringify(data.participants || [])},
      "amountFood" = ${parseFloat(data.amountFood) || 0}, "amountDrinks" = ${parseFloat(data.amountDrinks) || 0},
      "amountTip" = ${parseFloat(data.amountTip) || 0}, "amountTotal" = ${total},
      notes = ${data.notes || null}, "tripId" = ${data.tripId || null}, "updatedAt" = NOW()
    WHERE id = ${data.id} AND "userId" = ${userId}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.$executeRaw`
    DELETE FROM "Bewirtung" WHERE id = ${id} AND "userId" = ${userId}
  `;
  return NextResponse.json({ ok: true });
}
