import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { existsSync } from "fs";
import { execSync } from "child_process";

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
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath || !existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Security: only allow files in /app/uploads
  if (!filePath.startsWith("/app/uploads")) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const ext = filePath.toLowerCase().split(".").pop();
    if (ext === "pdf") {
      const text = execSync(`python3 -c "
import pdfplumber
with pdfplumber.open('${filePath}') as pdf:
    for p in pdf.pages[:3]:
        t = p.extract_text()
        if t: print(t[:2000])
        print('---')
"`, { timeout: 10000 }).toString().trim();
      return NextResponse.json({ type: "pdf", text, fileName: filePath.split("/").pop() });
    } else if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
      return NextResponse.json({ type: "image", url: `/api/preview/image?path=${encodeURIComponent(filePath)}`, fileName: filePath.split("/").pop() });
    } else {
      return NextResponse.json({ type: "unknown", fileName: filePath.split("/").pop() });
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Preview failed: " + e.message }, { status: 500 });
  }
}
