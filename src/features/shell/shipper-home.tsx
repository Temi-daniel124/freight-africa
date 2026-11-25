import { ArrowRight, Check, Lock, MapPin, Plus, Star, Truck, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip, type StatusTone } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { siteHref } from "@/lib/hosts";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { pageHref, type ShellConfig } from "./config";

const t = messages.shell.home;

/** What the returning shipper's Home shows. Real trips arrive with Phase 3; /dev/home passes sample data. */
export type ShipperHomeData = typeof messages.devHome;

const actionIcons: Record<string, LucideIcon> = { money: Wallet, truck: Truck, star: Star };
const iconTones: Record<string, string> = {
  warning: "bg-warning-100 text-warning",
  info: "bg-info-100 text-info",
  danger: "bg-danger-100 text-danger",
  success: "bg-success-100 text-success",
};

function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-body-lg leading-5.5 font-semibold tracking-close text-ink">{title}</h2>
      {action}
    </div>
  );
}

function Ref({ children }: { children: ReactNode }) {
  return <span className="tabular font-semibold tracking-kv">{children}</span>;
}

/** Puts the trip reference into a sentence ("{ref} is waiting for payment") in its plate style. */
function withRef(text: string, ref: string) {
  if (!ref || !text.includes("{ref}")) return text;
  const [before, after] = text.split("{ref}");
  return (
    <>
      {before}
      <Ref>{ref}</Ref>
      {after}
    </>
  );
}

/** The Book a truck card: the role's main action, first on phones and top of the right rail on desktop. */
function BookCard({ config, from, className }: { config: ShellConfig; from?: string; className?: string }) {
  const book = pageHref(config, "book");
  const fields = [
    { label: t.from, value: from, filled: true },
    { label: t.to, value: undefined, filled: false },
  ];
  return (
    <section className={cn("rounded-tile bg-surface p-4.5 shadow-raised lg:rounded-card lg:p-6", className)}>
      <h2 className="text-body-lg leading-5.5 font-semibold tracking-close text-ink">{t.bookTitle}</h2>
      <p className="mt-1 text-label font-normal tracking-normal text-ink-2">{t.bookText}</p>
      <div className="mt-4 mb-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
        {fields.map((field) => (
          <Link key={field.label} href={book} className="flex items-center gap-3 rounded-field border border-line-strong px-3.5 pt-2.25 pb-2.5 hover:border-green-700">
            <i aria-hidden className={cn("size-2.5 shrink-0 rounded-pill border-2 border-green-700", field.filled && "bg-green-700")} />
            <span className="min-w-0">
              <small className="block text-micro leading-3.5 text-ink-3">{field.label}</small>
              {field.value ? (
                <span className="block text-body leading-4.75 font-semibold text-ink">{field.value}</span>
              ) : (
                <span className="block text-body leading-4.75 font-medium text-ink-3">{t.chooseCity}</span>
              )}
            </span>
          </Link>
        ))}
      </div>
      <Link href={book} className={cn(buttonVariants({ size: "md" }), "w-full")}>
        {t.continue}
        <ArrowRight aria-hidden strokeWidth={1.75} />
      </Link>
    </section>
  );
}

/** First visit (no trips yet): ux-shipper S-01 and the component sheet's empty state. */
export function ShipperHomeFirstVisit({ config, showOffer = true }: { config: ShellConfig; showOffer?: boolean }) {
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-home lg:items-start lg:gap-6">
      <section className="rounded-tile bg-surface shadow-raised lg:rounded-card">
        <EmptyState
          title={messages.shell.pages.home.empty}
          // The launch offer's wording; whether it applies moves to the settings table in slice 6.
          offer={showOffer ? t.firstOffer : undefined}
          action={
            <Link href={pageHref(config, "book")} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden strokeWidth={1.75} />
              {t.firstAction}
            </Link>
          }
          points={[
            { icon: Lock, text: t.firstPoints[0] },
            { icon: Check, text: t.firstPoints[1] },
            { icon: MapPin, text: t.firstPoints[2] },
          ]}
          secondary={
            <a href={siteHref("/#how-it-works")} className={buttonVariants({ variant: "tertiary", size: "text" })}>
              {t.howItWorks}
            </a>
          }
        />
      </section>
      <BookCard config={config} className="max-lg:hidden" />
    </div>
  );
}

