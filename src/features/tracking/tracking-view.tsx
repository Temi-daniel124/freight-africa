"use client";

import { ArrowLeft, Check, Copy, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import {
  TruckGraphic,
  type TruckLoad,
  truckKind,
} from "@/components/art/truck";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, useWideScreen } from "@/components/ui/sheet";
import { ProgressDots } from "@/features/booking/pieces";
import { avatarSrc } from "@/features/settings/avatars";
import { formatNaira } from "@/lib/money";
import messages from "@/messages/en.json";
import { TripMap } from "./trip-map";

const t = messages.track;

export type TrackData = {
  ref: string;
  statusLabel: string;
  step: number;
  goods: string;
  amount: string;
  load: TruckLoad;
  from: { name: string; lat: number; lng: number; date: string };
  to: { name: string; lat: number; lng: number; date: string };
  truck: { lat: number; lng: number } | null;
  lastSeen: string | null;
  plate: string;
  truckType: string;
  truckTypeCode: string;
  driver: {
    firstName: string;
    avatar: string | null;
    phone: string | null;
  } | null;
  heldKobo: number | null;
};

function Details({ d }: { d: TrackData }) {
  return (
    <div className="flex flex-col gap-5 text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption text-white/60">{messages.trips.details}</p>
          <p className="tabular text-title-2 font-extrabold whitespace-nowrap">
            {d.ref}
          </p>
        </div>
        <span className="shrink-0 rounded-pill bg-white/15 px-3 py-1 text-caption font-semibold">
          {d.statusLabel}
        </span>
      </div>
      <ProgressDots step={d.step} inverse />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-sm">
        <div className="min-w-0">
          <dt className="text-caption text-white/60">
            {messages.booking.from}
          </dt>
          <dd className="truncate font-semibold whitespace-nowrap">
            {d.from.name}
          </dd>
          <dd className="text-caption text-white/60">{d.from.date}</dd>
        </div>
        <div className="min-w-0 text-right">
          <dt className="text-caption text-white/60">{messages.booking.to}</dt>
          <dd className="truncate font-semibold whitespace-nowrap">
            {d.to.name}
          </dd>
          <dd className="text-caption text-white/60">{d.to.date}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-caption text-white/60">{messages.trips.goods}</dt>
          <dd className="truncate font-semibold">{d.goods}</dd>
          <dd className="truncate text-caption text-white/60">{d.amount}</dd>
        </div>
        <div className="min-w-0 text-right">
          <dt className="text-caption text-white/60">{messages.trips.truck}</dt>
          <dd className="tabular truncate font-semibold whitespace-nowrap">
            {d.plate}
          </dd>
          <dd className="truncate text-caption text-white/60">{d.truckType}</dd>
        </div>
      </dl>
      <div className="rounded-inner bg-white p-3">
        <TruckGraphic kind={truckKind(d.truckTypeCode)} load={d.load} />
      </div>
      {d.heldKobo ? (
        <p className="text-body font-bold text-green-300">
          {t.held.replace("{amount}", formatNaira(d.heldKobo / 100))}
        </p>
      ) : null}
      {d.lastSeen ? (
        <p className="text-caption text-white/60">
          {t.lastSeen.replace("{time}", d.lastSeen)}
        </p>
      ) : null}
    </div>
  );
}

