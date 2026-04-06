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
      fileName: data.fileName || null,
      filePath: data.filePath || null,
    },
  });

  // Auto-update route from stations
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

// UPDATE receipt (for editing amount on email-imported receipts)
export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();

  // Verify ownership
  const receipt = await prisma.receipt.findUnique({
    where: { id: data.id },
    include: { trip: { select: { userId: true } } },
  });
  if (!receipt || receipt.trip.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.receipt.update({
    where: { id: data.id },
    data: {
      description: data.description ?? receipt.description,
      amount: data.amount !== undefined ? parseFloat(data.amount) : receipt.amount,
      date: data.date ? new Date(data.date) : receipt.date,
      category: data.category ?? receipt.category,
      fromStation: data.fromStation ?? receipt.fromStation,
      toStation: data.toStation ?? receipt.toStation,
      isHandyticket: data.isHandyticket ?? receipt.isHandyticket,
    },
  });

  // Auto-update route
  if (data.fromStation || data.toStation) {
    const receipts = await prisma.receipt.findMany({
      where: { tripId: receipt.tripId, category: "FAHRT", fromStation: { not: null } },
      orderBy: { date: "asc" },
    });
    if (receipts.length > 0) {
      const route = receipts.map(r => r.fromStation).concat(receipts[receipts.length-1].toStation!).join(" – ");
      await prisma.trip.update({ where: { id: receipt.tripId }, data: { route } });
    }
  }

  return NextResponse.json(updated);
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
