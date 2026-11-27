import { Bell, Check, ChevronRight, Download, FileText, Key, LifeBuoy, Lock, LogOut, Mail, MapPin, Phone, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { lockMinutes } from "@/features/auth/unlock";
import { signOut } from "@/features/auth/actions";
import { switchAccount } from "@/features/org/actions";
import { shipperLoads } from "@/features/booking/data";
import { naira } from "@/features/booking/pieces";
import { AvatarPicker } from "@/features/settings/avatar-picker";
import { SecuritySection } from "@/features/settings/security-section";
import { initials, type Viewer } from "@/features/shell/viewer";
import { siteHref } from "@/lib/hosts";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { BusinessForm, HelpQuestions, NotificationTable, PillTabs, SavedPlaces, type Place, type Receiver } from "./account-client";

// Sender account screens (combined brief 5e): P16 More, P16a switch (on More), P16d / D11 saved places,
// P16e / P16f / P16g / D12 settings tabs, P15 / D07 payments, P25 / D13 help.

const a = messages.account;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

function Row({ href, icon: Icon, label, value, danger }: { href: string; icon: typeof Bell; label: string; value?: string; danger?: boolean }) {
  return (
    <li>
      <Link href={href} className="flex min-h-16 items-center gap-3.5 border-t border-line-soft py-3 first:border-t-0">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-icon", danger ? "bg-danger-100 text-danger" : "bg-green-50 text-green-700")}>
          <Icon aria-hidden className="size-4.5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{label}</span>
        {value ? <span className="shrink-0 text-meta text-ink-3">{value}</span> : null}
        <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-2" strokeWidth={1.8} />
      </Link>
    </li>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-caption font-semibold tracking-caps text-ink-3 uppercase">{title}</h2>
      <ul className="rounded-card border border-line bg-surface px-4.5">{children}</ul>
    </section>
  );
}

async function twoStepOn() {
  const { data } = await (await supabaseServer()).auth.mfa.listFactors();
  return !!data?.totp.some((f) => f.status === "verified");
}

/** P16 More, with P16a Switch account only for people in more than one business. */
export async function SenderMore({ viewer }: { viewer: Promise<Viewer> }) {
  const v = await viewer;
  const supabase = await supabaseServer();
  const [{ count }, twoStep] = await Promise.all([
    v.orgId ? supabase.from("organization_members").select("user_id", { count: "exact", head: true }).eq("org_id", v.orgId) : Promise.resolve({ count: 0 }),
    twoStepOn(),
  ]);
  const active = v.accounts.find((x) => x.active) ?? null;
  const other = v.accounts.find((x) => !x.active) ?? null;
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <div className="flex items-center gap-3.5">
        <Avatar name={v.fullName} src={v.avatar} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-title-3 text-ink">{v.fullName}</p>
          <p className="truncate text-meta text-ink-3">{v.contact}</p>
        </div>
        <Link href="/app/ship/settings?tab=security" className="text-body-sm font-semibold text-green-700">
          {a.profile}
        </Link>
      </div>
      {active ? (
        <div>
          <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-icon bg-green-900 text-body-sm font-semibold text-white">{initials(active.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-semibold text-ink">{active.name}</p>
              <p className="truncate text-meta text-ink-3">{active.label}</p>
            </div>
            {other ? (
              <form action={switchAccount}>
                <input type="hidden" name="org" value={other.orgId} />
                <button type="submit" className="min-h-11 text-body-sm font-semibold text-green-800">
                  {a.switch}
                </button>
              </form>
            ) : null}
          </div>
          {other ? <p className="mt-1.5 px-1 text-caption text-ink-3">{fill(a.alsoOwn, { name: other.name })}</p> : null}
        </div>
      ) : null}
      <Group title={a.yourBusiness}>
        <Row href="/app/ship/team" icon={Users} label={a.team} value={count === 1 ? a.person : fill(a.people, { n: count ?? 0 })} />
        <Row href="/app/ship/places" icon={MapPin} label={a.places} />
        <Row href="/app/ship/settings?tab=business" icon={FileText} label={a.business} />
      </Group>
      <Group title={a.settingsHead}>
        <Row href="/app/ship/settings?tab=notifications" icon={Bell} label={a.notifications} />
        <Row href="/app/ship/settings?tab=security" icon={Lock} label={a.security} value={twoStep ? a.twoStepOn : a.twoStepOff} />
        <Row href="/onboarding/install" icon={Download} label={a.install} />
        <Row href="/app/ship/help" icon={LifeBuoy} label={a.help} />
      </Group>
      <form action={signOut}>
        <button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-button border border-line bg-surface text-control font-semibold text-danger">
          <LogOut aria-hidden className="size-4.5" strokeWidth={1.8} />
          {a.signOut}
        </button>
      </form>
      <p className="text-center text-caption text-ink-3">
        {a.version} · <a href={siteHref("/terms")}>{a.terms}</a> · <a href={siteHref("/privacy")}>{a.privacy}</a>
      </p>
    </div>
  );
}

