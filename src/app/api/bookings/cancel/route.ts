import { cancelBookingByToken } from "@/lib/booking";
import { error, json, MESSAGES, readJson } from "@/lib/http";
import { clientIp, hit, RULES } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hit(RULES.cancel, clientIp(request.headers))) return error(429, "rate_limited", MESSAGES.rateLimited);

  const body = (await readJson(request)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const result = await cancelBookingByToken(token);
  if (result.ok) return json({ status: "cancelled" });
  switch (result.reason) {
    case "too_late":
      return error(409, "too_late", MESSAGES.tooLate, { phone: process.env.CONTACT_PHONE ?? "" });
    case "not_cancellable":
      return error(409, "not_cancellable", MESSAGES.notCancellable);
    default:
      return error(404, "not_found", MESSAGES.notFound);
  }
}
