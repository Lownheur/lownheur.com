import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl();
  const paths = ["", "/privacy", "/terms", "/legal", "/support"];
  return (["fr", "en"] as const).flatMap((locale) =>
    paths.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path ? ("monthly" as const) : ("weekly" as const),
      priority: path ? 0.5 : 1
    }))
  );
}