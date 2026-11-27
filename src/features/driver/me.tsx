import { ChevronRight, FileText, KeyRound, LifeBuoy, LogOut, Navigation, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { StatusChip } from "@/components/ui/chip";
import { signOut } from "@/features/auth/actions";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { MessageOwner } from "./message-owner";
import { NightChoice } from "./night";

// DV32 Me: who you drive for (Message, never the owner's number: D051), licence, phone check, emergency
// contact, dark screen at night, PIN, help, sign out. No money anywhere (D003).

const t = messages.driverMe;
const date = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(`${d}T12:00:00+01:00`));
const spaced = (p?: string | null) => (p ?? "").replace(/^([A-Z]{3})(\d{3})([A-Z]{2})$/, "$1 $2 $3");

function Row({ href, icon: Icon, title, sub, end }: { href?: string; icon: typeof FileText; title: string; sub?: string; end?: React.ReactNode }) {
  const body = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-icon bg-green-50 text-green-700">
        <Icon aria-hidden className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold text-ink">{title}</span>
        {sub ? <span className="block text-meta text-ink-3">{sub}</span> : null}
      </span>
      {end ?? (href ? <ChevronRight aria-hidden className="size-5 text-ink-2" strokeWidth={1.8} /> : null)}
    </>
  );
  return <li className="border-t border-line-soft first:border-t-0">{href ? <Link href={href} className="flex min-h-17 items-center gap-3.5 py-3">{body}</Link> : <div className="flex min-h-17 items-center gap-3.5 py-3">{body}</div>}</li>;
}

export async function DriverMe({ viewer }: { viewer: Promise<Viewer> }) {
  const v = await viewer;
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = (claims?.claims?.sub as string) ?? "";
  const [{ data: driver }, { data: profile }, { data: installs }] = await Promise.all([
    supabase.from("drivers").select("org_id, licence_expires_on, default_truck_id").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("phone, emergency_contact_name").eq("id", userId).maybeSingle(),
    supabase.from("app_installs").select("state").eq("state", "installed").limit(1),
  ]);
  const orgId = driver?.org_id ?? v.orgId;
  const [{ data: org }, { data: truck }, { data: team }] = await Promise.all([
    orgId ? supabase.from("organizations").select("name").eq("id", orgId).maybeSingle() : Promise.resolve({ data: null }),
    driver?.default_truck_id ? supabase.from("trucks").select("plate_number").eq("id", driver.default_truck_id).maybeSingle() : Promise.resolve({ data: null }),
    orgId ? supabase.rpc("team_members", { p_org: orgId }) : Promise.resolve({ data: [] }),
  ]);
  const owner = (team ?? []).find((m) => m.role === "owner")?.full_name;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
  const licenceOk = driver?.licence_expires_on ? driver.licence_expires_on >= today : false;
  const phone = profile?.phone?.replace(/^\+234(\d{3})(\d{3})(\d{4})$/, "+234 $1 $2 $3") ?? v.contact;
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <Avatar name={v.fullName} src={v.avatar} size={60} />
        <div className="min-w-0">
          <p className="truncate text-title-2 text-ink">{v.fullName}</p>
          <p className="truncate text-body text-ink-3">{phone}</p>
        </div>
      </div>
      {org && orgId ? (
        <section className="rounded-card border border-line bg-surface p-4.5">
          <p className="text-meta text-ink-3">{t.workingFor}</p>
          <div className="mt-1.5 flex items-center gap-3">
            <Avatar name={org.name} size={48} className="rounded-icon bg-green-900 text-white" />
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold text-ink">{org.name}</p>
              <p className="truncate text-meta text-ink-3">{[owner, spaced(truck?.plate_number)].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="mt-3.5">
            <MessageOwner orgId={orgId} orgName={org.name} userId={userId} />
          </div>
        </section>
      ) : null}
      <ul className="rounded-card border border-line bg-surface px-4.5">
        <Row icon={FileText} title={t.licence} sub={driver?.licence_expires_on ? t.ends.replace("{date}", date(driver.licence_expires_on)) : undefined} end={driver?.licence_expires_on ? <StatusChip tone={licenceOk ? "success" : "danger"}>{licenceOk ? t.ok : t.expired}</StatusChip> : undefined} />
        <Row href="/onboarding/install" icon={Navigation} title={t.phoneCheck} sub={installs?.length ? t.installed : t.notInstalled} />
        <Row href="/app/drive/me" icon={Users} title={t.emergency} sub={profile?.emergency_contact_name ?? t.noEmergency} />
        <li className="border-t border-line-soft py-3.5">
          <div className="flex items-start gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-icon bg-green-50 text-green-700">
              <Sparkles aria-hidden className="size-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold text-ink">{t.night}</span>
              <span className="block text-meta text-ink-3">{t.nightText}</span>
            </span>
          </div>
          <div className="mt-3">
            <NightChoice />
          </div>
        </li>
        <Row href={`/auth/pin/change?back=${encodeURIComponent("/app/drive/me")}`} icon={KeyRound} title={t.changePin} />
        <Row href="/app/drive/help" icon={LifeBuoy} title={t.help} />
      </ul>
      <form action={signOut}>
        <button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-button border border-line bg-surface text-control font-semibold text-danger">
          <LogOut aria-hidden className="size-4.5" strokeWidth={1.8} />
          {t.signOut}
        </button>
      </form>
    </div>
  );
}
