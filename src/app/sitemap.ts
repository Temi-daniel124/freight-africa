import type { MetadataRoute } from "next";

const SITE = "https://freight-africa.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/waitlist`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/legal/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/legal/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
