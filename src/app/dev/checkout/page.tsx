import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FindingView, type FindingProps } from "@/features/checkout/finding";
import { DemoCheckout, DraftSavedPreview, PayScreen, PaySeveral, ReturnScreen } from "@/features/checkout/screens";
import { TripsTabs } from "@/features/checkout/trips-tabs";

export const metadata: Metadata = { title: "Checkout states", robots: { index: false, follow: false } };

// The 5c screens with the mockups' sample data (sender-mockups P10–P12b, P15c, D04, D08), so they can be
// checked without signing in. Sample data only: never shown in production (preview and development only).

const pay = {
  loadId: "preview",
  reference: "FA-7K3Q9",
  route: "Lagos → Kano",
  summary: "Thu 26 Nov · flatbed · 2 items, about 32 t",
  draftLine: "Lagos → Kano · Thu 26 Nov",
  amountKobo: 185_000_000,
  freightKobo: 178_000_000,
  feeKobo: 7_000_000,
  back: "/dev/checkout",
};

const ret = { kind: "payment" as const, id: "preview", reference: "FA-7K3Q9", amountKobo: 185_000_000, route: "Lagos → Kano", loadId: null, retryable: true, draftLine: "Lagos → Kano · Thu 26 Nov" };

const soon = (min: number) => new Date(Date.now() + min * 60000).toISOString();
const days = ["2026-11-27", "2026-11-28", "2026-11-29", "2026-11-30"].map((day, i) => ({ day, free: [5, 0, 6, 9][i] }));

const finding: FindingProps = {
  loadId: "preview",
  reference: "FA-7K3Q9",
  route: "Lagos → Kano",
  places: "Apapa, Lagos → Dawanau, Kano",
  pickupLine: "Thu 26 Nov, morning",
  pickupShort: "Thu 26 Nov · morning",
  itemsLine: "2 items · flatbed 35 t",
  goodsLine: "Rice, 600 bags · Noodles, 200 cartons",
  receiver: "Amina Bello",
  heldKobo: 185_000_000,
  totalKobo: 185_000_000,
  offered: false,
  fundedAt: new Date(Date.now() - 12 * 60000).toISOString(),
  createdAt: new Date().toISOString(),
  due: false,
  replies: [],
  truckName: "Flatbed",
  days,
  canCancel: true,
};

const replies: FindingProps = {
  ...finding,
  reference: "FA-4R2N8",
  route: "Lagos → Onitsha",
  pickupShort: "Fri 27 Nov · morning",
  goodsLine: "Cement, 30 t",
  receiver: "Obinna Eze",
  offered: true,
  heldKobo: 170_000_000,
  totalKobo: 170_000_000,
  replies: [
    { id: "r1", org: "Musa Haulage Ltd", tier: "gold", truck: "4.8 · 126 trips · flatbed 35 t", totalKobo: 178_000_000, payKobo: 8_000_000, expiresAt: soon(102), canOfferAgain: true },
    { id: "r2", org: "Emeka Nwosu Transport", tier: "new", truck: "4.6 · 9 trips · flatbed 35 t", totalKobo: 182_000_000, payKobo: 12_000_000, expiresAt: soon(102), canOfferAgain: true },
  ],
};

const drafts = [
  { id: "d1", route: "Lagos → Abuja", line: "Cement, 30 t · Thu 26 Nov · tipper", saved: "Saved today · 9:12 AM", totalKobo: 98_000_000, dayPassed: false },
  { id: "d2", route: "Aba → Enugu", line: "Cartons, 400 · day not set", saved: "Saved 22 Nov", totalKobo: 0, dayPassed: true },
];

const several = [
  { id: "s1", route: "Lagos → Abuja", line: "Cement, 30 t · Thu 26 Nov", totalKobo: 98_000_000 },
  { id: "s2", route: "Lagos → Onitsha", line: "Rice, 600 bags · Fri 27 Nov", totalKobo: 112_000_000 },
  { id: "s3", route: "Lagos → Aba", line: "Cartons, 900 · Mon 30 Nov", totalKobo: 101_000_000 },
];

function Screen({ state }: { state: string }) {
  switch (state) {
    case "pay":
      return <PayScreen {...pay} />;
    case "draft":
      return <DraftSavedPreview line={pay.draftLine} />;
    case "confirming":
      return <ReturnScreen {...ret} initial="pending" />;
    case "failed":
      return <ReturnScreen {...ret} initial="failed" />;
    case "demo":
      return <DemoCheckout providerRef="demo-co-00000000-0000-4000-8000-000000000000" amountKobo={185_000_000} back="/dev/checkout" />;
    case "finding":
      return <FindingView {...finding} />;
    case "replies":
      return <FindingView {...replies} />;
    case "again":
      return <FindingView {...replies} previewAgain />;
    case "24h":
      return <FindingView {...finding} due />;
    case "drafts":
      return (
        <div className="min-h-dvh bg-paper px-4 pt-6 lg:px-10">
          <TripsTabs counts={{ active: 2, drafts: 2, done: 0, cancelled: 0 }} lists={{ active: null, done: null, cancelled: null }} drafts={drafts} days={days.map((d) => ({ ...d, free: -1 }))} />
        </div>
      );
    case "several":
      return <PaySeveral drafts={several} />;
    default:
      notFound();
  }
}

async function Chosen({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state = "pay" } = await searchParams;
  return <Screen state={state} />;
}

export default function CheckoutStatesPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  return (
    <Suspense>
      <Chosen searchParams={searchParams} />
    </Suspense>
  );
}
