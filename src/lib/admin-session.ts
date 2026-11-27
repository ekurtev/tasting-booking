import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminBySessionToken, SESSION_COOKIE, type Admin } from "./auth";

/** For admin pages/layouts: the signed-in admin, or a redirect to the sign-in page. */
export async function requireAdminPage(): Promise<Admin> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const admin = await getAdminBySessionToken(token);
  if (!admin) redirect("/admin/login");
  return admin;
}
