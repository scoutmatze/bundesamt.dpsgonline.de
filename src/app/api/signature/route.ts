import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import path from "path";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });
  if (!session || session.expires < new Date()) return null;
  return session.user;
}

// Upload signature
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("signature") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Validate
  const validTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: "PNG, JPG oder WebP erforderlich" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 5 MB" }, { status: 400 });
  }

  // Save file
  const sigDir = "/app/uploads/signatures";
  if (!existsSync(sigDir)) mkdirSync(sigDir, { recursive: true });

  const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
  const sigPath = path.join(sigDir, `${user.id}${ext}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(sigPath, buffer);

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: { signaturePath: sigPath },
  });

  return NextResponse.json({ ok: true, path: sigPath });
}

// Get signature as image
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!user.signaturePath || !existsSync(user.signaturePath)) {
    return NextResponse.json({ error: "No signature" }, { status: 404 });
  }

  const data = readFileSync(user.signaturePath);
  const ext = path.extname(user.signaturePath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  return new NextResponse(data, {
    headers: { "Content-Type": mime, "Cache-Control": "private, max-age=3600" },
  });
}

// Delete signature
export async function DELETE() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { signaturePath: null },
  });

  return NextResponse.json({ ok: true });
}
