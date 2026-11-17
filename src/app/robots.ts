import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dev/", "/auth", "/app", "/onboarding", "/admin", "/api/"] }],
    sitemap: "https://freight-africa.com/sitemap.xml",
    host: "https://freight-africa.com",
  };
}
