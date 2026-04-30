import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const ALLOWED_DOMAINS = ["@dpsg.de", "@dpsgonline.de", "@bundesamt.dpsgonline.de"];

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "E-Mail und Passwort erforderlich" }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();

  const domainOk = ALLOWED_DOMAINS.some(d => normalized.endsWith(d));
  if (!domainOk) {
    return NextResponse.json({ error: "Nur DPSG E-Mail-Adressen erlaubt (@dpsg.de, @dpsgonline.de)" }, { status: 403 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Passwort muss mindestens 6 Zeichen haben" }, { status: 400 });
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    return NextResponse.json({ error: "Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an." }, { status: 409 });
  }

  // Create user with password
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email: normalized, password: hashed },
  });

  // Create session
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { sessionToken: token, userId: user.id, expires } });

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set("dpsg-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/",
  });

  return NextResponse.json({ ok: true, needsProfile: true });
}
