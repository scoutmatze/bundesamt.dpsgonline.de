import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dpsg-session")?.value;
  if (token) {
    const session = await prisma.session.findUnique({ where: { sessionToken: token }, select: { expires: true } });
    if (session && session.expires > new Date()) {
      redirect("/dashboard");
    }
  }
  redirect("/login");
}
