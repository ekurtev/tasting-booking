import { beforeEach, describe, expect, it } from "vitest";
import { clientIp, hit, resetRateLimits } from "@/lib/rate-limit";

describe("clientIp", () => {
  it("prefers X-Real-IP set by the proxy", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1, 203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
  });

  it("never trusts the client-controlled first X-Forwarded-For value", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("ignores garbage and falls back to a shared local key", () => {
    expect(clientIp(new Headers({ "x-real-ip": "<script>" }))).toBe("local");
    expect(clientIp(new Headers())).toBe("local");
  });
});

describe("hit", () => {
  beforeEach(() => resetRateLimits());
  const rule = { name: "t", limit: 2, windowMs: 1000 };

  it("allows up to the limit inside the window, then blocks, then recovers", () => {
    expect(hit(rule, "a", 0)).toBe(true);
    expect(hit(rule, "a", 10)).toBe(true);
    expect(hit(rule, "a", 20)).toBe(false);
    expect(hit(rule, "b", 20)).toBe(true);
    expect(hit(rule, "a", 1011)).toBe(true);
  });
});
