import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthArt } from "@/features/auth/auth-frame";
import { siteHref } from "@/lib/hosts";
import messages from "@/messages/en.json";

// Sign-in pages are for people, not search engines.
export const metadata: Metadata = { robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

const f = messages.auth.frame;

// A-01, A-02 and the two-step screens, drawn as mockups P03, P04 (phone) and D01 (desktop). Phones: the
// paper page with a Back button on top and the step's button docked at the bottom. From 1024 px: the
// courier-and-van panel on the left (52%), the step in a 420 px column on the right.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-paper">
      <AuthArt />
      <section className="relative flex min-h-dvh min-w-0 flex-1 flex-col lg:px-14 lg:py-10">
        <main className="flex flex-1 flex-col lg:items-center lg:justify-center">
          <div className="flex w-full flex-1 flex-col lg:max-w-105 lg:flex-none">{children}</div>
        </main>
        <footer className="hidden text-caption text-ink-3 lg:block">
          {f.copyright} ·{" "}
          <a href={siteHref("/legal/terms")} className="hover:text-ink-2">
            {f.terms}
          </a>{" "}
          ·{" "}
          <a href={siteHref("/legal/privacy")} className="hover:text-ink-2">
            {f.privacy}
          </a>
        </footer>
      </section>
    </div>
  );
}
