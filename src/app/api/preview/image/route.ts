import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { existsSync, readFileSync } from "fs";

async function getUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { sessionToken: token }, select: { userId: true, expires: true } });
  if (!session || session.expires < new Date()) return null;
  return session.userId;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath || !filePath.startsWith("/app/uploads") || !existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const data = readFileSync(filePath);
  const ext = filePath.toLowerCase().split(".").pop();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": mime, "Cache-Control": "private, max-age=3600" } });
}
