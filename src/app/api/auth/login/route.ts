import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const allowed = ["@dpsg.de", "@dpsgonline.de", "@bundesamt.dpsgonline.de"];
  if (!email || !allowed.some(d => email.endsWith(d))) {
    return NextResponse.json({ error: "Nur @dpsg.de E-Mail-Adressen erlaubt" }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email } });
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
