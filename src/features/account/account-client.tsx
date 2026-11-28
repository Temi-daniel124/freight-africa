"use client";

import { ChevronDown, MapPin, Plus, Search, Trash2, User } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { deleteSaved, savePlace, saveReceiver, setNotification, updateBusiness } from "./actions";

const a = messages.account;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const field = "h-13 w-full min-w-0 rounded-input border border-line-field bg-surface px-4 text-body text-ink outline-none placeholder:text-ink-3 focus:border-green-700 focus:shadow-focus disabled:bg-paper disabled:text-ink-2";
const label = "flex flex-col gap-1.5 text-body-sm font-semibold text-ink";

/** Pill tabs driven by ?tab= (D12 Settings, P16d Places / Receivers). */
export function PillTabs<T extends string>({ tabs, panels, className }: { tabs: { key: T; label: string }[]; panels: Record<T, ReactNode>; className?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const asked = params.get("tab") as T | null;
  const tab = tabs.find((t) => t.key === asked)?.key ?? tabs[0].key;
  return (
    <div>
      <div role="tablist" className={cn("-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0", className)}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => router.replace(`${path}?tab=${t.key}`, { scroll: false })}
            className={cn("h-11 shrink-0 rounded-pill border px-4 text-body-sm font-semibold whitespace-nowrap", tab === t.key ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-4">
        {panels[tab]}
      </div>
    </div>
  );
}

// ---- P16d / D11 saved places and receivers --------------------------------------------------------

export type Place = { id: string; label: string; cityId: string; city: string; address: string; landmark: string | null; contactName: string | null; contactPhone: string | null; uses: number };
export type Receiver = { id: string; name: string; phone: string; email: string | null; uses: number };

const uses = (n: number) => (n === 1 ? a.usedOnce : fill(a.usedN, { n }));

function PlaceSheet({ open, onOpenChange, org, cities, place }: { open: boolean; onOpenChange: (o: boolean) => void; org: string; cities: { id: string; name: string }[]; place: Place | null }) {
  const router = useRouter();
  const [v, setV] = useState({ label: place?.label ?? "", city: place?.cityId ?? cities[0]?.id ?? "", address: place?.address ?? "", landmark: place?.landmark ?? "", contactName: place?.contactName ?? "", contactPhone: place?.contactPhone?.replace(/^\+234/, "0") ?? "" });
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await savePlace({ org, id: place?.id, ...v });
      if (r.status !== "ok") return void toast.error(r.status === "invalid" ? a.placeInvalid : messages.checkout.error);
      onOpenChange(false);
      router.refresh();
    });
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={place ? place.label : a.addPlace} actions={<Button className="w-full" loading={pending} onClick={save}>{a.save}</Button>}>
      <div className="flex flex-col gap-3.5">
        <label className={label}>
          {a.placeLabel}
          <input className={field} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} maxLength={60} />
        </label>
        <label className={label}>
          {a.city}
          <select className={field} value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })}>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {a.address}
          <input className={field} value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} maxLength={200} />
        </label>
        <label className={label}>
          {a.landmark}
          <input className={field} value={v.landmark} onChange={(e) => setV({ ...v, landmark: e.target.value })} maxLength={120} />
        </label>
        <label className={label}>
          {a.contactName}
          <input className={field} value={v.contactName} onChange={(e) => setV({ ...v, contactName: e.target.value })} maxLength={80} />
        </label>
        <label className={label}>
          {a.contactPhone}
          <input className={field} inputMode="tel" value={v.contactPhone} onChange={(e) => setV({ ...v, contactPhone: e.target.value })} />
        </label>
      </div>
    </Sheet>
  );
}

function ReceiverSheet({ open, onOpenChange, org, receiver }: { open: boolean; onOpenChange: (o: boolean) => void; org: string; receiver: Receiver | null }) {
  const router = useRouter();
  const [v, setV] = useState({ name: receiver?.name ?? "", phone: receiver?.phone.replace(/^\+234/, "0") ?? "", email: receiver?.email ?? "" });
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await saveReceiver({ org, id: receiver?.id, ...v });
      if (r.status !== "ok") return void toast.error(r.status === "invalid" ? a.receiverInvalid : messages.checkout.error);
      onOpenChange(false);
      router.refresh();
    });
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={receiver ? receiver.name : a.addReceiver} actions={<Button className="w-full" loading={pending} onClick={save}>{a.save}</Button>}>
      <div className="flex flex-col gap-3.5">
        <label className={label}>
          {a.receiverName}
          <input className={field} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={80} />
        </label>
        <label className={label}>
          {a.receiverPhone}
          <input className={field} inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </label>
        <label className={label}>
          {a.receiverEmail}
          <input className={field} inputMode="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </label>
      </div>
    </Sheet>
  );
}

