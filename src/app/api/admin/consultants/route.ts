import { listConsultants } from "@/lib/admin";
import { requireAdminApi } from "@/lib/auth";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (admin instanceof Response) return admin;
  return json({ consultants: await listConsultants() });
}
