"use client";

import { Info, Trash2, X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusChip, type StatusTone } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { cancelLoad } from "@/features/booking/actions";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { DaySheet, type DayFree } from "./finding";

// P12 / P12b Trips with its four tabs; Drafts (D049) aren't booked and nothing is held for them.

const d = messages.drafts;
const naira = (kobo: number) => formatNaira(kobo / 100);
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export type TabKey = "active" | "drafts" | "done" | "cancelled";

export type DraftCard = {
  id: string;
  route: string;
  /** "Cement, 30 t · Thu 26 Nov · tipper", or with "day not set" when the day has passed. */
  line: string;
  saved: string;
  totalKobo: number;
  dayPassed: boolean;
};

function DraftItem({ draft, days }: { draft: DraftCard; days: DayFree[] }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [finish, setFinish] = useState(false);
  const [pending, start] = useTransition();
  const remove = () =>
    start(async () => {
      const result = await cancelLoad(draft.id, "Draft deleted");
      if (result.status === "error") toast.error(messages.checkout.error);
      setAsk(false);
      router.refresh();
    });
  return (
    <li className="rounded-card border border-line bg-surface px-5 pt-4.5 pb-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{draft.saved}</p>
        <Sheet
          kind="confirm"
          open={ask}
          onOpenChange={setAsk}
          title={d.removeTitle}
          description={d.removeText}
          trigger={
            <button type="button" aria-label={d.remove} className="-mt-2.5 -mr-2.5 grid size-11 place-items-center rounded-full text-ink-2 hover:bg-paper">
              <Trash2 aria-hidden className="size-4.5" strokeWidth={1.8} />
            </button>
          }
          actions={
            <>
              <Button variant="secondary" onClick={() => setAsk(false)}>
                {d.keep}
              </Button>
              <Button variant="destructive" loading={pending} onClick={remove}>
                {d.removeYes}
              </Button>
            </>
          }
        >
          {null}
        </Sheet>
      </div>
      <p className="mt-1 text-title-3 text-ink">{draft.route}</p>
      <p className="text-meta text-ink-3">{draft.line}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-3.5">
        {draft.dayPassed ? (
          <>
            <span className="text-meta text-ink-3">{d.priceLater}</span>
            <Button variant="secondary" size="sm" onClick={() => setFinish(true)}>
              {d.finish}
            </Button>
          </>
        ) : (
          <>
            <span className="tabular text-title-3 text-ink">{naira(draft.totalKobo)}</span>
            <Link href={`/app/pay/${draft.id}`} className={buttonVariants({ size: "sm" })}>
              {d.payToBook}
            </Link>
          </>
        )}
      </div>
      {draft.dayPassed ? (
        <DaySheet open={finish} onOpenChange={setFinish} loadId={draft.id} days={days} title={d.chooseDay} then={() => router.push(`/app/pay/${draft.id}`)} />
      ) : null}
    </li>
  );
}

export type DeskRow = {
  id: string;
  ref: string;
  route: string;
  from: string;
  to: string;
  pickup: string;
  status: string;
  tone: StatusTone;
  goods: string;
  truck: string;
  paidKobo: number;
  money: string;
  driver: { name: string; plate: string | null } | null;
  live: boolean;
};

