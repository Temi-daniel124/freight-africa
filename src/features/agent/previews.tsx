import { Banknote, Copy, House, Plus, QrCode, Share2, Truck, User, UserRound, Users } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { StatusChip, type StatusTone } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import { agentTotals } from "@/features/receipts/agent-pdf";
import { AGENT, SHARES } from "./sample";

// Agent screens (agent-mockups G01–G07) with the mockups' sample data, /dev only. The agent backend
// (attribution from the invite link, shares from the ledger, SMS and email reminders) is Phase 6, and
// settings.agents_enabled stays false in production until its acceptance (combined brief 5e).

const naira = (kobo: number) => `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;
const card = "rounded-card border border-line bg-surface";
const TABS = [
  { key: "home", label: "Home", icon: House },
  { key: "people", label: "People", icon: Users },
  { key: "invite", label: "Invite", icon: Plus },
  { key: "earnings", label: "Earnings", icon: Banknote },
  { key: "me", label: "Me", icon: User },
];

function Phone({ tab, title, children }: { tab: string; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-paper">
      <header className="flex items-center gap-3 px-5 pt-5 pb-3">
        {tab === "home" ? <Avatar name={AGENT.name} size={40} className="bg-green-900 text-white" /> : null}
        <h1 className="text-title-1 text-ink">{title}</h1>
      </header>
      <main className="flex flex-1 flex-col gap-4 px-5 pb-32">{children}</main>
      <nav aria-label="Agent" className="fixed inset-x-0 bottom-3 mx-auto flex h-17 w-[calc(100%-32px)] max-w-[398px] items-center justify-around rounded-pill border border-line bg-surface shadow-floating">
        {TABS.map((t) =>
          t.key === "invite" ? (
            <Link key={t.key} href="/dev/agent?screen=invite" className="-mt-8 flex flex-col items-center gap-1 text-caption font-semibold text-ink-2">
              <span className="grid size-14 place-items-center rounded-full bg-green-900 text-white shadow-raised">
                <Plus aria-hidden className="size-6" strokeWidth={2} />
              </span>
              {t.label}
            </Link>
          ) : (
            <Link key={t.key} href={`/dev/agent?screen=${t.key}`} aria-current={tab === t.key ? "page" : undefined} className={cn("flex flex-col items-center gap-1 text-caption font-semibold", tab === t.key ? "text-green-800" : "text-ink-2")}>
              <t.icon aria-hidden className="size-5.5" strokeWidth={1.8} />
              {t.label}
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}

function Totals() {
  const t = agentTotals(SHARES);
  const cells: [string, string][] = [
    ["This month", naira(t.totalKobo + 3_940_000)],
    ["Waiting", naira(t.waitingKobo)],
    ["All time", "₦318,400"],
  ];
  return (
    <div className={cn(card, "grid grid-cols-3 divide-x divide-line-soft py-4")}>
      {cells.map(([k, v]) => (
        <div key={k} className="text-center">
          <p className="text-meta text-ink-3">{k}</p>
          <p className="tabular mt-1 text-title-3 text-ink">{v}</p>
        </div>
      ))}
    </div>
  );
}

const NUDGE = [
  ["Danjuma Trucks", "Stopped at bank account · 3 days ago"],
  ["Dawanau Traders", "Signed up · no booking yet · 5 days"],
  ["Kano Line Ltd", "Truck licence photo needs redoing"],
];

function Home() {
  return (
    <Phone tab="home" title="Home">
      <Totals />
      <section className="rounded-card bg-green-900 p-4.5 text-white">
        <p className="text-micro font-semibold tracking-[0.06em] text-green-200 uppercase">Your invite link</p>
        <p className="mt-1 text-title-3">freight-africa.com/i/{AGENT.code}</p>
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {[
            [Share2, "Share"],
            [Copy, "Copy link"],
            [QrCode, "QR code"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Share2;
            return (
              <span key={label as string} className="flex h-16 flex-col items-center justify-center gap-1.5 rounded-callout bg-white/10 text-meta font-semibold">
                <I aria-hidden className="size-4.5" strokeWidth={1.8} />
                {label as string}
              </span>
            );
          })}
        </div>
      </section>
      <h2 className="text-title-3 text-ink">Needs a nudge · 3</h2>
      <ul className={cn(card, "px-4")}>
        {NUDGE.map(([name, why]) => (
          <li key={name} className="flex items-center gap-3 border-b border-line-soft py-3.5 last:border-b-0">
            <Avatar name={name} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold text-ink">{name}</span>
              <span className="block text-meta text-warning">{why}</span>
            </span>
            <span className="rounded-pill border border-line px-4 py-2 text-body-sm font-semibold text-ink">Remind</span>
          </li>
        ))}
      </ul>
    </Phone>
  );
}

async function Invite() {
  const svg = await QRCode.toString(`https://freight-africa.com/i/${AGENT.code}`, { type: "svg", margin: 0, color: { dark: "#0A3D2A", light: "#FFFFFF" } });
  return (
    <Phone tab="invite" title="Invite someone">
      <div role="radiogroup" aria-label="Who are you inviting?" className="grid grid-cols-2 gap-1 rounded-pill bg-[#E9EBE5] p-1">
        <span role="radio" aria-checked className="flex h-11 items-center justify-center gap-2 rounded-pill bg-surface text-body font-semibold text-ink shadow-raised">
          <Truck aria-hidden className="size-4.5" strokeWidth={1.8} />A truck owner
        </span>
        <span role="radio" aria-checked={false} className="flex h-11 items-center justify-center gap-2 text-body font-semibold text-ink-2">
          <UserRound aria-hidden className="size-4.5" strokeWidth={1.8} />A sender
        </span>
      </div>
      <section className={cn(card, "p-4.5")}>
        <p className="text-body text-ink-2">&ldquo;Hello, I&apos;m using Freight Africa to find loads for trucks. Loads are paid before you move, you get an advance when loaded and the rest after delivery. Join here: freight-africa.com/i/{AGENT.code} (Hauwa)&rdquo;</p>
        <p className="mt-3 rounded-button bg-green-900 py-3.5 text-center text-body font-semibold text-white">Share on WhatsApp</p>
      </section>
      <section className={cn(card, "flex flex-col items-center gap-3 p-5")}>
        <div className="size-44 [&_svg]:size-full" role="img" aria-label="QR code for the invite link" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="text-meta text-ink-3">They scan it with their phone camera</p>
      </section>
      <section className={cn(card, "p-4.5")}>
        <h2 className="text-body font-semibold text-ink">Invite by phone number</h2>
        <p className="mt-1 text-meta text-ink-3">Freight Africa sends it by SMS, with your name.</p>
      </section>
    </Phone>
  );
}

