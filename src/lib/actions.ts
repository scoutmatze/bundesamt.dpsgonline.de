"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tripSchema, receiptSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─── Trips ───

export async function createTrip(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht eingeloggt");

  const data = tripSchema.parse({
    purpose: formData.get("purpose"),
    route: formData.get("route") || undefined,
    startDate: formData.get("startDate"),
    startTime: formData.get("startTime") || undefined,
    endDate: formData.get("endDate") || undefined,
    endTime: formData.get("endTime") || undefined,
    travelMode: formData.get("travelMode") || "BAHN",
    pkwReason: formData.get("pkwReason") || undefined,
    licensePlate: formData.get("licensePlate") || undefined,
  });

  const trip = await prisma.trip.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      userId: session.user.id,
    },
  });

  revalidatePath("/reisen");
  redirect(`/reisen/${trip.id}`);
}

export async function deleteTrip(tripId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht eingeloggt");

  await prisma.trip.delete({
    where: { id: tripId, userId: session.user.id },
  });

  revalidatePath("/reisen");
  redirect("/reisen");
}

export async function updateTripRoute(tripId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht eingeloggt");

  // Auto-build route from FAHRT receipts
  const receipts = await prisma.receipt.findMany({
    where: {
      tripId,
      category: "FAHRT",
      fromStation: { not: null },
      toStation: { not: null },
    },
    orderBy: { date: "asc" },
  });

  if (receipts.length > 0) {
    const segments = receipts.map((r) => r.fromStation!);
    segments.push(receipts[receipts.length - 1].toStation!);
    const route = segments.join(" – ");

    await prisma.trip.update({
      where: { id: tripId, userId: session.user.id },
      data: { route },
    });
  }

  revalidatePath(`/reisen/${tripId}`);
}

// ─── Receipts ───

export async function addReceipt(tripId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht eingeloggt");

  // Verify trip ownership
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: session.user.id },
  });
  if (!trip) throw new Error("Reise nicht gefunden");

  const data = receiptSchema.parse({
    description: formData.get("description") || undefined,
    amount: parseFloat(formData.get("amount") as string),
    date: formData.get("date"),
    category: formData.get("category"),
    fromStation: formData.get("fromStation") || undefined,
    toStation: formData.get("toStation") || undefined,
    isHandyticket: formData.get("isHandyticket") === "true",
  });

  await prisma.receipt.create({
    data: {
      ...data,
      date: new Date(data.date),
      tripId,
    },
  });

  // Auto-update route
  await updateTripRoute(tripId);

  revalidatePath(`/reisen/${tripId}`);
}

export async function deleteReceipt(receiptId: string, tripId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht eingeloggt");

  // Verify ownership through trip
  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId, trip: { userId: session.user.id } },
  });
  if (!receipt) throw new Error("Beleg nicht gefunden");

  await prisma.receipt.delete({ where: { id: receiptId } });
  await updateTripRoute(tripId);

  revalidatePath(`/reisen/${tripId}`);
}

export async function toggleHandyticket(receiptId: string, tripId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht eingeloggt");

  const receipt = await prisma.receipt.findFirst({
    where: { id: receiptId, trip: { userId: session.user.id } },
  });
  if (!receipt) throw new Error("Beleg nicht gefunden");

  await prisma.receipt.update({
    where: { id: receiptId },
    data: { isHandyticket: !receipt.isHandyticket },
  });

  revalidatePath(`/reisen/${tripId}`);
}

// ─── Profile ───

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht eingeloggt");

  const { encrypt } = await import("@/lib/encryption");

  const iban = formData.get("iban") as string;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      name: `${formData.get("firstName")} ${formData.get("lastName")}`,
      street: formData.get("street") as string,
      zipCode: formData.get("zipCode") as string,
      city: formData.get("city") as string,
      ibanEncrypted: iban ? encrypt(iban) : undefined,
      bic: formData.get("bic") as string,
      bank: formData.get("bank") as string,
      accountHolder: formData.get("accountHolder") as string,
    },
  });

  revalidatePath("/profil");
  revalidatePath("/reisen");
}
