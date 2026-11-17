import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { siteHref } from "@/lib/hosts";
import messages from "@/messages/en.json";

// Sign-in pages are for people, not search engines.
export const metadata: Metadata = { robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

const t = messages.auth;

// A flatbed on the road in Okene (public/photos/CREDITS.md). Kept close to how it was taken: only a soft
// dark fade where white text sits, never a green wash (docs/design/research, rule 2). On desktop the
// photo is anchored to its bottom edge and enlarged a little, which crops out the blurred billboard.
function Photo() {
  const sizes = "(width >= 64rem) 50vw, 100vw";
  return (
    <picture>
      <source type="image/avif" srcSet="/photos/hero-okene-828.avif 828w, /photos/hero-okene-1920.avif 1920w" sizes={sizes} />
      <img
        src="/photos/hero-okene-1920.webp"
        srcSet="/photos/hero-okene-828.webp 828w, /photos/hero-okene-1920.webp 1920w"
        sizes={sizes}
        alt=""
        width={1920}
        height={1280}
        fetchPriority="high"
        className="absolute inset-0 size-full origin-bottom object-cover object-focus-okene lg:scale-125"
      />
    </picture>
  );
}

// A-01 and A-02 frame (DESIGN_SYSTEM.md 14.3).
// Phone and tablet: a photo band, the form rising over it as a white sheet.
// Desktop: the photo on the left, inset with rounded corners; on the right a header (back to the
// website), the form centred, and a footer (help), so the form sits in a finished page.
export default function AuthLayout({ children }: { children: ReactNode }) {
  const home = siteHref();
  return (
    <div className="flex min-h-dvh flex-col bg-surface lg:grid lg:grid-cols-2 lg:gap-4 lg:p-4">
      <aside className="relative isolate h-48 shrink-0 overflow-hidden bg-ink sm:h-64 lg:h-auto lg:rounded-card">
        <Photo />
        <div aria-hidden className="photo-fade absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-5 pb-12 sm:p-8 sm:pb-14 lg:p-10">
          <a href={home} aria-label={messages.site.homeLabel} className="self-start rounded-button">
            <Logo variant="primary-white" alt="" className="h-9 lg:h-10" priority />
          </a>
          {/* On phones the band is too small for text over a busy photo; the line shows from desktop up. */}
          <p className="hidden max-w-sm text-title-2 text-balance text-white lg:block">{t.photoLine}</p>
        </div>
      </aside>

      <div className="relative -mt-6 flex flex-1 flex-col rounded-t-sheet bg-surface lg:mt-0 lg:rounded-none">
        <header className="hidden justify-end px-12 pt-8 lg:flex">
          <a href={home} className="inline-flex min-h-11 items-center gap-2 rounded-button px-2 text-label text-ink-2 hover:text-ink">
            <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
            {t.backToSite}
          </a>
        </header>

        <main className="flex flex-1 flex-col items-center px-5 pt-8 pb-10 sm:px-8 sm:pt-10 lg:justify-center lg:px-12 lg:py-12">
          <div className="w-full max-w-100">{children}</div>
        </main>

        <footer className="border-t border-line px-5 py-5 sm:px-8 lg:mx-12 lg:px-0 lg:py-6">
          <p className="text-center text-caption text-ink-2 lg:text-left">
            {t.help}{" "}
            <a href={`mailto:${messages.site.contactEmail}`} className="font-semibold text-green-700 underline">
              {messages.site.contactEmail}
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
