import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Figtree } from "next/font/google";
import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion-provider";
import messages from "@/messages/en.json";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://freight-africa.com"),
  title: { default: messages.meta.title, template: `%s · ${messages.meta.name}` },
  description: messages.meta.description,
  applicationName: messages.meta.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: messages.meta.name,
    title: messages.meta.title,
    description: messages.meta.description,
    url: "/",
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
    <html lang="en-NG" className={figtree.variable}>
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <MotionProvider>{children}</MotionProvider>
        {/* Loads only once Web Analytics is switched on for the Vercel project, so no failing script request. */}
        {process.env.NEXT_PUBLIC_ANALYTICS === "on" ? <Analytics /> : null}
      </body>
    </html>
  );
}
