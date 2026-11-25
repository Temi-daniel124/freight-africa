import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SafeTripScene } from "@/components/art/scenes";
import { Logo } from "@/components/brand/Logo";
import { siteHref } from "@/lib/hosts";
import messages from "@/messages/en.json";

// Sign-in pages are for people, not search engines.
export const metadata: Metadata = { robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

const t = messages.auth;

// A-01, A-02 and the two-step screens (D045). Desktop: the illustration fills the left half on a soft
// surface and the steps sit in a card on the right (this replaces the Gate 1 deep green panel). Phones:
// the illustration above, the steps rising over it in a white sheet with 28 px corners.
export default function AuthLayout({ children }: { children: ReactNode }) {
  const home = siteHref();
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-2 lg:bg-paper">
      <aside className="relative flex flex-col bg-green-50 px-5 pt-5 pb-12 lg:m-4 lg:rounded-sheet lg:px-10 lg:pt-8 lg:pb-10">
        <Logo variant="primary-green" className="h-7 w-auto self-start lg:h-8" priority />
        <div className="mx-auto mt-2 w-full max-w-56 lg:my-auto lg:max-w-120">
          <SafeTripScene />
        </div>
        <p className="hidden text-title-3 font-semibold text-balance text-green-900 lg:block">{messages.welcome.title}</p>
      </aside>

      <section className="relative -mt-7 flex flex-col rounded-t-sheet bg-surface px-5 pt-8 lg:mt-0 lg:rounded-none lg:bg-transparent lg:px-12 lg:pt-2">
        <header className="hidden h-16 items-center justify-end lg:flex">
          <a href={home} className="inline-flex h-11 items-center gap-2 rounded-pill border border-line bg-surface px-4 text-body-sm text-ink-2 transition-colors motion-instant hover:bg-green-50 hover:text-ink">
            <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
            {t.backToSite}
          </a>
        </header>

        <main className="lg:flex lg:flex-1 lg:items-center lg:justify-center">
          <div className="w-full lg:max-w-110 lg:rounded-card lg:bg-surface lg:p-10 lg:shadow-card">{children}</div>
        </main>

        <footer className="flex flex-col items-center gap-1 pt-6 pb-8 text-center text-caption leading-3.75 text-ink-3 lg:h-18 lg:flex-row lg:justify-between lg:p-0 lg:text-left">
          <span>
            {t.help}{" "}
            <a href={`mailto:${messages.site.contactEmail}`} className="font-semibold text-green-700">
              {messages.site.contactEmail}
            </a>
          </span>
          <span>{t.copyright}</span>
        </footer>
      </section>
    </div>
  );
}
