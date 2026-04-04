import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/send-email";

const ALLOWED_DOMAINS = ["@dpsg.de", "@dpsgonline.de", "@bundesamt.dpsgonline.de"];

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "E-Mail erforderlich" }, { status: 400 });

  const normalized = email.toLowerCase().trim();

  // Check domain
  const domainOk = ALLOWED_DOMAINS.some(d => normalized.endsWith(d));
  if (!domainOk) return NextResponse.json({ error: "Nur @dpsg.de E-Mail-Adressen erlaubt." }, { status: 403 });

  // Check if user exists (admin must pre-approve, except first user)
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      return NextResponse.json({
        error: "Dein Account wurde noch nicht freigeschaltet. Bitte wende dich an den*die Administrator*in."
      }, { status: 403 });
    }
  }

  // Generate 6-digit code
  const code = generateCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete old codes for this email
  await prisma.loginCode.deleteMany({ where: { email: normalized } });

  // Save code
  await prisma.loginCode.create({ data: { email: normalized, code, expires } });

  // Send code via email
  const sent = await sendEmail(
    normalized,
    `Dein Anmeldecode: ${code}`,
    `
    <div style="font-family:'PT Sans Narrow',system-ui,sans-serif;max-width:400px;margin:0 auto;padding:32px">
      <div style="background:#003056;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:20px">DPSG Reisekosten</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #d4d0c8;border-top:none;border-radius:0 0 12px 12px">
        <p style="color:#5c5850;margin:0 0 16px">Dein Anmeldecode:</p>
        <div style="background:#f5f3ef;padding:16px;border-radius:8px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#003056">${code}</div>
        <p style="color:#9e9a92;font-size:13px;margin:16px 0 0">Der Code ist 10 Minuten gültig.</p>
      </div>
      <p style="color:#9e9a92;font-size:12px;text-align:center;margin-top:16px">Gut Pfad! 🏕️</p>
    </div>
    `
  );

  if (!sent) {
    return NextResponse.json({ error: "E-Mail konnte nicht gesendet werden. Bitte versuche es erneut." }, { status: 500 });
  }

  return NextResponse.json({ codeSent: true });
}
