import { availableSlots } from "@/lib/booking";
import { error, json, MESSAGES } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const consultantId = Number(params.get("consultant"));
  const typeId = Number(params.get("type"));
  const date = params.get("date") ?? "";
  if (!Number.isInteger(consultantId) || !Number.isInteger(typeId)) return error(400, "bad_request", MESSAGES.badRequest);
  const slots = await availableSlots(consultantId, typeId, date);
  if (!slots) return error(404, "invalid_choice", MESSAGES.invalidChoice);
  return json({ date, slots: slots.map((s) => s.toISOString()) });
}
