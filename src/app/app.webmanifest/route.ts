import messages from "@/messages/en.json";

// The installable app (D033). It lives on app.freight-africa.com, opens on /app and covers that whole
// host; the public website keeps its own manifest (src/app/manifest.ts).
export function GET() {
  return Response.json(
    {
      id: "/app",
      name: messages.meta.name,
      short_name: messages.meta.name,
      start_url: "/app",
      scope: "/",
      display: "standalone",
      theme_color: "#0C5034",
      background_color: "#F6F8F5",
      icons: [
        { src: "/brand/web/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/brand/web/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/brand/web/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
