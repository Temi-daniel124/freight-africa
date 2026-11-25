import { ChevronRight, Truck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TrackScene } from "@/components/art/scenes";
import { Button } from "@/components/ui/button";
import { shipperLoads } from "@/features/booking/data";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

const t = messages.track;
const LIVE = [
  "assigned",
  "to_pickup",
  "at_pickup",
  "loading",
  "loaded",
  "in_transit",
  "arrived",
];

/** Track a trip (reference 01, D045): only trips of the signed-in person's business can be found. */
export async function TrackPage({
  viewer,
  refQuery,
}: {
  viewer: Promise<Viewer>;
  refQuery: string | null;
}) {
  const { orgId, account } = await viewer;
  let notFoundText: string | null = null;
  if (orgId && refQuery) {
    const { data: loadId } = await (
      await supabaseServer()
    ).rpc("find_trip", { p_org: orgId, p_ref: refQuery });
    if (loadId)
      redirect(`/app/ship/trips/${loadId}/track`);
    notFoundText = t.notFound.replace("{org}", account);
  }
  const live = orgId
    ? (await shipperLoads(orgId)).filter(
        (row) => row.trip && LIVE.includes(row.trip.status),
      )
    : [];
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
      <section className="flex flex-col items-center gap-4 rounded-tile bg-surface p-6 text-center shadow-raised lg:rounded-card lg:p-8">
        <TrackScene className="max-w-64" />
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-body text-ink-2">{t.lead}</p>
        <form action="/app/ship/track" className="flex w-full flex-col gap-3">
          <label htmlFor="track-ref" className="sr-only">
            {t.placeholder}
          </label>
          <input
            id="track-ref"
            name="ref"
            defaultValue={refQuery ?? ""}
            placeholder={t.placeholder}
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={notFoundText ? true : undefined}
            aria-describedby={notFoundText ? "track-ref-error" : undefined}
            className="tabular h-14 w-full min-w-0 rounded-input border border-line-strong bg-surface px-4 text-control text-ink uppercase outline-none placeholder:text-ink-3 placeholder:normal-case focus:border-green-700 focus:ring-4 focus:ring-green-500/16"
          />
          {notFoundText ? (
            <p
              id="track-ref-error"
              role="alert"
              className="text-left text-label font-medium text-danger"
            >
              {notFoundText}
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            {t.button}
          </Button>
        </form>
      </section>
      {live.length ? (
        <section>
          <h2 className="mb-3 text-body-lg font-extrabold text-ink">
            {t.live}
          </h2>
          <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
            {live.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/app/ship/trips/${row.id}/track`}
                  className="flex min-h-16 items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 hover:bg-paper"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-green-50 text-green-700">
                    <Truck aria-hidden className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="tabular block text-body-sm font-bold whitespace-nowrap text-ink">
                      {row.ref}
                    </span>
                    <span className="block truncate text-caption font-medium whitespace-nowrap text-ink-3">
                      {row.from} → {row.to} · {row.trip?.plate}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-5 shrink-0 text-ink-3"
                    strokeWidth={1.75}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
