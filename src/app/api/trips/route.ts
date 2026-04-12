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

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const trips = await prisma.trip.findMany({
    where: { userId },
    include: { receipts: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(trips);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const trip = await prisma.trip.create({
    data: {
      userId,
      purpose: data.purpose,
      route: data.route || null,
      startDate: new Date(data.startDate),
      startTime: data.startTime || null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      endTime: data.endTime || null,
      travelMode: data.travelMode || "BAHN",
      pkwReason: data.pkwReason || null,
      licensePlate: data.licensePlate || null,
      mietwagenApproved: data.mietwagenApproved || false,
    },
    include: { receipts: true },
  });
  return NextResponse.json(trip, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.trip.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const trip = await prisma.trip.findFirst({ where: { id: data.id, userId } });
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.trip.update({
    where: { id: data.id },
    data: {
      purpose: data.purpose ?? trip.purpose,
      route: data.route ?? (data.kmLegs ? undefined : trip.route),
      notes: data.notes ?? trip.notes,
      kmLegs: data.kmLegs ?? trip.kmLegs,
      kmTotal: data.kmTotal ?? trip.kmTotal,
      kmAmount: data.kmAmount ?? trip.kmAmount,
      startDate: data.startDate ? new Date(data.startDate) : trip.startDate,
      endDate: data.endDate ? new Date(data.endDate) : trip.endDate,
      startTime: data.startTime ?? trip.startTime,
      status: data.status ?? trip.status,
      endTime: data.endTime ?? trip.endTime,
    },
  });
  return NextResponse.json(updated);
}
