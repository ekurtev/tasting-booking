import { activeBookingsOnDay, addDayOff, dayOffSchema, removeDayOff } from "@/lib/admin";
import { requireAdminApi } from "@/lib/auth";
import { error, json, parseId, readJson, validationError } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const admin = await requireAdminApi(request);
  if (admin instanceof Response) return admin;
  const id = parseId((await params).id);
  if (!id) return error(404, "not_found", "Консултантът не е намерен.");
  const parsed = dayOffSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error.issues);
  if (!(await addDayOff(id, parsed.data.day, parsed.data.note))) {
    return error(404, "not_found", "Консултантът не е намерен.");
  }
  // Existing bookings stay valid; report them so the admin can contact the customers.
  return json({ ok: true, existingBookings: await activeBookingsOnDay(id, parsed.data.day) }, 201);
}

export async function DELETE(request: Request, { params }: Ctx) {
  const admin = await requireAdminApi(request);
  if (admin instanceof Response) return admin;
  const id = parseId((await params).id);
  const day = new URL(request.url).searchParams.get("day") ?? "";
  if (!id || !(await removeDayOff(id, day))) return error(404, "not_found", "Почивният ден не е намерен.");
  return json({ ok: true });
}
