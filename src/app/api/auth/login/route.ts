import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

// Allowed email domains
const ALLOWED_DOMAINS = ["@dpsg.de", "@dpsgonline.de", "@bundesamt.dpsgonline.de"];

// Approved users (first user auto-approved, rest need admin approval)
async function isApproved(email: string): Promise<{ approved: boolean; reason?: string }> {
  // Check domain
  const domainOk = ALLOWED_DOMAINS.some(d => email.toLowerCase().endsWith(d));
  if (!domainOk) return { approved: false, reason: "Nur E-Mail-Adressen mit @dpsg.de sind erlaubt." };

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return { approved: true };

  // New user: check if any users exist (first user = admin, auto-approved)
  const userCount = await prisma.user.count();
  if (userCount === 0) return { approved: true };

  // New user + users exist: check allowlist
  // For now: auto-approve all @dpsg.de users
  // TODO: When admin panel exists, require approval
  return { approved: true };
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "E-Mail erforderlich" }, { status: 400 });

  const { approved, reason } = await isApproved(email);
  if (!approved) return NextResponse.json({ error: reason }, { status: 403 });

  let user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    user = await prisma.user.create({ data: { email: email.toLowerCase() } });
  }

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
