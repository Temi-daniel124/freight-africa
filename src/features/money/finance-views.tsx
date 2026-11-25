import { StatusChip } from "@/components/ui/chip";
import { lagosDate, naira } from "@/features/booking/pieces";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { ApproveButton } from "./approve-button";

const t = messages.finance;

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) return <p className="rounded-card bg-surface p-5 text-body-sm text-ink-2 shadow-raised">{t.none}</p>;
  return (
    <div className="overflow-x-auto rounded-card bg-surface shadow-raised">
      <table className="w-full min-w-[640px] text-left text-body-sm">
        <thead className="text-caption text-ink-3">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-t border-line">
              {cells.map((cell, j) => (
                <td key={j} className="px-4 py-3 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** X finance: money held for each load right now (ledger), with the platform totals. */
export async function EscrowView() {
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("ledger_account_balances");
  const rows = (data ?? []).filter((a) => a.balance_kobo !== 0);
  const loadIds = rows.filter((a) => a.load_id).map((a) => a.load_id as string);
  const { data: loads } = loadIds.length ? await supabase.from("loads").select("id, ref, status, is_demo").in("id", loadIds) : { data: [] };
  const byId = new Map((loads ?? []).map((l) => [l.id, l]));
  return (
    <Table
      head={[t.account, t.load, t.status, t.balance]}
      rows={rows.map((a) => {
        const load = a.load_id ? byId.get(a.load_id) : null;
        return [t.kinds[a.kind as keyof typeof t.kinds] ?? a.kind, load ? `${load.ref}${load.is_demo ? " (demo)" : ""}` : "—", load?.status ?? "—", <span key="b" className="tabular font-semibold">{naira(Number(a.balance_kobo))}</span>];
      })}
    />
  );
}

/** X finance: payouts, newest first; large ones wait for a second person. */
export async function PayoutsView() {
  const { data } = await (await supabaseServer()).from("payouts").select("id, kind, amount_kobo, status, created_at, paid_at, org:organizations(name), trip:trips(ref)").order("created_at", { ascending: false }).limit(100);
  return (
    <Table
      head={[t.date, t.business, t.trip, t.kind, t.amount, t.status, ""]}
      rows={(data ?? []).map((p) => [
        lagosDate.format(new Date(p.created_at)),
        (p.org as unknown as { name: string } | null)?.name ?? "",
        (p.trip as unknown as { ref: string } | null)?.ref ?? "",
        messages.earnings[p.kind as "advance"] ?? p.kind,
        <span key="a" className="tabular font-semibold">{naira(Number(p.amount_kobo))}</span>,
        <StatusChip key="s" tone={p.status === "paid" ? "success" : p.status === "awaiting_approval" ? "warning" : "info"}>{t.statuses[p.status as keyof typeof t.statuses] ?? p.status}</StatusChip>,
        p.status === "awaiting_approval" ? <ApproveButton key="x" kind="payout" id={p.id} /> : null,
      ])}
    />
  );
}

/** X finance: refunds; a refund above the threshold waits for a second person. */
export async function RefundsView() {
  const { data } = await (await supabaseServer()).from("refunds").select("id, amount_kobo, status, reason, created_at, org:organizations(name), load:loads(ref)").order("created_at", { ascending: false }).limit(100);
  return (
    <Table
      head={[t.date, t.business, t.load, t.reason, t.amount, t.status, ""]}
      rows={(data ?? []).map((r) => [
        lagosDate.format(new Date(r.created_at)),
        (r.org as unknown as { name: string } | null)?.name ?? "",
        (r.load as unknown as { ref: string } | null)?.ref ?? "",
        <span key="r" className="block max-w-60 truncate">{r.reason}</span>,
        <span key="a" className="tabular font-semibold">{naira(Number(r.amount_kobo))}</span>,
        <StatusChip key="s" tone={r.status === "paid" ? "success" : r.status === "awaiting_approval" ? "warning" : "info"}>{t.statuses[r.status as keyof typeof t.statuses] ?? r.status}</StatusChip>,
        r.status === "awaiting_approval" ? <ApproveButton key="x" kind="refund" id={r.id} /> : null,
      ])}
    />
  );
}