function SavedRow({ icon, title, sub, onOpen, onDelete }: { icon: ReactNode; title: string; sub: string; onOpen: () => void; onDelete?: () => void }) {
  return (
    <li className="flex items-center gap-3.5 border-t border-line-soft py-3.5 first:border-t-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-green-50 text-green-700">{icon}</span>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-body font-semibold text-ink">{title}</span>
        <span className="block truncate text-meta text-ink-3">{sub}</span>
      </button>
      {onDelete ? (
        <button type="button" aria-label={a.delete} onClick={onDelete} className="grid size-11 place-items-center rounded-full text-ink-3 hover:bg-paper">
          <Trash2 aria-hidden className="size-4.5" strokeWidth={1.8} />
        </button>
      ) : null}
    </li>
  );
}

export function SavedPlaces({ org, places, receivers, cities, canEdit }: { org: string; places: Place[]; receivers: Receiver[]; cities: { id: string; name: string }[]; canEdit: boolean }) {
  const router = useRouter();
  const [place, setPlace] = useState<Place | null | "new">(null);
  const [receiver, setReceiver] = useState<Receiver | null | "new">(null);
  const remove = (kind: "place" | "receiver", id: string) =>
    void deleteSaved(kind, id).then((r) => (r.status === "ok" ? router.refresh() : toast.error(messages.checkout.error)));
  const placesPanel = (
    <>
      {places.length ? (
        <ul className="rounded-card border border-line bg-surface px-4.5">
          {places.map((p) => (
            <SavedRow
              key={p.id}
              icon={<MapPin aria-hidden className="size-4.5" strokeWidth={1.8} />}
              title={p.label}
              sub={[`${p.address}`, p.landmark, p.uses ? (p.uses === 1 ? a.usedOnce : fill(a.usedTimes, { n: p.uses })) : null].filter(Boolean).join(" · ")}
              onOpen={() => canEdit && setPlace(p)}
              onDelete={canEdit ? () => remove("place", p.id) : undefined}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-card border border-line bg-surface px-6 py-10 text-center">
          <p className="text-title-3 text-ink">{a.noPlaces}</p>
          <p className="mt-1 text-body-sm text-ink-2">{a.noPlacesText}</p>
        </div>
      )}
      {canEdit ? (
        <Button variant="secondary" className="mt-3 w-full border-dashed" onClick={() => setPlace("new")}>
          <Plus aria-hidden strokeWidth={1.8} />
          {a.addPlace}
        </Button>
      ) : null}
    </>
  );
  const receiversPanel = (
    <>
      {receivers.length ? (
        <ul className="rounded-card border border-line bg-surface px-4.5">
          {receivers.map((r) => (
            <SavedRow
              key={r.id}
              icon={<User aria-hidden className="size-4.5" strokeWidth={1.8} />}
              title={r.name}
              sub={[r.phone.replace(/^\+234(\d{3})(\d{3})(\d{4})$/, "+234 $1 $2 $3"), r.uses ? uses(r.uses) : null].filter(Boolean).join(" · ")}
              onOpen={() => canEdit && setReceiver(r)}
              onDelete={canEdit ? () => remove("receiver", r.id) : undefined}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-card border border-line bg-surface px-6 py-10 text-center">
          <p className="text-title-3 text-ink">{a.noReceivers}</p>
          <p className="mt-1 text-body-sm text-ink-2">{a.noReceiversText}</p>
        </div>
      )}
      {canEdit ? (
        <Button variant="secondary" className="mt-3 w-full border-dashed" onClick={() => setReceiver("new")}>
          <Plus aria-hidden strokeWidth={1.8} />
          {a.addReceiver}
        </Button>
      ) : null}
    </>
  );
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <PillTabs
        tabs={[
          { key: "places", label: fill(a.placesTab, { n: places.length }) },
          { key: "receivers", label: fill(a.receiversTab, { n: receivers.length }) },
        ]}
        panels={{ places: placesPanel, receivers: receiversPanel }}
      />
      {place ? <PlaceSheet key={place === "new" ? "new" : place.id} open onOpenChange={(o) => !o && setPlace(null)} org={org} cities={cities} place={place === "new" ? null : place} /> : null}
      {receiver ? <ReceiverSheet key={receiver === "new" ? "new" : receiver.id} open onOpenChange={(o) => !o && setReceiver(null)} org={org} receiver={receiver === "new" ? null : receiver} /> : null}
    </div>
  );
}

// ---- P16f notifications ---------------------------------------------------------------------------

export function NotificationTable({ prefs }: { prefs: Record<string, boolean> }) {
  const [state, setState] = useState(prefs);
  const toggle = (event: string, channel: "email" | "push", on: boolean) => {
    const key = `${event}:${channel}`;
    setState((s) => ({ ...s, [key]: on }));
    void setNotification(event, channel, on).then((r) => {
      if (r.status !== "ok") {
        setState((s) => ({ ...s, [key]: !on }));
        toast.error(messages.checkout.error);
      }
    });
  };
  return (
    <div className="rounded-card border border-line bg-surface">
      <div className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center border-b border-line-soft px-4.5 py-3 text-caption font-semibold tracking-caps text-ink-3 uppercase">
        <span />
        <span className="text-center">{a.email}</span>
        <span className="text-center">{a.push}</span>
      </div>
      {a.notifRows.map((row) => (
        <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center border-t border-line-soft px-4.5 py-3.5 first-of-type:border-t-0">
          <span className="min-w-0">
            <span className="block text-body font-semibold text-ink">{row.label}</span>
            {row.note ? <span className="block text-meta text-ink-3">{row.note}</span> : null}
          </span>
          {(["email", "push"] as const).map((ch) => (
            <span key={ch} className="flex justify-center">
              <Switch
                id={`n-${row.key}-${ch}`}
                label={`${row.label} · ${ch === "email" ? a.email : a.push}`}
                checked={row.locked ? true : (state[`${row.key}:${ch}`] ?? true)}
                disabled={row.locked}
                onChange={(on: boolean) => toggle(row.key, ch, on)}
                className="[&_label]:sr-only"
              />
            </span>
          ))}
        </div>
      ))}
      <p className="border-t border-line-soft px-4.5 py-3.5 text-meta text-ink-3">{a.whatsappLater}</p>
    </div>
  );
}

// ---- P16g business profile -------------------------------------------------------------------------

export function BusinessForm({ org, initial, canEdit, initials }: { org: string; initial: { name: string; cac: string; address: string; email: string }; canEdit: boolean; initials: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await updateBusiness({ org, ...v });
      if (r.status !== "ok") return void toast.error(r.status === "invalid" ? a.businessInvalid : messages.checkout.error);
      toast(a.saved);
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 lg:p-6">
      <div className="flex items-center gap-4">
        <span className="grid size-16 place-items-center rounded-tile bg-green-900 text-title-3 font-semibold text-white">{initials}</span>
      </div>
      <label className={label}>
        {a.businessName}
        <input className={field} disabled={!canEdit} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={120} />
      </label>
      <label className={label}>
        {a.cac}
        <input className={field} disabled={!canEdit} value={v.cac} onChange={(e) => setV({ ...v, cac: e.target.value })} maxLength={16} />
      </label>
      <label className={label}>
        {a.receiptAddress}
        <input className={field} disabled={!canEdit} value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} maxLength={200} />
      </label>
      <label className={label}>
        {a.receiptEmail}
        <input className={field} disabled={!canEdit} inputMode="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} maxLength={254} />
      </label>
      {canEdit ? (
        <Button className="w-full lg:w-auto lg:self-start lg:px-10" loading={pending} onClick={save}>
          {a.save}
        </Button>
      ) : (
        <p className="text-meta text-ink-3">{a.onlyOwners}</p>
      )}
    </div>
  );
}

// ---- P25 / D13 help -------------------------------------------------------------------------------

export function HelpQuestions() {
  const [q, setQ] = useState("");
  const list = a.faq.filter((f) => !q.trim() || `${f.q} ${f.a}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <label className="relative block">
        <span className="sr-only">{a.helpSearch}</span>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={a.helpSearch} className="h-14 w-full rounded-tile border border-line bg-surface pr-4 pl-11 text-body text-ink outline-none placeholder:text-ink-3 focus:border-green-700" />
      </label>
      <section>
        <h2 className="mb-2.5 px-1 text-caption font-semibold tracking-caps text-ink-3 uppercase">{a.popular}</h2>
        <ul className="rounded-card border border-line bg-surface px-4.5">
          {list.map((f) => (
            <li key={f.q} className="border-t border-line-soft first:border-t-0">
              <details className="group">
                <summary className="flex min-h-15 cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-body text-ink">
                  {f.q}
                  <ChevronDown aria-hidden className="size-5 shrink-0 text-ink-2 transition-transform group-open:rotate-180" strokeWidth={1.8} />
                </summary>
                <p className="pb-4 text-body-sm text-ink-2">{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** D12 "Change avatar": the face, and the picker only when asked for. */
export function AvatarChange({ avatar, children }: { avatar: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="mt-3 flex items-center gap-4">
        {avatar}
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="min-h-11 text-body-sm font-semibold text-green-700">
          {a.changeAvatar}
        </button>
      </div>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
