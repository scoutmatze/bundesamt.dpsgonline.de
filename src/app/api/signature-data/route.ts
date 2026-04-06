import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { writeFileSync, mkdirSync, existsSync } from "fs";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { sessionToken: token }, include: { user: true } });
  if (!session || session.expires < new Date()) return null;
  return session.user;
}

// POST: Save canvas signature as PNG file
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dataUrl } = await req.json();
  if (!dataUrl || !dataUrl.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "Invalid signature data" }, { status: 400 });
  }

  const sigDir = "/app/uploads/signatures";
  if (!existsSync(sigDir)) mkdirSync(sigDir, { recursive: true });

  const sigPath = `${sigDir}/${user.id}_canvas.png`;
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
  writeFileSync(sigPath, Buffer.from(base64Data, "base64"));

  await prisma.user.update({
    where: { id: user.id },
    data: { signaturePath: sigPath, signatureData: dataUrl },
  });

  return NextResponse.json({ ok: true, path: sigPath });
}

// GET: Get current signature data URL
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ signatureData: user.signatureData || null, signaturePath: user.signaturePath || null });
}
