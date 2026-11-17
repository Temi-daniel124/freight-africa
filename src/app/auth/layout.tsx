import { Lock, MapPin, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { siteHref } from "@/lib/hosts";
import messages from "@/messages/en.json";

// Sign-in pages are for people, not search engines.
export const metadata: Metadata = { robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

const trustIcons = [ShieldCheck, Lock, MapPin];

function Photo({ sizes }: { sizes: string }) {
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
        className="absolute inset-0 size-full object-cover object-[30%_50%]"
      />
    </picture>
  );
}

// The road line (DESIGN_SYSTEM.md 6.4), drawn as one gentle curve across the photograph.
function Road({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 720 120" preserveAspectRatio="none" className={className}>
      <path d="M-20 104 C 160 56, 330 116, 500 64 S 690 22, 740 30" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="12 10" className="stroke-green-500" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// DESIGN_SYSTEM.md section 14.3 (research: docs/planning/design-research-sign-in-landing.md).
// Phone and tablet: a photo band on top, the form rising over it as a white sheet.
// Desktop: a rounded photo panel on the left (logo, one line, three trust points), the form on white beside it.
export default function AuthLayout({ children }: { children: ReactNode }) {
  const home = siteHref();
  return (
    <div className="flex min-h-dvh flex-col bg-surface lg:grid lg:grid-cols-[minmax(0,11fr)_minmax(0,10fr)] lg:p-4">
      <aside className="relative isolate h-52 shrink-0 overflow-hidden bg-green-800 sm:h-64 lg:h-auto lg:rounded-card">
        <Photo sizes="(width >= 64rem) 52vw, 100vw" />
        <div aria-hidden className="hero-scrim absolute inset-0" />
        <Road className="pointer-events-none absolute inset-x-0 bottom-6 hidden h-28 w-full lg:block" />

        <div className="relative flex h-full flex-col justify-between p-5 pb-10 sm:p-8 sm:pb-12 lg:p-12">
          <a href={home} aria-label={messages.site.homeLabel} className="self-start rounded-button">
            <Logo variant="primary-white" alt="" className="h-9 lg:h-10" priority />
          </a>

          <p className="max-w-xs text-body font-semibold text-white lg:hidden">{messages.auth.photoLine}</p>

          <div className="hidden flex-col gap-8 lg:flex">
            <p className="type-h2 max-w-md text-balance text-white">{messages.auth.photoLine}</p>
            <ul className="flex flex-col gap-3 pb-24">
              {messages.auth.trust.map((point, index) => {
                const Icon = trustIcons[index] ?? ShieldCheck;
                return (
                  <li key={point} className="flex items-center gap-3 text-body-lg text-white">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-white/15">
                      <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                    </span>
                    {point}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </aside>

      <main className="relative -mt-6 flex flex-1 flex-col items-center rounded-t-card bg-surface px-5 pt-8 pb-10 sm:px-8 sm:pt-10 lg:mt-0 lg:justify-center lg:rounded-none lg:px-12 lg:py-12">
        <div className="w-full max-w-100">{children}</div>
      </main>
    </div>
  );
}