/** D12 Settings with tabs; on phones each tab is its own screen from More (P16e, P16f, P16g). */
export async function SenderSettings({ viewer }: { viewer: Promise<Viewer> }) {
  const v = await viewer;
  const supabase = await supabaseServer();
  const [{ data: claims }, twoStep, minutes, { data: prefs }, { data: org }, { data: perms }, { data: staff }] = await Promise.all([
    supabase.auth.getClaims(),
    twoStepOn(),
    lockMinutes(),
    supabase.from("notification_preferences").select("event, channel, enabled"),
    v.orgId ? supabase.from("organizations").select("name, cac_number, receipt_address, receipt_email").eq("id", v.orgId).maybeSingle() : Promise.resolve({ data: null }),
    v.orgId ? supabase.rpc("org_permissions", { p_org: v.orgId }) : Promise.resolve({ data: [] }),
    supabase.rpc("my_staff_role"),
  ]);
  const c = claims?.claims;
  const email = typeof c?.email === "string" && !c.email.endsWith("@phone.freight-africa.com") ? c.email : "";
  const phone = typeof c?.phone === "string" && c.phone ? `+${c.phone}` : "";
  const prefMap = Object.fromEntries((prefs ?? []).map((p) => [`${p.event}:${p.channel}`, p.enabled]));
  const canEdit = ((perms ?? []) as string[]).includes("edit_business");
  const security = (
    <div className="flex flex-col gap-4">
      <section className="rounded-card border border-line bg-surface p-5 lg:p-6">
        <h2 className="text-lead font-semibold text-ink">{a.profile}</h2>
        <AvatarPicker name={v.fullName} current={v.avatar ? (v.avatar.split("/").pop()?.replace(".webp", "") ?? null) : null} />
        <dl className="mt-4 grid gap-3 lg:grid-cols-3">
          {[
            [a.name, v.fullName],
            [a.email, email || "—"],
            [a.phone, phone || "—"],
          ].map(([k, val]) => (
            <div key={k} className="rounded-input border border-line-field px-4 py-2.5">
              <dt className="text-caption text-ink-3">{k}</dt>
              <dd className="truncate text-body text-ink">{val}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-card border border-line bg-surface p-5 lg:p-6">
        <h2 className="mb-2 text-lead font-semibold text-ink">{a.signIn}</h2>
        <SecuritySection back="/app/ship/settings?tab=security" twoStep={twoStep} staff={!!staff} lockMinutes={minutes} changed={false} />
        <p className="mt-3 flex items-start gap-3 border-t border-line-soft pt-3.5 text-meta text-ink-3">
          <Key aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          {a.lockAfter} · {fill(a.lockText, { n: minutes })}
        </p>
      </section>
    </div>
  );
  const notifications = <NotificationTable prefs={prefMap} />;
  const business = v.orgId ? (
    <BusinessForm
      org={v.orgId}
      canEdit={canEdit}
      initials={initials(org?.name ?? v.account)}
      initial={{ name: org?.name ?? "", cac: org?.cac_number ?? "", address: org?.receipt_address ?? "", email: org?.receipt_email ?? "" }}
    />
  ) : null;
  const privacy = (
    <div className="rounded-card border border-line bg-surface p-5 lg:p-6">
      <p className="text-body text-ink-2">{a.privacyText}</p>
      <div className="mt-3 flex flex-col gap-1">
        <a href={siteHref("/privacy")} className="min-h-11 py-2 text-body font-semibold text-green-700">
          {a.privacyLink}
        </a>
        <a href={siteHref("/terms")} className="min-h-11 py-2 text-body font-semibold text-green-700">
          {a.termsLink}
        </a>
      </div>
    </div>
  );
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <PillTabs
        tabs={[
          { key: "security", label: a.tabs.security },
          { key: "notifications", label: a.tabs.notifications },
          ...(business ? [{ key: "business" as const, label: a.tabs.business }] : []),
          { key: "privacy", label: a.tabs.privacy },
        ]}
        panels={{ security, notifications, business, privacy }}
      />
    </div>
  );
}

/** P16d / D11 saved places and receivers (owner, admin and booker; they hold phone numbers). */
export async function SenderPlaces({ viewer }: { viewer: Promise<Viewer> }) {
  const v = await viewer;
  if (!v.orgId) return null;
  const supabase = await supabaseServer();
  const [{ data: places }, { data: receivers }, { data: cities }, { data: perms }] = await Promise.all([
    supabase.from("saved_places").select("id, label, city_id, address_text, landmark, default_contact_name, default_contact_phone, use_count, city:cities(name)").eq("org_id", v.orgId).order("use_count", { ascending: false }),
    supabase.from("saved_receivers").select("id, name, phone, email, use_count").eq("org_id", v.orgId).order("use_count", { ascending: false }),
    supabase.from("cities").select("id, name").order("name"),
    supabase.rpc("org_permissions", { p_org: v.orgId }),
  ]);
  const list: Place[] = (places ?? []).map((p) => ({
    id: p.id,
    label: p.label,
    cityId: p.city_id,
    city: (p.city as unknown as { name: string } | null)?.name ?? "",
    address: p.address_text,
    landmark: p.landmark,
    contactName: p.default_contact_name,
    contactPhone: p.default_contact_phone,
    uses: p.use_count,
  }));
  const people: Receiver[] = (receivers ?? []).map((r) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, uses: r.use_count }));
  return <SavedPlaces org={v.orgId} places={list} receivers={people} cities={cities ?? []} canEdit={((perms ?? []) as string[]).includes("book")} />;
}

