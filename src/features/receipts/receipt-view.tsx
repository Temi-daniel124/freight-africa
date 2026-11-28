import { ChevronLeft, Download } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chip";
import { naira } from "@/features/booking/pieces";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import type { ReceiptModel } from "./pdfs";

// P15b (phone) and D07b (desktop) receipt, from the same model as the PDF (DOC-Receipt), so the app and
// the PDF always show the same amounts. No VAT line while vat_on_service_fee is off (D056).

const t = messages.receipt;
const day = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(iso));
const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(iso)).replace(",", "");

export function ReceiptView({ m, pdfHref, backHref }: { m: ReceiptModel; pdfHref: string; backHref: string }) {
  const l = m.lines;
  const items: [string, number][] = [[t.truck, l.freightKobo], [t.fee, l.feeKobo], ...l.extras.map((e) => [e.label, e.kobo] as [string, number])];
  const total = l.refundedKobo ? l.netKobo : l.paidKobo;
  const paidLine = `${m.provider === "bachs" ? t.paidBachs : t.paidDemo}${m.providerRef ? ` · ${t.ref} ${m.providerRef}` : ""}`;
  const route = m.trip[1] ?? "";
  return (
    <div className="mx-auto w-full max-w-190">
      {/* phone (P15b) */}
      <div className="lg:hidden">
        <article className="relative overflow-hidden rounded-card border border-line bg-surface px-5 py-5.5">
          <Image src="/brand/png/icon-green-1000.png" alt="" aria-hidden width={220} height={220} className="pointer-events-none absolute top-1/2 left-1/2 w-55 -translate-1/2 opacity-5" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <Logo variant="primary-green" className="h-5.5 w-auto" />
              <StatusChip tone="success">{t.paid}</StatusChip>
            </div>
            <p className="mt-4 text-meta text-ink-3">
              {t.title} {m.number} · {day(m.issuedAt)}
            </p>
            <p className="tabular mt-1 text-[34px] leading-tight font-semibold tracking-[-0.04em] text-ink">{naira(total)}</p>
            <hr className="my-4 border-line-soft" />
            <dl className="flex flex-col gap-2.5 text-body-sm">
              {[
                [t.trip, m.tripRef],
                [t.route, route],
                ...(m.deliveredAt ? [[t.delivered, when(m.deliveredAt)]] : []),
                [t.billed, m.billed[0] ?? ""],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="text-right font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <hr className="my-4 border-line-soft" />
            <dl className="flex flex-col gap-2.5 text-body-sm">
              {items.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="tabular text-ink">{naira(v)}</dd>
                </div>
              ))}
              {l.refundedKobo ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">{t.refunded}</dt>
                  <dd className="tabular text-ink">−{naira(l.refundedKobo)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3 pt-1.5 text-body font-semibold text-ink">
                <dt>{t.total}</dt>
                <dd className="tabular">{naira(total)}</dd>
              </div>
            </dl>
            <p className="mt-3.5 text-meta text-ink-3">{paidLine}</p>
          </div>
        </article>
        <div className="sticky bottom-0 mt-4 bg-paper pt-2 pb-4">
          <a href={pdfHref} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            <Download aria-hidden strokeWidth={1.8} />
            {t.download}
          </a>
        </div>
      </div>
      {/* desktop (D07b) */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between">
          <Link href={backHref} className="inline-flex min-h-11 items-center gap-1.5 text-body-sm font-semibold text-ink">
            <ChevronLeft aria-hidden className="size-4.5" strokeWidth={1.8} />
            {t.back}
          </Link>
          <a href={pdfHref} className={buttonVariants({ size: "sm" })}>
            <Download aria-hidden strokeWidth={1.8} />
            {t.download}
          </a>
        </div>
        <article className="relative mt-4.5 overflow-hidden rounded-card border border-line bg-surface px-14 py-12">
          <Image src="/brand/png/icon-green-1000.png" alt="" aria-hidden width={380} height={380} className="pointer-events-none absolute top-1/2 left-1/2 w-95 -translate-1/2 opacity-[0.045]" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <Logo variant="primary-green" className="h-8.5 w-auto" />
              <div className="text-right">
                <p className="text-title-3 text-ink">{t.title}</p>
                <p className="text-meta text-ink-3">
                  {m.number} · {day(m.issuedAt)}
                </p>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-10">
              <div>
                <p className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{t.billed}</p>
                <p className="mt-1.5 text-body font-semibold text-ink">{m.billed[0]}</p>
                <p className="text-body-sm whitespace-pre-line text-ink-2">{m.billed.slice(1).join("\n")}</p>
              </div>
              <div>
                <p className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{t.trip}</p>
                <p className="mt-1.5 text-body font-semibold text-ink">
                  {m.tripRef} · {route}
                </p>
                <p className="text-body-sm whitespace-pre-line text-ink-2">{[m.truckLine, ...m.trip.slice(2)].filter(Boolean).join("\n")}</p>
              </div>
            </div>
            <table className="mt-8 w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-line text-caption font-semibold tracking-caps text-ink-3 uppercase">
                  <th className="py-2.5 font-semibold">{t.item}</th>
                  <th className="py-2.5 text-right font-semibold">{t.amount}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(([k, v]) => (
                  <tr key={k} className="border-b border-line-soft">
                    <td className="py-3.5 text-ink">{k}</td>
                    <td className="tabular py-3.5 text-right text-ink">{naira(v)}</td>
                  </tr>
                ))}
                {l.refundedKobo ? (
                  <tr className="border-b border-line-soft">
                    <td className="py-3.5 text-ink">{t.refunded}</td>
                    <td className="tabular py-3.5 text-right text-ink">−{naira(l.refundedKobo)}</td>
                  </tr>
                ) : null}
                <tr>
                  <td className="py-3.5 text-body font-semibold text-ink">{t.total}</td>
                  <td className="tabular py-3.5 text-right text-[22px] font-semibold text-ink">{naira(total)}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-body-sm text-ink-2">
                {paidLine} · {day(m.issuedAt)}
              </p>
              <StatusChip tone="success">{t.paid}</StatusChip>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
