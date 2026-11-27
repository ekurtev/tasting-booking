import { bookingInputSchema, createBooking } from "@/lib/booking";
import { error, json, MESSAGES, readJson } from "@/lib/http";
import { clientIp, hit, RULES } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hit(RULES.booking, clientIp(request.headers))) return error(429, "rate_limited", MESSAGES.rateLimited);

  const parsed = bookingInputSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= issue.message;
    }
    return error(400, "validation", MESSAGES.badRequest, { fieldErrors });
  }

  const result = await createBooking(parsed.data);
  if (result.ok) return json({ token: result.token }, 201);
  switch (result.reason) {
    case "slot_taken":
      return error(409, "slot_taken", MESSAGES.slotTaken);
    case "slot_unavailable":
      return error(409, "slot_unavailable", MESSAGES.slotUnavailable);
    default:
      return error(422, "invalid_choice", MESSAGES.invalidChoice);
  }
}
