import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SignInPanel } from "@/features/auth/sign-in-panel";
import { siteHref } from "@/lib/hosts";
import messages from "@/messages/en.json";

// Sign-in pages are for people, not search engines.
export const metadata: Metadata = { robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

const t = messages.auth;

// A-01 and A-02 frame, built to the approved Gate 1 target (docs/design/targets/gate-1).
// Desktop: the green panel inset on the left; on the right a header, the form centred and a footer.
// Below 1024 px: the green band on top, the form rising over it as a 28 px-radius sheet.
export default function AuthLayout({ children }: { children: ReactNode }) {
  const home = siteHref();
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-2 lg:p-4">
      <SignInPanel homeHref={home} />

      <section className="relative -mt-7 flex flex-col rounded-t-sheet bg-surface px-5 pt-8 lg:mt-0 lg:rounded-none lg:px-12 lg:pt-2">
        <header className="hidden h-16 items-center justify-end lg:flex">
          <a
            href={home}
            className="inline-flex h-11 items-center gap-2 rounded-pill border border-line px-4 text-body-sm text-ink-2 transition-colors motion-instant hover:bg-green-50 hover:text-ink"
          >
            <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
            {t.backToSite}
          </a>
        </header>

        <main className="lg:flex lg:flex-1 lg:items-center lg:justify-center">
          <div className="w-full lg:max-w-100">{children}</div>
        </main>

        <footer className="flex flex-col items-center gap-1 pt-6 pb-8 text-center text-caption text-ink-3 lg:h-18 lg:flex-row lg:justify-between lg:p-0 lg:text-left">
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
