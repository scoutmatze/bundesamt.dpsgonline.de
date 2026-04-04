import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();
  if (!email || !code) return NextResponse.json({ error: "E-Mail und Code erforderlich" }, { status: 400 });

  const normalized = email.toLowerCase().trim();

  // Find valid code
  const loginCode = await prisma.loginCode.findFirst({
    where: {
      email: normalized,
      code,
      used: false,
      expires: { gt: new Date() },
    },
  });

  if (!loginCode) {
    return NextResponse.json({ error: "Ungültiger oder abgelaufener Code." }, { status: 401 });
  }

  // Mark code as used
  await prisma.loginCode.update({ where: { id: loginCode.id }, data: { used: true } });

  // Find or create user (first user = admin)
  const userCount = await prisma.user.count();
  let user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: normalized, role: userCount === 0 ? "ADMIN" : "USER" },
    });
  }

  // Create session
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { sessionToken: token, userId: user.id, expires },
  });

  const cookieStore = await cookies();
  cookieStore.set("dpsg-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/",
  });

  return NextResponse.json({ ok: true, needsProfile: !user.firstName });
}
