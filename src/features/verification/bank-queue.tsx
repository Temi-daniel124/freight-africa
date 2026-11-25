import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { DecideForm } from "./decide-form";

const t = messages.shell.staff.verification;

/**
 * Payout bank accounts waiting for a person (SYSTEM-LOGIC §10). Only finance staff and super admins can
 * read bank accounts, so for everyone else this section is empty. Shows the last four digits only.
 */
export async function BankQueue() {
  const supabase = await supabaseServer();
  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, org_id, bank_name, account_last4, resolved_name, name_match_score, created_at")
    .eq("status", "needs_review")
    .order("created_at")
    .limit(50);
  if (!accounts?.length) return <p className="rounded-tile bg-surface p-6 text-body text-ink-2 shadow-raised lg:rounded-card">{t.bankEmpty}</p>;
  const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", [...new Set(accounts.map((a) => a.org_id))]);
  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  return (
    <ul className="flex flex-col gap-4">
      {accounts.map((account) => (
        <li key={account.id} className="grid gap-4 rounded-tile bg-surface p-5 shadow-raised lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:rounded-card lg:p-6">
          <div>
            <p className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{orgName.get(account.org_id)}</p>
            <h2 className="text-title-2 text-ink">{account.resolved_name}</h2>
            <p className="text-body-sm text-ink-2">
              {t.bankLine.replace("{bank}", account.bank_name).replace("{last4}", account.account_last4).replace("{score}", String(account.name_match_score))}
            </p>
          </div>
          <DecideForm session={account.id} kind="bank" />
        </li>
      ))}
    </ul>
  );
}
