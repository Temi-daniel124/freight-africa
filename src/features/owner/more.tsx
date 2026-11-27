import { Bell, FileText, LifeBuoy, Lock, LogOut, MessageSquare, Star, Truck, Users, Map as MapIcon, Building2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Group, Row } from "@/features/account/account";
import { signOut } from "@/features/auth/actions";
import { switchAccount } from "@/features/org/actions";
import { DriveSwitch } from "@/features/settings/drive-switch";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

// O22 owner More: the drive switch (D043), Fleet (with Messages from drivers, v1.1), Business, settings.

const t = messages.ownerMore;

export async function OwnerMore({ viewer, drives }: { viewer: Promise<Viewer>; drives: boolean }) {
  const v = await viewer;
  if (!v.orgId) return null;
  const supabase = await supabaseServer();
  const [{ count: trucks }, { data: team }, { count: unread }, { data: org }, { data: perms }] = await Promise.all([
    supabase.from("trucks").select("id", { count: "exact", head: true }).eq("org_id", v.orgId).neq("status", "retired"),
    supabase.rpc("team_members", { p_org: v.orgId }),
    supabase.from("driver_messages").select("id", { count: "exact", head: true }).eq("org_id", v.orgId).is("read_at", null),
    supabase.from("organizations").select("tier").eq("id", v.orgId).maybeSingle(),
    supabase.rpc("org_permissions", { p_org: v.orgId }),
  ]);
  const can = (p: string) => ((perms ?? []) as string[]).includes(p);
  const drivers = (team ?? []).filter((d) => d.is_driver).length;
  const other = v.accounts.find((a) => !a.active) ?? null;
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <Avatar name={v.fullName} src={v.avatar} size={56} />
        <div className="min-w-0">
          <p className="truncate text-title-3 text-ink">{v.fullName}</p>
          <p className="truncate text-meta text-ink-3">{v.role}</p>
        </div>
      </div>
      {can("edit_business") ? (
        <div className="rounded-card border border-line bg-surface px-4.5 py-1">
          <DriveSwitch orgId={v.orgId} drives={drives} />
        </div>
      ) : null}
      <Group title={t.fleet}>
        {drives ? <Row href="/app/haul/trips" icon={MapIcon} label={t.trips} /> : null}
        <Row href="/app/haul/trucks" icon={Truck} label={t.trucks} value={String(trucks ?? 0)} />
        <Row href="/app/haul/drivers" icon={Users} label={t.drivers} value={String(drivers)} />
        {can("manage_drivers") ? <Row href="/app/haul/messages" icon={MessageSquare} label={t.messages} value={unread ? t.newCount.replace("{n}", String(unread)) : undefined} /> : null}
        <Row href="/app/haul/documents" icon={FileText} label={t.papers} />
        <Row href="/app/haul/record" icon={Star} label={t.record} value={messages.owner.tier[(org?.tier ?? "new") as keyof typeof messages.owner.tier]} />
      </Group>
      <Group title={t.business}>
        <Row href="/app/haul/team" icon={Building2} label={t.team} />
        <Row href="/app/haul/settings" icon={Bell} label={t.alerts} />
        <Row href="/app/haul/settings" icon={Lock} label={t.security} />
        <Row href="/app/haul/help" icon={LifeBuoy} label={t.help} />
      </Group>
      {other ? (
        <form action={switchAccount}>
          <input type="hidden" name="org" value={other.orgId} />
          <button type="submit" className="flex w-full items-center justify-between rounded-card border border-line bg-surface px-4.5 py-4 text-left">
            <span className="text-body font-semibold text-ink">{t.switch}</span>
            <span className="truncate text-meta text-ink-3">
              {other.name} · {other.label}
            </span>
          </button>
        </form>
      ) : null}
      <form action={signOut}>
        <button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-button border border-line bg-surface text-control font-semibold text-danger">
          <LogOut aria-hidden className="size-4.5" strokeWidth={1.8} />
          {t.signOut}
        </button>
      </form>
    </div>
  );
}
