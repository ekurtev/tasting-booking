import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

async function headersFor(source: string) {
  const rules = (await nextConfig.headers?.()) ?? [];
  const rule = rules.find((r) => r.source === source);
  return Object.fromEntries((rule?.headers ?? []).map((h) => [h.key, h.value]));
}

describe("security headers (next.config.ts)", () => {
  it("sends a same-origin CSP and HSTS on every page", async () => {
    const h = await headersFor("/:path*");
    const csp = h["Content-Security-Policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).not.toContain("'unsafe-eval'"); // only for `next dev`
    expect(csp).not.toMatch(/https?:|\*/); // no third-party origins or wildcards
    expect(h["Strict-Transport-Security"]).toBe("max-age=31536000");
    expect(h["X-Frame-Options"]).toBe("DENY");
  });

  it("keeps no-referrer and noindex on the personal booking page", async () => {
    const h = await headersFor("/booking/:token*");
    expect(h["Referrer-Policy"]).toBe("no-referrer");
    expect(h["X-Robots-Tag"]).toBe("noindex, nofollow");
    expect(h["Cache-Control"]).toBe("no-store");
  });
});
