import { z } from "zod";
import { isSameOrigin, login, sessionCookie } from "@/lib/auth";
import { error, json, MESSAGES, readJson } from "@/lib/http";
import { clientIp, hit, RULES } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().min(3).max(254), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return error(403, "forbidden", "Невалиден произход на заявката.");
  const parsed = schema.safeParse(await readJson(request));
  const ip = clientIp(request.headers);
  const email = parsed.success ? parsed.data.email.toLowerCase() : "";
  if (!hit(RULES.loginIp, ip) || !hit(RULES.login, `${ip}:${email}`)) {
    return error(429, "rate_limited", MESSAGES.rateLimited);
  }
  if (!parsed.success) return error(400, "bad_request", "Въведете имейл и парола.");

  const session = await login(parsed.data.email, parsed.data.password);
  if (!session) return error(401, "invalid_credentials", "Грешен имейл или парола.");

  const res = json({ ok: true });
  res.headers.append("Set-Cookie", sessionCookie(session.token, session.expires));
  return res;
}
