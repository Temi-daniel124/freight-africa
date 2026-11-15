import { Check, MapPin, Package, ShieldCheck, Tag, Truck } from "lucide-react";
import { StatusChip } from "@/components/ui/chip";
import { RoadLine } from "@/components/ui/road-line";
import messages from "@/messages/en.json";

const t = messages.home.how;

// Illustrated stand-ins for app screens until the app exists (BUILD.md 2A). Decorative, so hidden from screen readers.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-raised">
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-green-50 text-green-500">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-caption text-ink-2">{label}</p>
        <p className="text-body font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

export function BookIllustration() {
  return (
    <Frame>
      <p className="text-title-2 text-ink">{t.bookRoute}</p>
      <Row icon={MapPin} label={t.bookPickup} value={t.bookPickupValue} />
      <Row icon={Package} label={t.bookGoods} value={t.bookGoodsValue} />
      {/* A statement, not an action: no pill shape or solid fill, so it can't be mistaken for a button. */}
      <p className="flex items-center gap-2 border-t border-line pt-4 text-label text-green-800">
        <Tag aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
        {t.bookPrice}
      </p>
    </Frame>
  );
}

export function AcceptIllustration() {
  return (
    <Frame>
      <StatusChip tone="success" icon={Check} className="self-start">
        {t.acceptStatus}
      </StatusChip>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="tabular text-title-2 text-ink">{t.acceptPlate}</p>
          <p className="text-body text-ink-2">{t.acceptTruck}</p>
        </div>
        <Truck className="size-10 text-green-700" strokeWidth={1.5} />
      </div>
      <div className="flex items-center gap-2 border-t border-line pt-4 text-body text-ink">
        <span className="font-semibold">{t.acceptDriver}</span>
        <span className="inline-flex items-center gap-1 text-label text-green-700">
          <ShieldCheck className="size-4" strokeWidth={1.75} />
          {t.acceptVerified}
        </span>
      </div>
    </Frame>
  );
}

export function TrackIllustration() {
  return (
    <Frame>
      <div className="flex items-center justify-between gap-3">
        <p className="text-title-2 text-ink">{t.trackPlace}</p>
        <StatusChip tone="info" icon={Truck}>
          {t.trackStatus}
        </StatusChip>
      </div>
      <RoadLine progress={60} className="my-2" />
      <p className="text-body text-ink-2">{t.trackEta}</p>
    </Frame>
  );
}

export function CodeIllustration() {
  return (
    <Frame>
      <p className="text-label text-ink-2">{t.codeLabel}</p>
      <div className="grid grid-cols-6 gap-2">
        {t.code.split("").map((digit, index) => (
          <span key={index} className="tabular flex h-14 items-center justify-center rounded-inner border-2 border-success bg-success-100 text-title-1 text-success">
            {digit}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <StatusChip tone="success" icon={Check}>
          {t.codeStatus}
        </StatusChip>
        <p className="text-body text-ink-2">{t.codeResult}</p>
      </div>
    </Frame>
  );
}

export const stepIllustrations = [BookIllustration, AcceptIllustration, TrackIllustration, CodeIllustration];
