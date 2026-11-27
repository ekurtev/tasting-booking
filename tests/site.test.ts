import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { company } from "@/content/company";
import { INFO_LINKS, LEGAL_LINKS } from "@/content/site";
import { readContact } from "@/lib/contact";

describe("robots.txt and sitemap.xml", () => {
  it("keeps admin, API and personal booking pages out of search engines", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rules.disallow).toEqual(expect.arrayContaining(["/admin", "/booking/", "/api/"]));
    expect(String(r.sitemap)).toMatch(/\/sitemap\.xml$/);
  });

  it("lists every footer page and nothing private", () => {
    const paths = sitemap().map((e) => new URL(e.url).pathname);
    for (const l of [...INFO_LINKS, ...LEGAL_LINKS]) expect(paths).toContain(l.href);
    expect(paths).toContain("/book");
    expect(paths.some((p) => p.startsWith("/admin") || p.startsWith("/booking"))).toBe(false);
  });
});

describe("company details", () => {
  it("has both locations with hours and the legal identifiers", () => {
    expect(company.legalName).toBeTruthy();
    expect(company.eik).toBeTruthy();
    expect(company.locations.map((l) => l.slug)).toEqual(["sofia", "burgas"]);
    for (const l of company.locations) expect(l.hours.length).toBeGreaterThan(0);
  });

  it("reads contact data from the environment, with placeholders as fallback", () => {
    const saved = { ...process.env };
    process.env.CONTACT_PHONE = "+359 2 123 4567";
    process.env.CONTACT_EMAIL = "hello@example.com";
    delete process.env.ACCESSIBILITY_EMAIL;
    expect(readContact()).toEqual({
      phone: "+359 2 123 4567",
      phoneHref: "+35921234567",
      email: "hello@example.com",
      accessibilityEmail: "hello@example.com",
    });
    delete process.env.CONTACT_EMAIL;
    expect(readContact().email).toBe("[имейл]");
    process.env = saved;
  });
});
