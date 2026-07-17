import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/fr", "/en"],
        disallow: [
          "/fr/dashboard",
          "/en/dashboard",
          "/oauth",
          "/api",
          "/mcp"
        ]
      }
    ],
    sitemap: getAppUrl() + "/sitemap.xml",
    host: getAppUrl()
  };
}