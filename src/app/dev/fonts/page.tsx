import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/field";
import messages from "@/messages/en.json";
import report from "../../../../public/dev-fonts/report.json";

export const metadata: Metadata = { title: messages.fonts.title, robots: { index: false, follow: false } };

const t = messages.fonts;
const WEIGHTS = [400, 500, 600, 700, 800];
const FALLBACK = '-apple-system, "Segoe UI", Roboto, Arial, sans-serif';

type Candidate = { key: string; name: string; text: string; display: string; nairaDrawn: boolean; missing: string[]; optical: boolean; current?: boolean };

// Inter is the live font (D032); the other five are built by scripts/fonts/build-bakeoff.py.
const candidates: Candidate[] = [
  { key: "inter", name: "Inter", text: `var(--font-inter), ${FALLBACK}`, display: `var(--font-inter), ${FALLBACK}`, nairaDrawn: false, missing: [], optical: true, current: true },
  ...Object.entries(report).map(([key, entry]) => {
    const optical = "display-700" in entry.files;
    return {
      key,
      name: entry.family,
      text: `"bake-${key}", ${FALLBACK}`,
      display: `"bake-${key}${optical ? "-display" : ""}", ${FALLBACK}`,
      nairaDrawn: entry.nairaDrawn,
      missing: entry.missing,
      optical,
    };
  }),
];

const fontFaces = Object.entries(report)
  .flatMap(([key, entry]) =>
    Object.keys(entry.files).map((file) => {
      const [cut, weight] = file.split("-");
      return `@font-face{font-family:"bake-${key}${cut === "display" ? "-display" : ""}";font-weight:${weight};font-display:swap;src:url("/dev-fonts/${key}-${file}.woff2") format("woff2")}`;
    }),
  )
  .join("");

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");

function Label({ children }: { children: string }) {
  return <p className="text-caption font-semibold tracking-wide text-ink-2 uppercase">{children}</p>;
}

