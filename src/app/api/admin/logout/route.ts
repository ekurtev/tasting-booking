import { clearedSessionCookie, logout, readSessionCookie, requireAdminApi } from "@/lib/auth";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (admin instanceof Response) return admin;
  await logout(readSessionCookie(request.headers.get("cookie")));
  const res = json({ ok: true });
  res.headers.append("Set-Cookie", clearedSessionCookie());
  return res;
}
