import { statusSchema, updateBookingStatus } from "@/lib/admin";
import { requireAdminApi } from "@/lib/auth";
import { error, json, readJson, validationError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi(request);
  if (admin instanceof Response) return admin;
  const { id } = await params;
  const parsed = statusSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error.issues);
  const result = await updateBookingStatus(id, parsed.data.status);
  if (result === "not_found") return error(404, "not_found", "Резервацията не е намерена.");
  if (result === "invalid_transition") {
    return error(409, "invalid_transition", "Статусът може да се промени само на потвърдена резервация.");
  }
  if (result === "not_started") {
    return error(409, "not_started", "Резервацията още не е започнала — може само да бъде отменена.");
  }
  return json({ ok: true, status: parsed.data.status });
}
