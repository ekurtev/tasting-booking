/**
 * Minimal in-memory sliding-window rate limiter. Good enough for a single app container;
 * counters reset on restart.
 */
const buckets = new Map<string, number[]>();

export interface RateLimitRule {
  name: string;
  limit: number;
  windowMs: number;
}

export const RULES = {
  booking: { name: "booking", limit: 5, windowMs: 10 * 60_000 },
  cancel: { name: "cancel", limit: 10, windowMs: 10 * 60_000 },
  /** Per client IP + email. */
  login: { name: "login", limit: 5, windowMs: 15 * 60_000 },
  /** Per client IP across all emails. */
  loginIp: { name: "login-ip", limit: 20, windowMs: 15 * 60_000 },
} satisfies Record<string, RateLimitRule>;

/** Returns true if the call is allowed and records it. */
export function hit(rule: RateLimitRule, key: string, now = Date.now()): boolean {
  const id = `${rule.name}:${key}`;
  const recent = (buckets.get(id) ?? []).filter((t) => now - t < rule.windowMs);
  if (recent.length >= rule.limit) {
    buckets.set(id, recent);
    return false;
  }
  recent.push(now);
  buckets.set(id, recent);
  if (buckets.size > 10_000) sweep(now);
  return true;
}

function sweep(now: number) {
  for (const [id, times] of buckets) {
    if (times.every((t) => now - t > 60 * 60_000)) buckets.delete(id);
  }
}

export function resetRateLimits() {
  buckets.clear();
}

const IP_RE = /^[0-9a-fA-F:.]{2,45}$/;

/**
 * Client IP for rate limiting. Behind NGINX Proxy Manager, X-Real-IP is set by the proxy to the
 * TCP peer address and overwrites anything the client sent. Otherwise we use the LAST hop of
 * X-Forwarded-For (appended by the nearest proxy); the first value is client-controlled and is
 * never trusted. Without any proxy (local development) all requests share the "local" key.
 */
export function clientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp && IP_RE.test(realIp)) return realIp;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const last = xff.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
    if (last && IP_RE.test(last)) return last;
  }
  return "local";
}
