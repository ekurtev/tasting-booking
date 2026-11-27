import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL || "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/booking/"] },
    sitemap: new URL("/sitemap.xml", base).toString(),
  };
}
