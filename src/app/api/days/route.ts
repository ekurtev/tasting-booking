import { availableDays } from "@/lib/booking";
import { error, json, MESSAGES } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const consultantId = Number(params.get("consultant"));
  const typeId = Number(params.get("type"));
  if (!Number.isInteger(consultantId) || !Number.isInteger(typeId)) return error(400, "bad_request", MESSAGES.badRequest);
  const days = await availableDays(consultantId, typeId);
  if (!days) return error(404, "invalid_choice", MESSAGES.invalidChoice);
  return json({ days });
}
