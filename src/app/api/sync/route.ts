import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { execSync } from "child_process";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { sessionToken: token }, include: { user: true } });
  if (!session || session.expires < new Date()) return null;
  return session.user;
}

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = execSync(
      "cd /app/scripts && node poll-emails.mjs 2>&1 || true",
      { timeout: 60000, env: process.env as any }
    ).toString();

    // Count processed
    const match = result.match(/Done: (\d+)/);
    const count = match ? parseInt(match[1]) : 0;

    // Count new receipts (from "✓" lines)
    const newReceipts = (result.match(/✓/g) || []).length;

    return NextResponse.json({
      ok: true,
      processed: count,
      newReceipts,
      message: count > 0
        ? `${newReceipts} neue(r) Beleg(e) importiert`
        : "Keine neuen Belege",
    });
  } catch (e: any) {
    const output = e.stdout?.toString() || e.message;
    return NextResponse.json({
      ok: false,
      error: "Sync fehlgeschlagen",
      message: output.includes("IMAP connected") ? "Keine neuen E-Mails" : output.substring(0, 200),
    }, { status: 500 });
  }
}
