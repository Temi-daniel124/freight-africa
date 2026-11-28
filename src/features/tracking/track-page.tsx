import { ChevronLeft, ChevronRight, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { shipperLoads } from "@/features/booking/data";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

const t = messages.track;
const LIVE = ["assigned", "to_pickup", "at_pickup", "loading", "loaded", "in_transit", "arrived"];

/**
 * Track a trip (P13, D045): only trips of the signed-in person's business can be found. On phones it
 * covers the tab bar, as the mockup draws it, with its own Back button.
 */
export async function TrackPage({ viewer, refQuery }: { viewer: Promise<Viewer>; refQuery: string | null }) {
  const { orgId, account } = await viewer;
  let notFoundText: string | null = null;
  if (orgId && refQuery) {
    const { data: loadId } = await (await supabaseServer()).rpc("find_trip", { p_org: orgId, p_ref: refQuery });
    if (loadId) redirect(`/app/ship/trips/${loadId}/track`);
    notFoundText = t.notFound.replace("{org}", account);
  }
  const live = orgId ? (await shipperLoads(orgId)).filter((row) => row.trip && LIVE.includes(row.trip.status)) : [];
  const example = live[0]?.ref ?? "FA-7K3Q9";
  return (
    <div className="bg-paper max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[560px] flex-col pb-10">
        <header className="flex items-center px-4 pt-3.5 lg:hidden">
          <Link href="/app/ship" aria-label={t.back} className="grid size-11 place-items-center rounded-full border border-line bg-surface">
            <ChevronLeft aria-hidden className="size-5 text-ink" strokeWidth={1.8} />
          </Link>
        </header>
        <section className="relative mx-5 mt-2.5 h-62.5 overflow-hidden rounded-[28px] bg-green-900 lg:mx-0 lg:mt-0">
          <svg aria-hidden viewBox="0 0 350 250" preserveAspectRatio="none" className="absolute inset-0 size-full">
            <path d="M-10 190 C 70 150, 120 210, 190 150 S 300 70, 370 90" fill="none" stroke="var(--color-green-700)" strokeWidth="22" strokeLinecap="round" />
            <path d="M-10 190 C 70 150, 120 210, 190 150 S 300 70, 370 90" fill="none" stroke="var(--color-green-300)" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
          </svg>
          <Image src="/art/box.webp" alt="" width={300} height={243} priority className="absolute top-4.5 right-4.5 size-37.5 object-contain" />
          <div className="absolute bottom-5 left-5 text-white">
            <h1 className="text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.03em]">{t.title}</h1>
            <p className="mt-1.5 text-body-sm text-green-300">{t.lead}</p>
          </div>
        </section>
        <form action="/app/ship/track" className="px-5 pt-5.5 lg:px-0">
          <label htmlFor="track-ref" className="mb-2 block text-body-sm font-semibold text-ink">
            {t.refLabel}
          </label>
          <div className="flex gap-2.5">
            <input
              id="track-ref"
              name="ref"
              defaultValue={refQuery ?? ""}
              placeholder={example}
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={notFoundText ? true : undefined}
              aria-describedby={notFoundText ? "track-ref-error" : "track-ref-hint"}
              className="tabular h-14 w-full min-w-0 flex-1 rounded-tile border-[1.5px] border-line-strong bg-surface px-4 text-[17px] font-semibold tracking-[0.04em] text-ink uppercase outline-none placeholder:font-medium placeholder:text-ink-3 focus:border-green-700 focus:shadow-focus"
            />
            <button type="submit" className="h-14 w-24 shrink-0 rounded-pill bg-green-700 text-body-lg font-semibold text-white shadow-[0_12px_24px_-12px_rgba(12,80,52,.6)] hover:bg-green-800">
              {t.button}
            </button>
          </div>
          {notFoundText ? (
            <p id="track-ref-error" role="alert" className="mt-2 text-label font-medium text-danger">
              {notFoundText}
            </p>
          ) : (
            <p id="track-ref-hint" className="mt-2 text-meta text-ink-3">
              {t.hint.replace("{ref}", example)}
            </p>
          )}
        </form>
        {live.length ? (
          <section className="mx-5 mt-6 lg:mx-0">
            <h2 className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{t.live}</h2>
            <ul className="mt-2 rounded-card border border-line bg-surface px-4">
              {live.map((row) => (
                <li key={row.id} className="border-line-soft not-first:border-t">
                  <Link href={`/app/ship/trips/${row.id}/track`} className="flex min-h-17 items-center gap-3 py-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-icon bg-info-100 text-info">
                      <Truck aria-hidden className="size-5" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-ink">
                        {row.from} → {row.to}
                      </span>
                      <span className="tabular mt-0.5 block truncate text-meta text-ink-3">
                        {row.ref}
                        {row.trip?.plate ? ` · ${row.trip.plate}` : ""}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
