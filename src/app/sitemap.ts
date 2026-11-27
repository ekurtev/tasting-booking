import type { MetadataRoute } from "next";
import { PUBLIC_PATHS } from "@/content/site";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || "http://localhost:3000";
  return PUBLIC_PATHS.map((path) => ({
    url: new URL(path, base).toString(),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : path === "/book" ? 0.9 : 0.5,
  }));
}
