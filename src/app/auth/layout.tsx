import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { siteHref } from "@/lib/hosts";
import messages from "@/messages/en.json";

// Sign-in pages are for people, not search engines.
export const metadata: Metadata = { robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

// DESIGN_SYSTEM.md section 14.3. Phone: paper background, the stacked logo, one white card.
// Desktop: a photograph with the green gradient and one line on the left, the same card on the right.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-green-800 lg:block">
        <picture>
          <source type="image/avif" srcSet="/photos/hero-okene-1920.avif" />
          <img src="/photos/hero-okene-1920.webp" alt="" width={1920} height={1280} className="absolute inset-0 size-full object-cover" />
        </picture>
        <div aria-hidden className="hero-scrim absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <a href={siteHref()} aria-label={messages.site.homeLabel} className="self-start rounded-button">
            <Logo variant="primary-white" alt="" className="h-10" priority />
          </a>
          <p className="type-h2 max-w-md text-white">{messages.auth.photoLine}</p>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col items-center gap-8 px-4 py-8 lg:justify-center lg:py-12">
        <a href={siteHref()} aria-label={messages.site.homeLabel} className="rounded-card lg:hidden">
          <Logo variant="stacked-green" alt="" className="h-24" priority />
        </a>
        <div className="w-full max-w-md rounded-card bg-surface p-5 shadow-raised lg:p-8">{children}</div>
      </main>
    </div>
  );
}
