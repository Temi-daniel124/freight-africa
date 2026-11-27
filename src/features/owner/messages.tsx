import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { MessageTabs, ReplyBox } from "./messages-client";

// O19d / O19e / OD11b Messages from drivers (D051). Drivers never see the owner's number; replies reach
// the driver's Notifications. Not live chat; SOS never comes here.

const m = messages.driverMessages;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const SELECT = "id, reason, body, voice_path, voice_seconds, read_at, reply, replied_at, created_at, driver_id, driver:profiles!driver_messages_driver_id_fkey(full_name), truck:trucks(plate_number)";

type Row = {
  id: string;
  reason: keyof typeof m.reasons;
  body: string | null;
  voice_path: string | null;
  voice_seconds: number | null;
  read_at: string | null;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
  driver_id: string;
  driver: { full_name: string | null } | null;
  truck: { plate_number: string } | null;
};

const spaced = (p?: string | null) => (p ?? "").replace(/^([A-Z]{3})(\d{3})([A-Z]{2})$/, "$1 $2 $3");
const clock = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" }) === new Date().toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" });
  return sameDay
    ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(d)
    : new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Africa/Lagos" }).format(d);
};
const secs = (n: number | null) => (n ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}` : "");

function Item({ r }: { r: Row }) {
  const name = r.driver?.full_name ?? "";
  return (
    <li>
      <Link href={`/app/haul/messages/${r.id}`} className="flex items-start gap-3.5 border-t border-line-soft py-4 first:border-t-0">
        <Avatar name={name} size={44} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-body font-semibold text-ink">{name}</span>
            <span className="flex shrink-0 items-center gap-2 text-meta text-ink-3">
              {clock(r.created_at)}
              {r.read_at ? null : <span aria-label={m.newNone} className="size-2 rounded-full bg-green-700" />}
            </span>
          </span>
          <span className="block truncate text-caption text-ink-3">
            {[spaced(r.truck?.plate_number), m.reasons[r.reason]].filter(Boolean).join(" · ")}
          </span>
          <span className="mt-0.5 block truncate text-body-sm text-ink">{r.body ?? (r.voice_path ? fill(m.voice, { d: secs(r.voice_seconds) }) : "")}</span>
        </span>
      </Link>
    </li>
  );
}

export async function DriverMessagesList({ orgId }: { orgId: string }) {
  const { data } = await (await supabaseServer()).from("driver_messages").select(SELECT).eq("org_id", orgId).order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as unknown as Row[];
  const list = (items: Row[]) =>
    items.length ? (
      <ul className="rounded-card border border-line bg-surface px-4.5">{items.map((r) => <Item key={r.id} r={r} />)}</ul>
    ) : (
      <div className="rounded-card border border-line bg-surface px-6 py-10 text-center">
        <p className="text-title-3 text-ink">{m.empty}</p>
        <p className="mt-1 text-body-sm text-ink-2">{m.emptyText}</p>
      </div>
    );
  const unread = rows.filter((r) => !r.read_at);
  return (
    <div className="mx-auto w-full max-w-[640px]">
      <p className="mb-4 text-body text-ink-2">{m.lead}</p>
      <MessageTabs newLabel={unread.length ? fill(m.new, { n: unread.length }) : m.newNone} allLabel={m.all} newPanel={list(unread)} allPanel={list(rows)} />
      <p className="mt-3 px-1 text-caption text-ink-3">{m.sos}</p>
    </div>
  );
}

export async function DriverMessage({ id }: { id: string }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("driver_messages").select(SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data as unknown as Row;
  const voice = r.voice_path ? (await supabase.storage.from("driver-voice").createSignedUrl(r.voice_path, 600)).data?.signedUrl : null;
  const name = r.driver?.full_name ?? "";
  const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(r.created_at));
  return (
    <div data-full-screen className="min-h-dvh bg-paper pb-36 lg:mx-auto lg:max-w-[640px] lg:px-0 lg:py-8">
      <header className="flex items-center justify-between px-4 pt-3.5 lg:px-0 lg:pt-0">
        <Link href="/app/haul/messages" aria-label={messages.checkout.back} className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink">
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.8} />
        </Link>
        <Link href="/app/haul/drivers" className="inline-flex h-11 items-center rounded-pill border border-line bg-surface px-4 text-body-sm font-semibold text-ink">
          {m.driverDetails}
        </Link>
      </header>
      <div className="flex flex-col gap-3.5 px-5 pt-4 lg:px-0">
        <div className="flex items-center gap-3.5">
          <Avatar name={name} size={52} />
          <div className="min-w-0">
            <p className="text-title-3 text-ink">{name}</p>
            <p className="truncate text-meta text-ink-3">{spaced(r.truck?.plate_number)}</p>
          </div>
        </div>
        <section className="rounded-card border border-line bg-surface p-4.5">
          <div className="flex items-center justify-between gap-3">
            <span className={cn("rounded-pill px-2.5 py-1 text-caption font-semibold", r.reason === "repair" ? "bg-warning-100 text-warning" : "bg-paper text-ink-2")}>{m.reasons[r.reason]}</span>
            <span className="text-meta text-ink-3">{when}</span>
          </div>
          {r.body ? <p className="mt-3 text-body text-ink">{r.body}</p> : null}
          {voice ? <audio controls src={voice} className="mt-3 w-full" aria-label={m.voiceShort} /> : null}
        </section>
        <ReplyBox id={r.id} name={name.split(" ")[0] ?? name} existing={r.reply} unread={!r.read_at} />
      </div>
    </div>
  );
}
