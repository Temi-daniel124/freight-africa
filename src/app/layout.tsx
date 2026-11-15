import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion-provider";
import messages from "@/messages/en.json";
import "./globals.css";

// D032: Inter, subset for Freight Africa (naira sign, Hausa/Yoruba/Igbo letters), optical sizes 14–32.
const inter = localFont({
  src: "./fonts/InterFA.woff2",
  variable: "--font-inter",
  weight: "400 800",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
  fallback: ["-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

// Each page sets its own canonical; no og:url here, so a shared link previews as the page that was shared
// and the 404 page never claims to be the home page.
export const metadata: Metadata = {
  metadataBase: new URL("https://freight-africa.com"),
  title: { default: messages.meta.title, template: `%s · ${messages.meta.name}` },
  description: messages.meta.description,
  applicationName: messages.meta.name,
  openGraph: {
    type: "website",
    siteName: messages.meta.name,
    title: messages.meta.title,
    description: messages.meta.description,
    locale: "en_NG",
    images: [{ url: "/brand/web/og-image-1200x630.png", width: 1200, height: 630, alt: messages.meta.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: messages.meta.title,
    description: messages.meta.description,
    images: ["/brand/web/og-image-1200x630.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0C5034",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-NG" className={inter.variable}>
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <MotionProvider>{children}</MotionProvider>
        {/* Loads only once Web Analytics is switched on for the Vercel project, so no failing script request. */}
        {process.env.NEXT_PUBLIC_ANALYTICS === "on" ? <Analytics /> : null}
      </body>
    </html>
  );
}