/** A returning shipper (the Gate 4 target): needs your action, live trips, book, book again, this month. */
export function ShipperHomeReturning({ config, data }: { config: ShellConfig; data: ShipperHomeData }) {
  const trips = pageHref(config, "trips");
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-home lg:items-start lg:gap-6">
      <div className="contents lg:flex lg:flex-col lg:gap-6">
        <section className="order-1 lg:order-none">
          <SectionHead title={t.needsAction} />
          <ul className="rounded-tile bg-surface shadow-raised lg:rounded-card">
            {data.actions.map((item) => {
              const Icon = actionIcons[item.icon];
              return (
                <li key={item.text} className="grid grid-cols-row items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 lg:gap-3.5 lg:px-5 lg:py-3.5">
                  <span aria-hidden className={cn("grid size-9 place-items-center rounded-nav lg:size-10", iconTones[item.tone])}>
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <p className="text-body-sm leading-5 text-ink">
                    {withRef(item.text, item.ref)}
                    <small className="mt-0.5 block text-caption leading-4 font-medium tracking-normal text-ink-3">{item.detail}</small>
                  </p>
                  <Link href={trips} className={buttonVariants({ size: "sm", variant: item.primary ? "primary" : "secondary" })}>
                    {item.action}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="order-4 lg:order-none">
          <SectionHead
            title={t.liveTrips}
            action={
              <Link href={trips} className="text-label font-semibold tracking-normal text-green-700 hover:underline">
                {t.seeAllTrips}
              </Link>
            }
          />
          <div className="overflow-hidden rounded-card bg-surface shadow-raised max-lg:hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-caption leading-3.75 font-semibold tracking-normal text-ink-3">
                  {[t.columns.reference, t.columns.route, t.columns.status, t.columns.next].map((column) => (
                    <th key={column} scope="col" className="border-b border-line px-5 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                  <th scope="col" className="border-b border-line px-5 py-3 text-right font-semibold">
                    {t.columns.held}
                  </th>
                </tr>
              </thead>
              <tbody className="text-body-sm font-normal text-ink">
                {data.trips.map((trip) => (
                  <tr key={trip.ref} className="border-b border-line last:border-b-0">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Ref>{trip.ref}</Ref>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold">{trip.route}</span>
                      <span className="mt-0.5 block text-caption leading-3.75 font-medium tracking-normal text-ink-3">{trip.sub}</span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusChip tone={trip.tone as StatusTone} icon={trip.tone === "info" ? Truck : undefined}>
                        {trip.status}
                      </StatusChip>
                    </td>
                    <td className="px-5 py-4">
                      {trip.next}
                      <span className="mt-0.5 block text-caption leading-3.75 font-medium tracking-normal text-ink-3">{trip.nextSub}</span>
                    </td>
                    <td className="tabular px-5 py-4 text-right font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        {trip.locked ? <Lock aria-hidden className="size-3.5 text-green-700" strokeWidth={1.75} /> : null}
                        {trip.held}
                      </span>
                      <span className="mt-0.5 block text-caption leading-3.75 font-medium tracking-normal text-ink-3">{trip.heldSub}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2.5 lg:hidden">
            {data.trips
              .filter((trip) => trip.phone)
              .map((trip) => (
                <Link key={trip.ref} href={trips} className="rounded-tile bg-surface p-4 shadow-raised">
                  <div className="flex items-center justify-between text-label font-normal tracking-normal text-ink-2">
                    <Ref>{trip.ref}</Ref>
                    <StatusChip tone={trip.tone as StatusTone} icon={trip.tone === "info" ? Truck : undefined}>
                      {trip.status}
                    </StatusChip>
                  </div>
                  <p className="mt-2 text-body-lg leading-5.5 font-semibold tracking-close text-ink">{trip.route}</p>
                  <p className="mt-1 text-label leading-4 font-normal tracking-normal text-ink-2">{trip.phoneNext}</p>
                  <p className="tabular mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-label leading-4 font-semibold tracking-normal text-ink">
                    <Lock aria-hidden className="size-4 text-green-700" strokeWidth={1.75} />
                    {trip.held} {trip.heldSub}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      </div>

      <div className="contents lg:flex lg:flex-col lg:gap-6">
        <BookCard config={config} from={data.fromCity} className="order-2 lg:order-none" />
        <section className="order-3 min-w-0 lg:hidden">
          <SectionHead title={t.bookAgain} />
          <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pt-0.5 pb-1.5 [scrollbar-width:none]">
            {data.again.map((trip) => (
              <li key={trip.route} className="w-55 shrink-0">
                <Link href={pageHref(config, "book")} className="block rounded-tray bg-surface px-4 py-3.5 shadow-raised">
                  <b className="block text-body leading-4.75 font-semibold text-ink">{trip.route}</b>
                  <small className="mt-0.5 block text-caption leading-3.75 font-medium tracking-normal text-ink-3">{trip.detail}</small>
                  <span className="tabular mt-2.5 block text-label font-semibold tracking-normal text-green-700">{t.lastTime.replace("{amount}", trip.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-card bg-surface p-6 shadow-raised max-lg:hidden">
          <SectionHead title={t.bookAgain} />
          <ul>
            {data.again.map((trip) => (
              <li key={trip.route} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
                <span className="min-w-0 text-body-sm text-ink">
                  {trip.route}
                  <small className="mt-0.5 block text-caption leading-3.75 font-medium tracking-normal text-ink-3">
                    {trip.detail} · {t.last.replace("{amount}", trip.amount)}
                  </small>
                </span>
                <Link href={pageHref(config, "book")} className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "ml-auto")}>
                  {t.bookAgainAction}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-card bg-surface p-6 shadow-raised max-lg:hidden">
          <SectionHead title={t.thisMonth} />
          <div className="flex items-center gap-3.5">
            <b className="tabular text-stat text-ink">{data.month.count}</b>
            <p className="text-label leading-4.5 font-normal tracking-normal text-ink-2">
              {data.month.text}
              <br />
              {data.month.detail}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
