import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReceiptView } from "@/features/receipts/receipt-view";
import { TrackingView, type TrackData } from "@/features/tracking/tracking-view";
import { SAMPLE_RECEIPT } from "@/features/receipts/samples";
import { ReportForm } from "@/features/trips/report-form";
import { CancelTrip, SenderTrip, type TripView } from "@/features/trips/sender-trip";

export const metadata: Metadata = { title: "Trip states", robots: { index: false, follow: false } };

// The 5d trip screens with the mockups' sample data (sender-mockups P14b–P14f, D09). Sample data only:
// preview and development only. The loading code, calls, rating and problem report are later phases.

const confirmed: TripView = {
  loadId: "preview",
  reference: "FA-7K3Q9",
  badge: "Truck confirmed",
  headline: "Driver getting ready",
  subline: "Loading Thu 26 Nov, morning · Apapa",
  deskSub: "FA-7K3Q9 · Lagos → Kano · loading Thu 26 Nov, morning",
  delivered: false,
  heldKobo: 185_000_000,
  heldDone: "",
  driver: { name: "Musa Ibrahim", org: "Musa Haulage Ltd", plate: "KJA 482 XA", truck: "Flatbed · 35 t", line: "4.8 · 126 trips · Gold · insured" },
  steps: [
    { title: "Paid and held", when: "Wed 25 Nov, 9:42 am", state: "done" },
    { title: "Truck confirmed · Musa Haulage", when: "Wed 25 Nov, 11:05 am", state: "done" },
    { title: "Driver arrives at Apapa", sub: "Thu morning · you'll get a message", state: "now" },
    { title: "Loading, photos and seal number", state: "later" },
    { title: "On the road · live tracking", state: "later" },
    { title: "Amina gives the delivery code · owner paid the rest", state: "later" },
  ],
  stops: [
    { place: "Apapa, Lagos", who: "You · loading code 518 204", pickup: true },
    { place: "Dawanau Market, Kano", who: "Amina Bello · gets the delivery code before arrival", pickup: false },
  ],
  receiptHref: null,
  bookAgainHref: "/dev/trips",
  canCancel: true,
  loadingCode: "518 204",
  calls: true,
  reportUntil: "Mon 16 Nov, 2:41 pm",
};

const delivered: TripView = {
  ...confirmed,
  reference: "FA-9P1L6",
  badge: "Delivered",
  headline: "Delivered Sat 14 Nov, 2:41 pm",
  subline: "Lagos → Port Harcourt · Tomatoes, 18 t",
  delivered: true,
  heldDone: "Code confirmed by Chidi Okeke. Owner paid. ₦0 held.",
  receiptHref: "/dev/trips",
  photos: 3,
  rating: true,
};

// P14 / D06 with the mockup's trip: Lagos → Kano, passing Lokoja.
const TRACKING: TrackData = {
  ref: "FA-7K3Q9",
  statusLabel: "On the road",
  step: 2,
  goods: "Rice · 600 bags",
  amount: "₦1,850,000",
  load: { kind: "weight", percent: 80, line: "80% full" },
  from: { name: "Apapa, Lagos", lat: 6.4474, lng: 3.3903, date: "Thu 26 Nov" },
  to: { name: "Dawanau, Kano", lat: 12.0453, lng: 8.4719, date: "Sat 28 Nov" },
  truck: { lat: 7.8023, lng: 6.7333 },
  lastSeen: "2 min ago",
  plate: "KJA 482 XA",
  truckType: "Flatbed",
  truckTypeCode: "flatbed_30t",
  driver: { firstName: "Musa Ibrahim", avatar: null, phone: "+2348035550142" },
  heldKobo: 185_000_000,
};

function Screen({ state }: { state: string }) {
  switch (state) {
    case "trip":
      return <SenderTrip v={confirmed} />;
    case "delivered":
      return <SenderTrip v={delivered} />;
    case "report":
      return <ReportForm back="/dev/trips" outOf={600} unit="bags" unitValueKobo={400_000} sample={{ short: 12, text: "Receiver counted 588 bags at the gate. Seal was intact." }} />;
    case "cancel":
      return (
        <div className="min-h-dvh bg-paper p-6">
          <CancelTrip loadId="preview" label="Cancel and get a full refund" preview={{ allowed: true, refundKobo: 185_000_000, ownerFeeKobo: 0, serviceKobo: 0, status: "funded" }} />
        </div>
      );
    case "tracking":
      return <TrackingView data={TRACKING} />;
    case "receipt":
      return (
        <div className="min-h-dvh bg-paper px-4 py-6 lg:px-10 lg:py-8">
          <ReceiptView m={SAMPLE_RECEIPT} pdfHref="/dev/pdf?doc=receipt" backHref="/dev/trips" />
        </div>
      );
    default:
      notFound();
  }
}

async function Chosen({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state = "trip" } = await searchParams;
  return <Screen state={state} />;
}

export default function TripStatesPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  return (
    <Suspense>
      <Chosen searchParams={searchParams} />
    </Suspense>
  );
}
