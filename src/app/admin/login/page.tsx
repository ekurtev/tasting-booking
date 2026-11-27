import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminBySessionToken, SESSION_COOKIE } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Вход за администратори", robots: { index: false, follow: false } };

export default async function LoginPage() {
  const admin = await getAdminBySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (admin) redirect("/admin");
  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <h1>Вход</h1>
      <p className="meta">Административен панел на „Сладка кутия“.</p>
      <LoginForm />
    </div>
  );
}