function Specimen({ font }: { font: Candidate }) {
  const display: CSSProperties = { fontFamily: font.display };
  return (
    <section id={font.key} className="flex scroll-mt-24 flex-col gap-6" style={{ fontFamily: font.text }}>
      <header className="flex flex-col gap-2 border-t border-line-strong pt-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-title-1 text-ink" style={display}>
            {font.name}
          </h2>
          {font.current ? <StatusChip tone="success">{t.current}</StatusChip> : null}
        </div>
        <p className="text-body text-ink-2">
          {font.nairaDrawn ? t.nairaDrawn : t.nairaOwn} {font.missing.length ? fill(t.missing, { letters: font.missing.join(" ") }) : t.complete}
          {font.optical && !font.current ? ` ${t.opticalNote}` : ""}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Label>{t.hero}</Label>
        <div className="relative isolate overflow-hidden rounded-card bg-green-800 text-white">
          <picture>
            <source type="image/avif" srcSet="/photos/hero-lagos-1920.avif" />
            <img src="/photos/hero-lagos-1920.webp" alt="" loading="lazy" className="absolute inset-0 -z-20 size-full object-cover" />
          </picture>
          <div aria-hidden className="hero-scrim absolute inset-0 -z-10" />
          <div className="flex max-w-2xl flex-col gap-5 px-5 py-12 sm:px-10 sm:py-20">
            <p className="self-start rounded-button bg-white/15 px-4 py-2 text-label">{messages.home.hero.badge}</p>
            <p className="text-display text-balance" style={display}>
              {messages.home.hero.headline}
            </p>
            <p className="text-body-lg text-white/90">{messages.home.hero.lead}</p>
            <Button variant="inverse" className="self-start">
              {messages.home.hero.submit}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Label>{t.signIn}</Label>
          <div className="flex flex-col gap-6 rounded-card bg-surface p-5 shadow-raised lg:p-8">
            <Logo variant="stacked-green" alt="" className="h-16 self-start" />
            <div className="flex flex-col gap-2">
              <p className="text-title-1 text-ink" style={display}>
                {messages.auth.title}
              </p>
              <p className="text-body text-ink-2">{messages.auth.lead}</p>
            </div>
            <TextField id={`${font.key}-email`} name="email" type="email" label={messages.auth.emailLabel} placeholder={messages.auth.emailPlaceholder} defaultValue="ngozi.okafor@example.com" />
            <Button className="w-full">{messages.auth.sendEmail}</Button>
            <p className="text-center text-caption text-ink-2">{fill(messages.auth.agree, { terms: messages.auth.termsLink, privacy: messages.auth.privacyLink })}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Label>{t.money}</Label>
          <Card level={1} className="flex flex-col gap-5 p-5 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-title-2 text-ink" style={display}>
                  {t.moneyTitle}
                </p>
                <p className="text-body text-ink-2">{t.moneyRoute}</p>
              </div>
              <StatusChip tone="success" icon={Lock}>
                {t.moneyStatus}
              </StatusChip>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-label text-ink-2">{t.moneyHeld}</p>
              <p className="tabular text-display text-ink" style={display}>
                {t.moneyHeldAmount}
              </p>
            </div>
            <dl className="flex flex-col divide-y divide-line border-y border-line">
              {[
                [t.moneyReleased, t.moneyReleasedAmount],
                [t.moneyLeft, t.moneyLeftAmount],
              ].map(([label, amount]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-body text-ink-2">{label}</dt>
                  <dd className="tabular text-body-lg font-semibold text-ink">{amount}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body text-ink-2">{t.moneyDriver}</p>
              <p className="tabular rounded-inner border border-line-strong px-3 py-1 text-label text-ink">{t.moneyPlate}</p>
            </div>
            <Button variant="secondary" className="w-full">
              {t.moneyAction}
            </Button>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Label>{t.body}</Label>
          <div className="flex max-w-prose flex-col gap-3">
            <p className="text-title-2 text-ink" style={display}>
              {t.bodyTitle}
            </p>
            <p className="text-body-lg text-ink">{t.bodyOne}</p>
            <p className="text-body text-ink-2">{t.bodyTwo}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Label>{t.details}</Label>
          <p className="tabular text-title-2 font-semibold text-ink">{t.detailsSample}</p>
          <p className="text-body-lg text-ink">{t.lettersSample}</p>
          <div className="flex flex-col gap-1">
            {WEIGHTS.map((weight) => (
              <p key={weight} className="tabular text-body-lg text-ink" style={{ fontWeight: weight }}>
                {weight} · {t.moneyHeldAmount} · {messages.home.hero.lead}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function FontComparisonPage() {
  // Development and preview only, like the component gallery (DESIGN_SYSTEM.md section 20.2).
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 lg:px-8">
      <style dangerouslySetInnerHTML={{ __html: fontFaces }} />
      <header className="flex flex-col gap-3">
        <h1 className="text-display text-ink">{t.title}</h1>
        <p className="max-w-prose text-body-lg text-ink-2">{t.intro}</p>
      </header>

      <nav aria-label={t.jump} className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-paper px-4 py-3 lg:-mx-8 lg:px-8">
        {candidates.map((font) => (
          <a
            key={font.key}
            href={`#${font.key}`}
            className="flex min-h-11 shrink-0 items-center rounded-button border border-line-strong bg-surface px-4 text-label text-ink hover:bg-green-50"
            style={{ fontFamily: font.text }}
          >
            {font.name}
          </a>
        ))}
      </nav>

      <section className="flex flex-col gap-4">
        <h2 className="text-title-2 text-ink">{t.sideBySide}</h2>
        <div className="flex flex-col divide-y divide-line rounded-card bg-surface shadow-raised">
          {candidates.map((font) => (
            <div key={font.key} className="flex flex-col gap-1 p-5" style={{ fontFamily: font.text }}>
              <p className="text-caption text-ink-2">{font.name}</p>
              <p className="text-title-1 text-balance text-ink" style={{ fontFamily: font.display }}>
                {messages.home.hero.headline}
              </p>
              <p className="tabular text-body-lg text-ink">
                {t.moneyHeldAmount} · {t.moneyPlate} · {messages.home.hero.lead}
              </p>
            </div>
          ))}
        </div>
      </section>

      {candidates.map((font) => (
        <Specimen key={font.key} font={font} />
      ))}
    </main>
  );
}
