import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Freight Africa",
    short_name: "Freight Africa",
    start_url: "/",
    display: "standalone",
    theme_color: "#0C5034",
    background_color: "#F6F8F5",
    icons: [
      { src: "/brand/web/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/web/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/web/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