/** D05: the desktop table of one tab, with the trip's detail panel on the right. */
function DeskTable({ rows }: { rows: DeskRow[] }) {
  const [open, setOpen] = useState<DeskRow | null>(null);
  if (!rows.length) return <p className="rounded-card border border-line bg-surface px-6 py-10 text-center text-body-sm text-ink-2">{d.emptyTab}</p>;
  const facts = (row: DeskRow) => [
    [d.from, row.from],
    [d.to, row.to],
    [d.goods, row.goods],
    [d.truck, row.truck],
    [d.paid, naira(row.paidKobo)],
    [d.money, row.money],
  ];
  return (
    <>
      <table className="w-full overflow-hidden rounded-card border border-line bg-surface text-left">
        <thead className="bg-paper/60">
          <tr className="text-caption font-semibold tracking-caps text-ink-3 uppercase">
            <th className="px-5 py-3 font-semibold">{d.cols.ref}</th>
            <th className="px-5 py-3 font-semibold">{d.cols.route}</th>
            <th className="px-5 py-3 font-semibold">{d.cols.pickup}</th>
            <th className="px-5 py-3 font-semibold">{d.cols.status}</th>
          </tr>
        </thead>
        <tbody className="text-body-sm text-ink">
          {rows.map((row) => (
            <tr key={row.id} onClick={() => setOpen(row)} className={cn("cursor-pointer border-t border-line-soft hover:bg-paper", open?.id === row.id && "bg-green-50/60")}>
              <td className="tabular px-5 py-4 font-semibold">
                <button type="button" onClick={() => setOpen(row)} className="text-left">
                  {row.ref}
                </button>
              </td>
              <td className="px-5 py-4 font-semibold">{row.route}</td>
              <td className="px-5 py-4">{row.pickup}</td>
              <td className="px-5 py-4">
                <StatusChip tone={row.tone}>{row.status}</StatusChip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <RadixDialog.Root open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <RadixDialog.Portal>
          <RadixDialog.Content className="fixed inset-y-0 right-0 z-50 flex w-110 flex-col border-l border-line bg-surface shadow-panel outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right motion-reduce:animate-none">
            {open ? (
              <>
                <header className="flex h-20 items-center justify-between border-b border-line px-6">
                  <RadixDialog.Title className="tabular text-body-sm font-semibold text-ink-2">{open.ref}</RadixDialog.Title>
                  <RadixDialog.Close aria-label={d.close} className="grid size-10 place-items-center rounded-full border border-line text-ink">
                    <X aria-hidden className="size-4.5" strokeWidth={1.8} />
                  </RadixDialog.Close>
                </header>
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <StatusChip tone={open.tone}>{open.status}</StatusChip>
                  <p className="mt-2.5 text-title-1 text-ink">{open.route}</p>
                  <RadixDialog.Description className="text-body-sm text-ink-2">{open.pickup}</RadixDialog.Description>
                  <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
                    {facts(open).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-caption text-ink-3">{k}</dt>
                        <dd className={cn("text-body font-semibold", k === d.money ? "text-green-800" : "text-ink")}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {open.driver ? (
                    <div className="mt-5 flex items-center gap-3 rounded-card border border-line px-4 py-3.5">
                      <Avatar name={open.driver.name} size={40} />
                      <div className="min-w-0">
                        <p className="text-body-sm font-semibold text-ink">{open.driver.name}</p>
                        <p className="text-caption text-ink-3">{d.driver.replace("{plate}", open.driver.plate ?? "")}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
                <footer className="border-t border-line px-6 py-4">
                  <Link href={open.live ? "/app/ship/trips/" + open.id + "/track" : "/app/ship/trips/" + open.id} className={cn(buttonVariants(), "w-full")}>
                    {open.live ? d.openMap : d.viewTrip}
                  </Link>
                </footer>
              </>
            ) : null}
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </>
  );
}

export function TripsTabs({ counts, lists, desk, drafts, days }: { counts: Record<TabKey, number>; lists: Record<Exclude<TabKey, "drafts">, ReactNode>; desk?: Record<Exclude<TabKey, "drafts">, DeskRow[]>; drafts: DraftCard[]; days: DayFree[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const asked = params.get("tab") as TabKey | null;
  const tab: TabKey = asked && asked in counts ? asked : "active";
  const label = (k: TabKey) => (counts[k] && (k === "active" || k === "drafts") ? fill(d.count, { label: d.tabs[k], n: counts[k] }) : d.tabs[k]);
  return (
    <div className="mx-auto w-full max-w-[880px]">
      <div role="tablist" aria-label={messages.shell.pages.trips.title} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0">
        {(Object.keys(counts) as TabKey[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => router.replace(`${path}?tab=${k}`, { scroll: false })}
            className={cn("h-11 shrink-0 rounded-pill border px-4 text-body-sm font-semibold whitespace-nowrap", tab === k ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface text-ink")}
          >
            {label(k)}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-4">
        {tab === "drafts" ? (
          drafts.length ? (
            <>
              <p className="flex items-start gap-2.5 rounded-callout bg-warning-100 px-4 py-3 text-meta text-ink-2">
                <Info aria-hidden className="mt-0.5 size-4.5 shrink-0 text-warning" strokeWidth={1.8} />
                {d.banner}
              </p>
              <ul className="mt-3 flex flex-col gap-3">
                {drafts.map((x) => (
                  <DraftItem key={x.id} draft={x} days={days} />
                ))}
              </ul>
              {drafts.length >= 2 ? (
                <Link href="/app/pay/several" className="mt-4 flex min-h-12 items-center justify-center text-body font-semibold text-green-700">
                  {d.paySeveral}
                </Link>
              ) : null}
            </>
          ) : (
            <div className="rounded-card border border-line bg-surface px-6 py-10 text-center">
              <p className="text-title-3 text-ink">{d.emptyDrafts}</p>
              <p className="mt-1 text-body-sm text-ink-2">{d.emptyDraftsText}</p>
            </div>
          )
        ) : (
          <>
            <div className={cn(desk && "lg:hidden")}>{lists[tab]}</div>
            {desk ? (
              <div className="hidden lg:block">
                <DeskTable key={tab} rows={desk[tab]} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
