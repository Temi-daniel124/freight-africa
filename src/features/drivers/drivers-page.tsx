import { UserRound, UserPlus } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip, type StatusTone } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { PinLinkButton } from "@/features/auth/pin-link-button";
import { PauseDriverButton } from "./pause-button";

const t = messages.drivers.list;
const date = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" });

/** T-11 Drivers: every driver, whether they can drive, and Add a driver (the team invite, T-12). */
export async function DriversPage({ orgId }: { orgId: string | null }) {
  const add = (
    <Link href="/app/haul/team" className={buttonVariants({ size: "md" })}>
      <UserPlus aria-hidden strokeWidth={1.75} />
      {t.add}
    </Link>
  );
  if (!orgId) {
    return (
      <section className="rounded-tile bg-surface shadow-raised lg:rounded-card">
        <EmptyState title={t.empty} art={<UserRound aria-hidden className="size-10 text-green-700" strokeWidth={1.5} />}>
          {t.emptyText}
        </EmptyState>
      </section>
    );
  }
  const supabase = await supabaseServer();
  const [{ data: members }, { data: drivers }] = await Promise.all([supabase.rpc("team_members", { p_org: orgId }), supabase.from("drivers").select("user_id, status, paused, licence_expires_on")]);
  const list = (members ?? []).filter((m) => m.is_driver && !m.is_me);
  const byId = new Map((drivers ?? []).map((d) => [d.user_id, d]));
  if (!list.length) {
    return (
      <section className="rounded-tile bg-surface shadow-raised lg:rounded-card">
        <EmptyState title={t.empty} art={<UserRound aria-hidden className="size-10 text-green-700" strokeWidth={1.5} />} action={add}>
          {t.emptyText}
        </EmptyState>
      </section>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{add}</div>
      <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
        {list.map((member) => {
          const driver = byId.get(member.user_id);
          const key: keyof typeof t.status = member.status === "pending" ? "invited" : driver?.status === "suspended" ? "suspended" : driver?.paused ? "paused" : driver?.status === "active" ? "active" : "pending";
          const tone: StatusTone = key === "active" ? "success" : key === "suspended" ? "danger" : key === "paused" ? "neutral" : "warning";
          return (
            <li key={member.user_id} className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3.5 first:border-t-0 lg:px-6">
              <span className="min-w-0 flex-1">
                <span className="block text-body font-bold text-ink">{member.full_name}</span>
                {driver?.licence_expires_on ? <span className="block text-body-sm text-ink-2">{t.licence.replace("{date}", date.format(new Date(driver.licence_expires_on)))}</span> : null}
              </span>
              <StatusChip tone={tone}>{t.status[key]}</StatusChip>
              {driver && driver.status !== "suspended" ? <PauseDriverButton driver={member.user_id} paused={driver.paused} /> : null}
              {/* D044: invited by phone (no email of their own) and forgot their PIN. */}
              {orgId && member.status === "active" && member.phone && !member.email && !member.is_me ? <PinLinkButton orgId={orgId} memberId={member.user_id} name={member.full_name ?? ""} /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
