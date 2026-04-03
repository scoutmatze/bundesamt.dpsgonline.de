import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

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
  const data = await req.json();

  // Verify trip belongs to user
  const trip = await prisma.trip.findFirst({ where: { id: data.tripId, userId } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const receipt = await prisma.receipt.create({
    data: {
      tripId: data.tripId,
      description: data.description || null,
      amount: parseFloat(data.amount),
      date: new Date(data.date),
      category: data.category || "FAHRT",
      fromStation: data.fromStation || null,
      toStation: data.toStation || null,
      isHandyticket: data.isHandyticket || false,
    },
  });

  // Auto-update route
  if (data.fromStation && data.toStation) {
    const receipts = await prisma.receipt.findMany({
      where: { tripId: data.tripId, category: "FAHRT", fromStation: { not: null } },
      orderBy: { date: "asc" },
    });
    if (receipts.length > 0) {
      const route = receipts.map(r => r.fromStation).concat(receipts[receipts.length-1].toStation!).join(" – ");
      await prisma.trip.update({ where: { id: data.tripId }, data: { route } });
    }
  }

  return NextResponse.json(receipt, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, tripId } = await req.json();
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  await prisma.receipt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
