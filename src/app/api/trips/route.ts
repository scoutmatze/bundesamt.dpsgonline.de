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
