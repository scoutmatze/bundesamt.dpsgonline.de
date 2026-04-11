import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

async function getUserFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });
  if (!session || session.expires < new Date()) return null;
  return session.user;
}

export async function GET() {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let ibanDecrypted = "";
  if (user.ibanEncrypted) {
    try { const { decrypt } = await import("@/lib/encryption"); ibanDecrypted = decrypt(user.ibanEncrypted); } catch { ibanDecrypted = ""; }
  }
  return NextResponse.json({ ...user, ibanDecrypted });
}

export async function PUT(req: NextRequest) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      street: data.street,
      zipCode: data.zipCode,
      city: data.city,
      bank: data.bank,
      title: data.title,
      gremium: data.gremium,
      bic: data.bic,
      ibanEncrypted: data.iban ? (await import('@/lib/encryption')).encrypt(data.iban) : undefined,
      accountHolder: data.accountHolder,
    },
  });
  return NextResponse.json(updated);
}
