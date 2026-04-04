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

  const { receiptId, targetTripId } = await req.json();

  // Verify receipt belongs to user
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { trip: { select: { userId: true } } },
  });
  if (!receipt || receipt.trip.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify target trip belongs to user
  const targetTrip = await prisma.trip.findFirst({ where: { id: targetTripId, userId } });
  if (!targetTrip) {
    return NextResponse.json({ error: "Target trip not found" }, { status: 404 });
  }

  // Move
  const oldTripId = receipt.tripId;
  await prisma.receipt.update({
    where: { id: receiptId },
    data: { tripId: targetTripId },
  });

  // Update routes for both trips
  for (const tripId of [oldTripId, targetTripId]) {
    const receipts = await prisma.receipt.findMany({
      where: { tripId, category: "FAHRT", fromStation: { not: null } },
      orderBy: { date: "asc" },
    });
    if (receipts.length > 0) {
      const route = receipts.map(r => r.fromStation).concat(receipts[receipts.length - 1].toStation!).join(" – ");
      await prisma.trip.update({ where: { id: tripId }, data: { route } });
    } else {
      await prisma.trip.update({ where: { id: tripId }, data: { route: null } });
    }
  }

  return NextResponse.json({ ok: true });
}
