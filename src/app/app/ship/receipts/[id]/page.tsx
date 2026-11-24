import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { PrintButton } from "@/features/booking/print-button";
import { lagosTime, naira } from "@/features/booking/pieces";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.payments.receiptTitle };

const t = messages.payments;

async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await (await supabaseServer())
    .from("payments")
    .select("id, amount_kobo, received_kobo, received_at, purpose, org:organizations(name), load:loads(ref, freight_kobo, fee_kobo, total_kobo, from:cities!loads_from_city_id_fkey(name), to:cities!loads_to_city_id_fkey(name), goods:goods_categories(name))")
    .eq("id", id)
    .maybeSingle();
  if (!data || Number(data.received_kobo) <= 0) notFound();
  const load = data.load as unknown as { ref: string; freight_kobo: number; fee_kobo: number; total_kobo: number; from: { name: string } | null; to: { name: string } | null; goods: { name: string } | null } | null;
  const org = data.org as unknown as { name: string } | null;
  const rows: [string, string][] = [
    [t.ref, load?.ref ?? ""],
    [t.date, data.received_at ? lagosTime.format(new Date(data.received_at)) : ""],
    [t.from, org?.name ?? ""],
    [t.for, `${load?.goods?.name ?? ""}, ${load?.from?.name ?? ""} → ${load?.to?.name ?? ""}`],
    [t.method, t.transfer],
  ];
  return (
    <article className="mx-auto w-full max-w-160 rounded-card bg-surface p-6 shadow-raised print:max-w-none print:shadow-none lg:p-10">
      <header className="flex items-start justify-between gap-4 border-b border-line pb-5">
        <Logo variant="primary-green" className="h-8 w-auto" />
        <div className="text-right">
          <h1 className="text-title-2 font-extrabold text-ink">{t.receiptTitle}</h1>
          <p className="tabular text-body-sm text-ink-2">{data.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </header>
      <dl className="divide-y divide-line py-4 text-body-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-6 py-2.5">
            <dt className="shrink-0 text-ink-2">{label}</dt>
            <dd className="min-w-0 text-right font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <dl className="rounded-inner bg-paper p-4 text-body-sm">
        {data.purpose === "load" && load ? (
          <>
            <div className="flex justify-between py-1">
              <dt className="text-ink-2">{messages.booking.freight}</dt>
              <dd className="tabular font-semibold">{naira(Number(load.freight_kobo))}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-ink-2">{messages.booking.fee}</dt>
              <dd className="tabular font-semibold">{naira(Number(load.fee_kobo))}</dd>
            </div>
          </>
        ) : null}
        <div className="mt-1 flex justify-between border-t border-line pt-2 text-body">
          <dt className="font-bold">{t.paid}</dt>
          <dd className="tabular font-extrabold text-green-900">{naira(Number(data.received_kobo))}</dd>
        </div>
      </dl>
      <p className="mt-5 text-caption text-ink-3">{messages.booking.heldNote}</p>
      <div className="mt-6 print:hidden">
        <PrintButton label={t.print} note={t.printNote} />
      </div>
    </article>
  );
}

// S-16 Receipt: a printable page (save as PDF from the print dialog).
export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ShellSubpage role="shipper" title={t.receiptTitle}>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Receipt params={params} />
      </Suspense>
    </ShellSubpage>
  );
}