const PEOPLE: [string, string, string, StatusTone, string][] = [
  ["Musa Haulage Ltd", "Joined 3 Sep · 31 trips", "Active", "success", "₦142,600"],
  ["Garba & Sons", "Joined 18 Sep · 9 trips", "Active", "success", "₦48,200"],
  ["Danjuma Trucks", "Joined 22 Nov · Stopped 3 days ago", "Bank account", "warning", "—"],
  ["Kano Line Ltd", "Joined 10 Oct · Licence photo rejected", "Truck photo", "warning", "₦36,900"],
  ["Ilorin Haulage", "Joined 23 Nov · Already on Freight Africa", "Not counted", "neutral", "—"],
  ["Abdul Bako", "Invited 24 Nov · Not opened yet", "Invited", "info", "—"],
];

function People() {
  return (
    <Phone tab="people" title="People">
      <div className="grid grid-cols-2 gap-1 rounded-pill bg-[#E9EBE5] p-1">
        <span className="flex h-11 items-center justify-center rounded-pill bg-surface text-body font-semibold text-ink shadow-raised">Owners · 9</span>
        <span className="flex h-11 items-center justify-center text-body font-semibold text-ink-2">Senders · 5</span>
      </div>
      <ul className={cn(card, "px-4")}>
        {PEOPLE.map(([name, line, status, tone, earned]) => (
          <li key={name} className="flex items-center gap-3 border-b border-line-soft py-3.5 last:border-b-0">
            <Avatar name={name} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold text-ink">{name}</span>
              <span className={cn("block text-meta", tone === "warning" ? "text-warning" : "text-ink-3")}>{line}</span>
            </span>
            <span className="flex flex-col items-end gap-1.5">
              <StatusChip tone={tone}>{status}</StatusChip>
              <span className="tabular text-body-sm font-semibold text-ink">{earned}</span>
            </span>
          </li>
        ))}
      </ul>
    </Phone>
  );
}

