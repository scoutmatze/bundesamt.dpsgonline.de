import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } });
    cookieStore.delete("dpsg-session");
  }
  return NextResponse.json({ ok: true });
}
