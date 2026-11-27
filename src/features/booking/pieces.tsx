import { ArrowRight, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { StatusChip, type StatusTone } from "@/components/ui/chip";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import type { LoadRow } from "./data";
import { loadLine, progressStep } from "./format";

const t = messages.trips;

export const naira = (kobo: number) => formatNaira(kobo / 100);

export const lagosDate = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  timeZone: "Africa/Lagos",
});
export const lagosTime = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
});

/** The status a sender reads: the trip's when there is one, otherwise the load's. */
export function statusOf(row: Pick<LoadRow, "status" | "trip">): {
  label: string;
  tone: StatusTone;
} {
  const key = (
    row.trip && row.status === "matched" ? row.trip.status : row.status
  ) as keyof typeof t.status;
  const tone: StatusTone =
    key === "closed" || key === "delivered"
      ? "success"
      : key === "cancelled" || key === "expired"
        ? "danger"
        : key === "draft" || key === "awaiting_payment"
          ? "warning"
          : key === "refunded"
            ? "neutral"
            : "info";
  return { label: t.status[key] ?? row.status, tone };
}

/** Booked · Loaded · On the road · Delivered, a small truck marking where it is (D045). */
export function ProgressDots({
  step,
  inverse = false,
}: {
  step: number;
  inverse?: boolean;
}) {
  const labels = [
    t.progress.booked,
    t.progress.loaded,
    t.progress.road,
    t.progress.delivered,
  ];
  return (
    <ol className="grid grid-cols-4" aria-label={labels[Math.max(0, step)]}>
      {labels.map((label, i) => (
        <li key={label} className="relative flex flex-col items-center gap-1.5">
          {i > 0 ? (
            <span
              aria-hidden
              className={cn(
                "absolute top-2.5 right-1/2 h-0.5 w-full border-t-2 border-dashed",
                i <= step
                  ? inverse
                    ? "border-green-300"
                    : "border-green-700"
                  : inverse
                    ? "border-white/25"
                    : "border-line-strong",
              )}
            />
          ) : null}
          <span
            aria-hidden
            className={cn(
              "relative z-1 grid size-5 place-items-center rounded-full",
              i < step
                ? inverse
                  ? "bg-green-300"
                  : "bg-green-700"
                : i === step
                  ? inverse
                    ? "bg-white text-green-900"
                    : "bg-green-900 text-white"
                  : inverse
                    ? "bg-white/20"
                    : "bg-line",
            )}
          >
            {i === step ? (
              <Truck className="size-3" strokeWidth={2.25} />
            ) : null}
          </span>
          <span
            className={cn(
              "truncate text-micro font-semibold",
              inverse ? "text-white/80" : "text-ink-3",
              i === step && (inverse ? "text-white" : "text-ink"),
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** One trip in a list: reference, goods, route, status (route and reference never wrap). */
export function TripRow({ row, href }: { row: LoadRow; href: string }) {
  const status = statusOf(row);
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-18 items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 hover:bg-paper lg:px-5"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-green-50 text-green-700">
          <Truck aria-hidden className="size-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="tabular shrink-0 text-body-sm font-semibold whitespace-nowrap text-ink">
              {row.ref}
            </span>
            <span className="truncate text-body-sm text-ink-2">
              {[row.goods, loadLine(row)].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className="block truncate text-caption font-medium whitespace-nowrap text-ink-3">
            {row.from} → {row.to} · {lagosDate.format(new Date(row.pickupFrom))}
          </span>
        </span>
        <StatusChip tone={status.tone}>{status.label}</StatusChip>
      </Link>
    </li>
  );
}

/** The current trip card (reference 03): reference, goods, status chip, progress, dates, from and to. */
export function CurrentTripCard({ row, href }: { row: LoadRow; href: string }) {
  const status = statusOf(row);
  return (
    <Link
      href={href}
      className="block rounded-tile bg-surface p-4.5 shadow-raised transition-transform active:scale-press lg:rounded-card lg:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tabular text-title-3 font-semibold whitespace-nowrap text-ink">
            {row.ref}
          </p>
          <p className="truncate text-body-sm text-ink-2">
            {[row.goods, loadLine(row)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <StatusChip tone={status.tone}>{status.label}</StatusChip>
      </div>
      <div className="my-4">
        <ProgressDots step={progressStep(row.status, row.trip?.status)} />
      </div>
      <div className="flex items-end justify-between gap-3 text-body-sm">
        <div className="min-w-0">
          <p className="text-caption text-ink-3">
            {lagosDate.format(new Date(row.pickupFrom))}
          </p>
          <p className="truncate font-semibold whitespace-nowrap text-ink">
            {row.from}
          </p>
        </div>
        <ArrowRight
          aria-hidden
          className="mb-0.5 size-4 shrink-0 text-ink-3"
          strokeWidth={1.75}
        />
        <div className="min-w-0 text-right">
          <p className="text-caption text-ink-3">
            {row.trip?.deliveredAt
              ? lagosDate.format(new Date(row.trip.deliveredAt))
              : "—"}
          </p>
          <p className="truncate font-semibold whitespace-nowrap text-ink">
            {row.to}
          </p>
        </div>
      </div>
    </Link>
  );
}

/** P12 Trips card: reference and goods, status, route, what's next, and a progress bar or the money held. */
export function TripCard({ row, href, next }: { row: LoadRow; href: string; next: string }) {
  const status = statusOf(row);
  const step = progressStep(row.status, row.trip?.status);
  const goods = [row.goods, loadLine(row)].filter(Boolean).join(", ");
  return (
    <li>
      <Link href={href} className="block rounded-card border border-line bg-surface px-5 pt-4.5 pb-4 hover:border-green-700/40">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-caption font-semibold tracking-caps text-ink-3 uppercase">
            {row.ref} · {goods}
          </p>
          <StatusChip tone={status.tone}>{status.label}</StatusChip>
        </div>
        <p className="mt-1.5 text-title-3 text-ink">
          {row.from} → {row.to}
        </p>
        <p className="truncate text-meta text-ink-3">{next}</p>
        {row.trip ? (
          <span aria-hidden className="mt-3.5 block h-1.5 overflow-hidden rounded-pill bg-line">
            <span className="block h-full rounded-pill bg-green-700" style={{ width: `${Math.max(8, ((step + 0.6) / 4) * 100)}%` }} />
          </span>
        ) : row.status === "funded" ? (
          <p className="mt-3.5 flex items-center gap-2 border-t border-line-soft pt-3 text-body-sm text-green-900">
            <ShieldCheck aria-hidden className="size-4 text-green-700" strokeWidth={1.8} />
            {t.held.replace("{amount}", naira(row.totalKobo))}
          </p>
        ) : null}
      </Link>
    </li>
  );
}
