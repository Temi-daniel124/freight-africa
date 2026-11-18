import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { HeroBar, type HeroBarPreview } from "@/features/site/hero-bar";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.meta.landingStatesTitle, robots: { index: false, follow: false } };

const t = messages.landingStates;

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-label text-ink-2">{label}</h2>
      {/* The bar sits on the hero's dark green, as it does on the page. `inert` keeps the samples still. */}
      <div inert className="rounded-card bg-green-900 p-4 lg:p-6">
        {children}
      </div>
    </section>
  );
}

const bar = (preview: HeroBarPreview) => <HeroBar t={messages.home.hero} corridors={messages.site.corridors} preview={preview} />;

// Every state of the hero's waitlist bar (Gate 2), for design review (DESIGN_SYSTEM.md section 20).
// The sign-up finishes on /waitlist (name and consent are collected there), so "joined" and "already on
// the list" are that page's states, not the bar's.
export default function LandingStatesPage() {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();

  return (
    <main className="mx-auto flex max-w-300 flex-col gap-10 px-4 py-10 lg:px-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-body-lg text-ink-2">{t.intro}</p>
      </header>
      <Frame label={t.empty}>{bar({})}</Frame>
      <Frame label={t.typing}>{bar({ phone: "803 123 45" })}</Frame>
      <Frame label={t.owner}>{bar({ role: "owner", corridor: "eastern-loop", phone: "803 123 4567" })}</Frame>
      <Frame label={t.invalid}>{bar({ phone: "123 45", invalid: true })}</Frame>
      <Frame label={t.sending}>{bar({ phone: "803 123 4567", sending: true })}</Frame>
      <Frame label={t.offline}>{bar({ phone: "803 123 4567", offline: true })}</Frame>
    </main>
  );
}
