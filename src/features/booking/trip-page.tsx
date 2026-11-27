import { MapPin, Receipt } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fillPercent, TruckGraphic, truckKind } from "@/components/art/truck";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chip";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { loadLine, oneLoad, progressStep } from "./data";
import { lagosTime, naira, ProgressDots, statusOf } from "./pieces";
import { PayTopUpButton } from "@/features/checkout/pay-top-up";
import { CancelButton, CounterCard } from "./trip-controls";

const t = messages.trips;

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-body-sm text-ink-2">{label}</dt>
      <dd className="min-w-0 text-right text-body-sm font-semibold text-ink">
        {children}
      </dd>
    </div>
  );
}

/** S-04/S-06 a sender's trip: status, payment (S-05), counter-offers (S-07), details, cancel, receipt. */
export async function SenderTripPage({ id }: { id: string }) {
  const data = await oneLoad(id);
  if (!data) notFound();
  const { load, payments, offers, stops } = data;
  const supabase = await supabaseServer();
  const { data: perms } = await supabase.rpc("org_permissions", { p_org: data.shipperOrg });
  const can = (p: string) => (perms ?? []).includes(p);
  const status = statusOf(load);
  const topUp =
    payments.find((p) => p.purpose === "top_up" && p.status === "pending") ??
    null;
  const showPay =
    (load.status === "draft" ||
      load.status === "awaiting_payment" ||
      load.status === "expired") &&
    can("pay");
  const counter = offers.find(
    (o) => o.status === "pending" && new Date(o.expires_at ?? 0) > new Date(),
  );
  const counterOrg =
    (counter?.transporter as unknown as { name: string } | null)?.name ?? "";
  const cancellable =
    can("cancel_own_booking") &&
    !["cancelled", "refunded"].includes(load.status) &&
    !(
      load.trip &&
      [
        "loaded",
        "in_transit",
        "arrived",
        "delivered",
        "delivered_with_exception",
        "closed",
      ].includes(load.trip.status)
    );
  const held =
    ["funded", "matched"].includes(load.status) &&
    load.trip?.status !== "closed";
  const fill = load.weightKg
    ? {
        kind: "weight" as const,
        percent: fillPercent(load.weightKg, load.capacityKg),
        line: `${load.weightKg / 1000} t of ${load.capacityKg / 1000} t`,
      }
    : load.quantityUnit === "head"
      ? { kind: "livestock" as const, text: loadLine(load) }
      : {
          kind: "amount" as const,
          goods: load.goods,
          amount: loadLine(load) || undefined,
        };

  return (
    <div className="mx-auto grid w-full max-w-[1100px] gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section className="rounded-tile bg-surface p-5 shadow-raised lg:rounded-card lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="tabular text-title-2 font-semibold whitespace-nowrap text-ink">
                {load.ref}
              </h1>
              <p className="truncate text-body-sm whitespace-nowrap text-ink-2">
                {load.from} → {load.to}
              </p>
            </div>
            <StatusChip tone={status.tone}>{status.label}</StatusChip>
          </div>
          <div className="mt-5">
            <ProgressDots step={progressStep(load.status, load.trip?.status)} />
          </div>
          {held ? (
            <p className="mt-4 text-body-sm font-semibold text-green-800">
              {t.held.replace("{amount}", naira(load.totalKobo))}
            </p>
          ) : null}
          {load.trip ? (
            <Link
              href={`/app/ship/trips/${load.id}/track`}
              className={cn(
                buttonVariants({ variant: "secondary", size: "md" }),
                "mt-4 w-full gap-2",
              )}
            >
              <MapPin aria-hidden strokeWidth={1.75} />
              {t.track}
            </Link>
          ) : null}
        </section>
        {counter ? (
          <CounterCard
            offerId={counter.id}
            loadId={load.id}
            text={t.counter.text
              .replace("{org}", counterOrg)
              .replace("{amount}", naira(Number(counter.amount_kobo)))
              .replaceAll(
                "{extra}",
                naira(Number(counter.amount_kobo) - load.freightKobo),
              )}
          />
        ) : null}
        {topUp ? (
          <section className="flex flex-col gap-3 rounded-tile bg-surface p-5 shadow-raised lg:rounded-card">
            <h2 className="text-title-3 text-ink">{messages.checkout.pay}</h2>
            <PayTopUpButton paymentId={topUp.id} label={messages.finding.accept.replace("{amount}", naira(Number(topUp.amount_kobo)))} />
          </section>
        ) : null}
        <section className="rounded-tile bg-surface p-5 shadow-raised lg:rounded-card lg:p-6">
          <h2 className="mb-2 text-title-3 text-ink">{t.details}</h2>
          <TruckGraphic
            kind={truckKind(load.truckTypeCode)}
            load={fill}
            className="my-3"
          />
          <dl className="divide-y divide-line">
            <Row label={t.goods}>
              {[load.goods, loadLine(load)].filter(Boolean).join(" · ")}
            </Row>
            {stops.map((s) => (
              <Row
                key={s.seq}
                label={
                  s.kind === "pickup"
                    ? messages.booking.pickupAddress
                    : messages.booking.dropoffAddress
                }
              >
                <span className="block truncate">{s.address_text}</span>
                {s.contact_name ? (
                  <span className="block truncate text-caption font-medium text-ink-3">
                    {s.contact_name}
                  </span>
                ) : null}
              </Row>
            ))}
            <Row label={t.dates}>
              {lagosTime.format(new Date(load.pickupFrom))}
            </Row>
            <Row label={t.truck}>
              {load.trip?.plate
                ? `${load.trip.plate} · ${load.truckType}`
                : load.truckType}
            </Row>
          </dl>
        </section>
      </div>
      <aside className="flex flex-col gap-5 self-start">
        <section className="flex flex-col gap-3 rounded-tile bg-surface p-5 shadow-raised lg:rounded-card">
          <h2 className="text-title-3 text-ink">{t.price}</h2>
          <dl className="divide-y divide-line">
            <Row label={messages.booking.freight}>
              {naira(load.freightKobo)}
            </Row>
            <Row label={messages.booking.fee}>
              {load.feeKobo ? naira(load.feeKobo) : messages.booking.free}
            </Row>
            <Row label={messages.booking.total}>
              <span className="text-green-900">{naira(load.totalKobo)}</span>
            </Row>
          </dl>
          {showPay ? (
            <Link href={`/app/pay/${load.id}`} className={cn(buttonVariants(), "w-full")}>
              {messages.checkout.pay} {naira(load.totalKobo)}
            </Link>
          ) : null}
          {payments.some((p) => p.status === "received") ? (
            <Link
              href={`/app/ship/receipts/${payments.find((p) => p.status === "received")?.id}`}
              className="inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold text-green-700"
            >
              <Receipt aria-hidden className="size-4.5" strokeWidth={1.75} />
              {t.receipt}
            </Link>
          ) : null}
        </section>
        {cancellable ? (
          <CancelButton
            loadId={load.id}
            atPickup={
              !!load.trip && ["at_pickup", "loading"].includes(load.trip.status)
            }
          />
        ) : null}
      </aside>
    </div>
  );
}