function Person() {
  const steps: [string, string, StatusTone][] = [
    ["Signed up", "Done", "success"],
    ["ID checked", "Done", "success"],
    ["Bank account", "In progress", "warning"],
    ["First truck approved", "Not yet", "neutral"],
    ["First trip", "Not yet", "neutral"],
  ];
  return (
    <Phone tab="people" title="Danjuma Trucks">
      <p className="-mt-2 text-body text-ink-2">Truck owner · joined 22 Nov · referral ends 22 May 2027</p>
      <section className={cn(card, "px-4")}>
        <h2 className="pt-4 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">Getting started</h2>
        <ul>
          {steps.map(([s, v, tone]) => (
            <li key={s} className="flex items-center justify-between border-b border-line-soft py-3 last:border-b-0">
              <span className="text-body text-ink">{s}</span>
              <StatusChip tone={tone}>{v}</StatusChip>
            </li>
          ))}
        </ul>
      </section>
      <p className="rounded-button bg-green-900 py-3.5 text-center text-body font-semibold text-white">Send a reminder</p>
      <p className="text-center text-meta text-ink-3">Freight Africa sends it by SMS, with your name. 1 a day, 3 per step.</p>
    </Phone>
  );
}

const STATE: Record<string, [string, StatusTone]> = { paid: ["Paid", "success"], waiting: ["Waiting for trip to finish", "info"], void: ["Void", "neutral"] };

function Earnings() {
  return (
    <Phone tab="earnings" title="Earnings">
      <Totals />
      <ul className={cn(card, "px-4")}>
        {[...SHARES].reverse().map((s) => (
          <li key={`${s.ref}-${s.person}`} className="flex items-center gap-3 border-b border-line-soft py-3.5 last:border-b-0">
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold text-ink">{s.person}</span>
              <span className="block text-meta text-ink-3">
                {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(s.date))} · {s.route}
              </span>
            </span>
            <span className="flex flex-col items-end gap-1.5">
              <span className="tabular text-body font-semibold text-ink">{s.state === "void" ? "₦0" : naira(s.shareKobo)}</span>
              <StatusChip tone={STATE[s.state][1]}>{STATE[s.state][0]}</StatusChip>
            </span>
          </li>
        ))}
      </ul>
      <Link href="/dev/agent?screen=statement" className="text-center text-body font-semibold text-green-800">
        November statement (PDF)
      </Link>
    </Phone>
  );
}

function Me() {
  const rows: [string, string][] = [
    ["My work", "Kano · Lagos ⇄ Kano"],
    ["Identity", "Being checked"],
    ["Bank account", "Jaiz ···· 7192"],
    ["My invite code", AGENT.code],
    ["Agent agreement", "v1.0 · 22 Nov"],
  ];
  return (
    <Phone tab="me" title="Me">
      <div className="flex items-center gap-3.5">
        <Avatar name={AGENT.name} size={56} className="bg-green-900 text-white" />
        <div>
          <p className="text-title-2 text-ink">{AGENT.name}</p>
          <p className="text-body text-ink-3">Agent · Kano · +234 803 118 4420</p>
        </div>
      </div>
      <ul className={cn(card, "px-4")}>
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between border-b border-line-soft py-3.5 last:border-b-0">
            <span className="text-body text-ink">{k}</span>
            <span className="text-body-sm text-ink-2">{v}</span>
          </li>
        ))}
      </ul>
      <p className="text-center text-body font-semibold text-danger">Stop being an agent</p>
    </Phone>
  );
}

export const AGENT_SCREENS: Record<string, () => ReactNode | Promise<ReactNode>> = {
  home: Home,
  invite: Invite,
  people: People,
  person: Person,
  earnings: Earnings,
  me: Me,
};
