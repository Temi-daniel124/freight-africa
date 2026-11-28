"use client";

import { ChevronDown, ChevronRight, CreditCard, FileText, Key, Mail, MapPin, Phone, Search, ShieldAlert, Truck, User } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

// P25 (phone) and D13 (desktop) Help. Phone: search, four topics, popular questions, Talk to us. Desktop:
// topics on the left, the answer on the right, and "Still stuck?". Call shows only when the support_phone
// setting is filled in (D056); email always.

const a = messages.account;
const ICONS = [Truck, CreditCard, MapPin, Key, ShieldAlert, User];

export function HelpCenter({ supportPhone }: { supportPhone: string }) {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState(0);
  const [voted, setVoted] = useState<Record<string, "yes" | "no">>({});
  const term = q.trim().toLowerCase();
  const matches = a.faq.filter((f) => !term || `${f.q} ${f.a}`.toLowerCase().includes(term));
  // D13 opens on the question the mockup shows first in each topic.
  const inTopic = term ? matches : a.faq.filter((f) => f.topic === topic).sort((x, y) => Number(y.lead) - Number(x.lead));
  const contact = (dark: "talk" | "stuck") => (
    <div className="mt-3.5 flex flex-wrap gap-2 lg:mt-0">
      <a href="mailto:hello@freight-africa.com" className={buttonVariants({ variant: "inverse", size: "sm" })}>
        <Mail aria-hidden strokeWidth={1.8} />
        {a.emailUs}
      </a>
      {supportPhone && dark === "talk" ? (
        <a href={`tel:${supportPhone}`} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "border-white/25 bg-transparent text-white hover:bg-white/10")}>
          <Phone aria-hidden strokeWidth={1.8} />
          {a.call}
        </a>
      ) : null}
    </div>
  );
  const search = (desk: boolean) => (
    <label className={cn("relative block", desk && "max-w-140")}>
      <span className="sr-only">{desk ? a.helpSearchDesk : a.helpSearch}</span>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={desk ? a.helpSearchDesk : a.helpSearch}
        className={cn("w-full rounded-tile border border-line bg-surface pr-4 pl-11 text-body text-ink outline-none placeholder:text-ink-3 focus:border-green-700 focus:shadow-focus", desk ? "h-13" : "h-14")}
      />
    </label>
  );
  return (
    <>
      {/* phone (P25) */}
      <div className="flex flex-col gap-4 lg:hidden">
        {search(false)}
        <div className="grid grid-cols-2 gap-2.5">
          {a.topics.slice(0, 4).map((name, i) => {
            const Icon = ICONS[i];
            return (
              <button key={name} type="button" onClick={() => (setQ(""), setTopic(i))} className="flex flex-col items-start rounded-card border border-line bg-surface p-3.5 text-left">
                <span className="grid size-9 place-items-center rounded-icon bg-green-50 text-green-700">
                  <Icon aria-hidden className="size-4.5" strokeWidth={1.8} />
                </span>
                <span className="mt-2.5 text-body-sm font-semibold text-ink">{name}</span>
              </button>
            );
          })}
        </div>
        <section>
          <h2 className="mb-2 px-1 text-caption font-semibold tracking-caps text-ink-3 uppercase">{term ? a.results : a.popular}</h2>
          <ul className="rounded-card border border-line bg-surface px-4">
            {(term ? matches : a.faq.filter((f) => f.popular)).map((f) => (
              <li key={f.q} className="border-t border-line-soft first:border-t-0">
                <details className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 text-body-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronRight aria-hidden className="size-4.5 shrink-0 text-ink-3 transition-transform group-open:rotate-90" strokeWidth={1.8} />
                  </summary>
                  <p className="pb-4 text-body-sm text-ink-2">{f.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-card bg-green-900 px-5 py-4.5 text-white">
          <p className="text-body font-semibold">{a.talk}</p>
          <p className="mt-1 text-meta text-white/75">{a.hours}</p>
          {contact("talk")}
        </section>
      </div>
      {/* desktop (D13) */}
      <div className="hidden lg:block">
        {search(true)}
        <div className="mt-6 grid grid-cols-[260px_minmax(0,1fr)] items-start gap-6">
          <nav aria-label={a.topicsLabel} className="flex flex-col gap-1 rounded-card border border-line bg-surface p-2">
            {a.topics.map((name, i) => {
              const Icon = ICONS[i] ?? FileText;
              const on = !term && i === topic;
              return (
                <button
                  key={name}
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => (setQ(""), setTopic(i))}
                  className={cn("flex h-11 items-center gap-3 rounded-nav px-3.5 text-left text-body font-semibold", on ? "bg-green-50 text-green-800" : "text-ink-2 hover:bg-paper")}
                >
                  <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
                  {name}
                </button>
              );
            })}
          </nav>
          <div className="flex flex-col gap-4">
            {inTopic.length ? (
              inTopic.map((f, n) => (
                <article key={f.q} className="rounded-card border border-line bg-surface px-8 py-7">
                  <details open={n === 0} className="group">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
                      <h2 className="text-title-2 text-ink">{f.q}</h2>
                      {inTopic.length > 1 ? <ChevronDown aria-hidden className="mt-1.5 size-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" strokeWidth={1.8} /> : null}
                    </summary>
                    <p className="mt-3 text-body text-ink-2">{f.a}</p>
                    <div className="mt-4.5 flex items-center gap-2.5">
                      <span className="text-body-sm text-ink-3">{a.helped}</span>
                      {(["yes", "no"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={voted[f.q] === v}
                          onClick={() => setVoted((m) => ({ ...m, [f.q]: v }))}
                          className={cn("inline-flex min-h-9 items-center rounded-pill border px-3.5 text-body-sm font-semibold", voted[f.q] === v ? "border-green-800 bg-green-800 text-white" : "border-line bg-surface text-ink-2")}
                        >
                          {v === "yes" ? a.yes : a.no}
                        </button>
                      ))}
                    </div>
                  </details>
                </article>
              ))
            ) : (
              <p className="rounded-card border border-line bg-surface px-8 py-7 text-body text-ink-2">{a.noResults}</p>
            )}
            <section className="flex items-center gap-4 rounded-card bg-green-900 px-6.5 py-5.5 text-white">
              <span className="min-w-0 flex-1">
                <span className="block text-title-3 font-semibold">{a.stuck}</span>
                <span className="block text-body-sm text-white/75">{a.stuckHours}</span>
              </span>
              {contact("stuck")}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
