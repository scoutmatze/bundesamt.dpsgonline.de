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
    const result = execSync("node /app/scripts/poll-emails.mjs", {
      timeout: 60000,
      env: process.env as any,
    }).toString();

    const match = result.match(/Done: (\d+)/);
    const count = match ? parseInt(match[1]) : 0;

    return NextResponse.json({ ok: true, processed: count, log: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, log: e.stdout?.toString() || "" }, { status: 500 });
  }
}