/** P15 / D07 Payments: money held, a draft to pay, the history with receipts. */
export async function SenderPayments({ viewer }: { viewer: Promise<Viewer> }) {
  const v = await viewer;
  if (!v.orgId) return null;
  const supabase = await supabaseServer();
  const [rows, { data: payments }, { data: refunds }] = await Promise.all([
    shipperLoads(v.orgId, 50),
    supabase.from("payments").select("id, load_id, amount_kobo, received_kobo, status, received_at, created_at").eq("shipper_org_id", v.orgId).order("created_at", { ascending: false }).limit(50),
    supabase.from("refunds").select("id, load_id, amount_kobo, status, created_at").eq("shipper_org_id", v.orgId).order("created_at", { ascending: false }).limit(50),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const route = (id: string) => {
    const r = byId.get(id);
    return r ? `${r.from} → ${r.to}` : "";
  };
  const done = (id: string) => {
    const t = byId.get(id)?.trip;
    return !!t && ["delivered", "delivered_with_exception", "closed"].includes(t.status);
  };
  const held = rows.filter((r) => ["funded", "matched"].includes(r.status) && !done(r.id));
  const heldKobo = held.reduce((s, r) => s + r.totalKobo, 0);
  const monthStart = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const received = (payments ?? []).filter((p) => p.status === "received" || p.status === "partially_refunded" || p.status === "refunded");
  const paidMonth = received.filter((p) => p.received_at && new Date(p.received_at) >= monthStart).reduce((s, p) => s + Number(p.received_kobo), 0);
  const refundKobo = (refunds ?? []).reduce((s, r) => s + Number(r.amount_kobo), 0);
  const draft = rows.find((r) => ["draft", "awaiting_payment", "expired"].includes(r.status));
  const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(iso));
  const history = [
    ...received.map((p) => ({
      id: p.id,
      at: p.received_at ?? p.created_at,
      icon: done(p.load_id) ? "done" : "held",
      title: fill(done(p.load_id) ? a.rowPaid : a.rowHeld, { route: route(p.load_id) }),
      sub: `${time(p.received_at ?? p.created_at)}${done(p.load_id) ? ` · ${a.delivered}` : ""}`,
      amount: Number(p.received_kobo),
      href: `/app/ship/receipts/${p.id}`,
    })),
    ...(refunds ?? []).map((r) => ({ id: r.id, at: r.created_at, icon: "refund", title: fill(a.rowRefund, { route: route(r.load_id) }), sub: time(r.created_at), amount: Number(r.amount_kobo), href: `/app/ship/trips/${r.load_id}` })),
  ].sort((x, y) => (x.at < y.at ? 1 : -1));
  return (
    <div className="mx-auto grid w-full max-w-[1080px] gap-4 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="flex flex-col gap-4">
        <section className="relative overflow-hidden rounded-card bg-green-900 p-5.5 text-white">
          <span aria-hidden className="absolute -top-16 -right-16 size-48 rounded-full bg-white/5" />
          <p className="flex items-center gap-2 text-body-sm text-green-300">
            <ShieldCheck aria-hidden className="size-4" strokeWidth={1.8} />
            {a.heldTitle}
          </p>
          <p className="tabular mt-2 text-[40px] leading-tight font-semibold tracking-[-0.04em]">{naira(heldKobo)}</p>
          <p className="text-meta text-white/75">{held.length === 1 ? a.heldTrip : fill(a.heldTrips, { n: held.length })}</p>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-tile bg-white/8 px-4 py-3">
              <p className="text-caption text-white/70">{a.paidMonth}</p>
              <p className="tabular text-body font-semibold">{naira(paidMonth)}</p>
            </div>
            <div className="rounded-tile bg-white/8 px-4 py-3">
              <p className="text-caption text-white/70">{a.refunds}</p>
              <p className="tabular text-body font-semibold">{naira(refundKobo)}</p>
            </div>
          </div>
        </section>
        {draft ? (
          <div className="flex items-center gap-3 rounded-card bg-warning-100 px-4.5 py-4">
            <div className="min-w-0 flex-1">
              <p className="tabular text-body font-semibold text-ink">{fill(a.draftToPay, { amount: naira(draft.totalKobo) })}</p>
              <p className="truncate text-meta text-ink-2">{fill(a.draftSub, { route: `${draft.from} → ${draft.to}` })}</p>
            </div>
            <Link href={`/app/pay/${draft.id}`} className={buttonVariants({ size: "sm" })}>
              {messages.home2.pay}
            </Link>
          </div>
        ) : null}
      </div>
      <section>
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 className="text-lead font-semibold text-ink">{a.history}</h2>
        </div>
        {history.length ? (
          <ul className="rounded-card border border-line bg-surface px-4.5">
            {history.map((h) => (
              <li key={h.id}>
                <Link href={h.href} className="flex items-center gap-3.5 border-t border-line-soft py-3.5 first:border-t-0">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-icon", h.icon === "held" ? "bg-green-50 text-green-700" : "bg-paper text-ink-2")}>
                    {h.icon === "held" ? <ShieldCheck aria-hidden className="size-5" strokeWidth={1.8} /> : <Check aria-hidden className="size-5" strokeWidth={1.8} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold text-ink">{h.title}</span>
                    <span className="block text-meta text-ink-3">{h.sub}</span>
                  </span>
                  <span className="tabular shrink-0 text-body font-semibold text-ink">{naira(h.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-card border border-line bg-surface px-6 py-10 text-center">
            <p className="text-title-3 text-ink">{a.noPayments}</p>
            <p className="mt-1 text-body-sm text-ink-2">{a.noPaymentsText}</p>
          </div>
        )}
      </section>
    </div>
  );
}

/** P25 / D13 Help: topics, popular questions, and how to reach us. */
export function SenderHelp() {
  const icons = [MapPin, FileText, MapPin, Key];
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {a.topics.map((t, i) => {
          const Icon = icons[i];
          return (
            <div key={t} className="flex min-h-24 flex-col justify-between gap-3 rounded-card border border-line bg-surface p-4">
              <span className="grid size-10 place-items-center rounded-icon bg-green-50 text-green-700">
                <Icon aria-hidden className="size-4.5" strokeWidth={1.8} />
              </span>
              <span className="text-body font-semibold text-ink">{t}</span>
            </div>
          );
        })}
      </div>
      <HelpQuestions />
      <section className="rounded-card bg-green-900 p-5 text-white">
        <p className="text-lead font-semibold">{a.talk}</p>
        <p className="text-meta text-white/75">{a.hours}</p>
        <div className="mt-4 flex gap-2.5">
          <a href="mailto:hello@freight-africa.com" className={buttonVariants({ variant: "inverse", size: "sm" })}>
            <Mail aria-hidden strokeWidth={1.8} />
            {a.emailUs}
          </a>
          {process.env.NEXT_PUBLIC_SUPPORT_PHONE ? (
            <a href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE}`} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "border-white/30 bg-transparent text-white hover:bg-white/10")}>
              <Phone aria-hidden strokeWidth={1.8} />
              {a.call}
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
