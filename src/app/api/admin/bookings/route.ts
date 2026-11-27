import { listBookingsForDay } from "@/lib/admin";
import { requireAdminApi } from "@/lib/auth";
import { error, json, MESSAGES, parseId } from "@/lib/http";
import { isValidDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (admin instanceof Response) return admin;
  const params = new URL(request.url).searchParams;
  const consultantId = parseId(params.get("consultant"));
  const date = params.get("date") ?? "";
  if (!consultantId || !isValidDate(date)) return error(400, "bad_request", MESSAGES.badRequest);
  return json({ bookings: await listBookingsForDay(consultantId, date) });
}
