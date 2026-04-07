import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/send-email";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const ALLOWED_DOMAINS = ["@dpsg.de", "@dpsgonline.de", "@bundesamt.dpsgonline.de"];

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email) return NextResponse.json({ error: "E-Mail erforderlich" }, { status: 400 });

  const normalized = email.toLowerCase().trim();
  if (!checkRateLimit(normalized)) return NextResponse.json({ error: "Zu viele Versuche. Bitte 15 Minuten warten." }, { status: 429 });

  const domainOk = ALLOWED_DOMAINS.some(d => normalized.endsWith(d));
  if (!domainOk) return NextResponse.json({ error: "Nur DPSG E-Mail-Adressen erlaubt" }, { status: 403 });

  // Check if user exists and has password
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  // ── Password Login ──
  if (password) {
    if (!user || !user.password) {
      return NextResponse.json({ error: "Kein Passwort gesetzt. Bitte zuerst per Code einloggen." }, { status: 400 });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
    }

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

    return NextResponse.json({ ok: true, needsProfile: !user.firstName });
  }

  // ── Code Login (Fallback) ──
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeExpires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.loginCode.deleteMany({ where: { email: normalized } });
  await prisma.loginCode.create({ data: { email: normalized, code, expires: codeExpires } });

  // Try to send email
  const htmlBody = `
    <div style="font-family:system-ui,sans-serif;max-width:400px;margin:0 auto">
      <div style="background:#003056;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;text-align:center">
        <h2 style="margin:0;font-size:20px">DPSG Reisekosten</h2>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #d4d0c8;border-top:none;border-radius:0 0 12px 12px">
        <p style="color:#5c5850;font-size:14px">Dein Anmeldecode:</p>
        <div style="background:#f5f3ef;padding:16px;border-radius:8px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#003056">${code}</div>
        <p style="color:#9e9a92;font-size:12px;margin-top:16px">Code ist 10 Minuten gültig. Falls du diese Anmeldung nicht angefordert hast, ignoriere diese E-Mail.</p>
      </div>
    </div>`;

  const sent = await sendEmail(normalized, "Dein Anmeldecode: " + code, htmlBody);

  return NextResponse.json({
    codeSent: true,
    code,
    hasPassword: !!(user?.password),
  });
}