function DriverCard({ d }: { d: TrackData }) {
  const wide = useWideScreen();
  const [copied, setCopied] = useState(false);
  if (!d.driver) return null;
  const phone = d.driver.phone;
  const shown = phone
    ? `0${phone.replace(/^\+234/, "").replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}`
    : null;
  return (
    <div className="flex items-center gap-3 rounded-tile bg-white p-3 text-ink">
      <Avatar
        name={d.driver.firstName}
        src={avatarSrc(d.driver.avatar)}
        size={44}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-bold">{d.driver.firstName}</p>
        <p className="tabular truncate text-caption text-ink-3">{d.plate}</p>
      </div>
      <Sheet
        kind="confirm"
        title={t.callTitle.replace("{name}", d.driver.firstName)}
        description={shown ? undefined : t.callClosed}
        trigger={
          <button
            type="button"
            aria-label={t.call}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-green-700 text-white active:scale-press"
          >
            <Phone aria-hidden className="size-5" strokeWidth={2} />
          </button>
        }
        actions={
          shown && phone ? (
            <>
              <a
                href={`tel:${phone}`}
                className="inline-flex h-12 w-full items-center justify-center rounded-button bg-green-700 px-5 font-bold text-white sm:w-auto"
              >
                {t.callAction.replace("{phone}", shown)}
              </a>
              <Button
                variant="secondary"
                size="md"
                className={wide ? "" : "w-full"}
                onClick={() =>
                  void navigator.clipboard
                    ?.writeText(phone)
                    .then(() => setCopied(true))
                }
              >
                {copied ? (
                  <Check aria-hidden strokeWidth={2} />
                ) : (
                  <Copy aria-hidden strokeWidth={1.75} />
                )}
                {t.copy}
              </Button>
            </>
          ) : null
        }
      >
        {shown ? (
          <p className="tabular text-title-3 font-extrabold text-ink">
            {shown}
          </p>
        ) : null}
      </Sheet>
    </div>
  );
}

/**
 * Trip tracking (reference 04, D045): a full-screen map; a deep green sheet with three snap points (peek:
 * reference, status, progress; half: from/to, goods, truck; full: the money held, senders only); the
 * driver card with one Call button (D018). Desktop: the map fills the content and the details sit in a
 * fixed 400 px panel on the right.
 */
export function TrackingView({ data }: { data: TrackData }) {
  const router = useRouter();
  const wide = useWideScreen();
  const [snap, setSnap] = useState<number | string | null>(0.3);
  const route = useMemo(() => [data.from, data.to], [data.from, data.to]);
  const trucks = useMemo(
    () => (data.truck ? [{ ...data.truck, label: data.plate }] : []),
    [data.truck, data.plate],
  );
  const back = (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label={t.back}
      className="absolute top-[max(env(safe-area-inset-top),16px)] left-4 z-10 grid size-11 place-items-center rounded-full bg-surface text-ink shadow-raised"
    >
      <ArrowLeft aria-hidden className="size-5" strokeWidth={2} />
    </button>
  );
  if (wide) {
    return (
      <div className="relative grid h-[calc(100dvh-64px)] grid-cols-[minmax(0,1fr)_400px]">
        <div className="relative">
          {back}
          <TripMap
            route={route}
            trucks={trucks}
            destination={data.to}
            className="absolute inset-0"
          />
        </div>
        <aside className="flex flex-col gap-4 overflow-y-auto bg-green-900 p-6">
          <Details d={data} />
          <DriverCard d={data} />
        </aside>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-30 bg-paper">
      {back}
      <TripMap
        route={route}
        trucks={trucks}
        destination={data.to}
        className="absolute inset-0"
        padding={{ bottom: 220 }}
      />
      <Drawer.Root
        open
        modal={false}
        dismissible={false}
        snapPoints={[0.3, 0.6, 0.94]}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
      >
        <Drawer.Portal>
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-40 flex h-full max-h-[94dvh] flex-col rounded-t-sheet bg-green-900 outline-none">
            <Drawer.Title className="sr-only">{data.ref}</Drawer.Title>
            <Drawer.Description className="sr-only">
              {data.statusLabel}
            </Drawer.Description>
            <div
              aria-hidden
              className="mx-auto mt-3 mb-4 h-1.25 w-10 shrink-0 rounded-pill bg-white/30"
            />
            <div className="flex-1 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),20px)]">
              <div className="mb-4">
                <DriverCard d={data} />
              </div>
              <Details d={data} />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
