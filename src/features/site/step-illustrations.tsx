import { Check, ShieldCheck, Truck } from "lucide-react";
import messages from "@/messages/en.json";

const t = messages.home.how;

// Small app screens on top of the How it works cards (Gate 3 target). Decorative, so hidden from screen
// readers; the step text below each one says the same thing.
function Shot({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden className="flex min-h-37.5 flex-col justify-center gap-2.5 overflow-hidden rounded-tray border border-line bg-surface p-4 lg:h-52">
      {children}
    </div>
  );
}

const Title = ({ children }: { children: string }) => <div className="text-control leading-5.25 font-semibold tracking-close">{children}</div>;

function KeyValue({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <small className="text-micro leading-3.25 font-semibold tracking-kv text-ink-3">{label}</small>
      {value ? <b className="text-label leading-4.5 font-semibold">{value}</b> : null}
    </div>
  );
}

function Tick({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-1.5 text-caption leading-3.75 font-semibold tracking-normal text-green-700">
      <Check className="size-3.5 shrink-0" strokeWidth={1.75} />
      {children}
    </div>
  );
}

const Rule = () => <hr className="border-line" />;

function Chip({ tone, children, icon }: { tone: "ok" | "info"; children: string; icon?: boolean }) {
  return (
    <span
      className={
        "inline-flex h-6.5 items-center gap-1.5 self-start rounded-pill px-2.5 text-caption font-semibold tracking-normal " +
        (tone === "ok" ? "bg-success-100 text-success" : "bg-info-100 text-info")
      }
    >
      {icon ? <Check className="size-3.5" strokeWidth={1.75} /> : null}
      {children}
    </span>
  );
}

export function BookIllustration() {
  return (
    <Shot>
      <Title>{t.bookRoute}</Title>
      <KeyValue label={t.bookPickup} value={t.bookPickupValue} />
      <KeyValue label={t.bookGoods} value={t.bookGoodsValue} />
      <Rule />
      <Tick>{t.bookPrice}</Tick>
    </Shot>
  );
}

export function AcceptIllustration() {
  return (
    <Shot>
      <Chip tone="ok" icon>
        {t.acceptStatus}
      </Chip>
      <div>
        <div className="tabular text-plate tracking-kv">{t.acceptPlate}</div>
        <div className="text-caption leading-3.75 font-medium tracking-normal text-ink-2">{t.acceptTruck}</div>
      </div>
      <Rule />
      <div className="flex items-center gap-2 text-label leading-4.5 font-semibold">
        <span className="grid size-7 place-items-center rounded-pill bg-green-100 text-micro font-semibold text-green-700">MI</span>
        {t.acceptDriver}
        <span className="inline-flex items-center gap-0.75 text-caption font-semibold tracking-normal text-green-700">
          <ShieldCheck className="size-3.25" strokeWidth={1.75} />
          {t.acceptVerified}
        </span>
      </div>
    </Shot>
  );
}

export function TrackIllustration() {
  return (
    <Shot>
      <div className="flex items-center justify-between">
        <Title>{t.trackPlace}</Title>
        <Chip tone="info">{t.trackStatus}</Chip>
      </div>
      <div className="relative h-5">
        <span className="absolute top-2.25 left-0 h-0.5 w-3/5 rounded-pill bg-green-700" />
        <svg className="absolute top-2.25 right-0 h-0.5 w-2/5" preserveAspectRatio="none">
          <line x1="0" y1="1" x2="100%" y2="1" strokeWidth="2" strokeDasharray="6 5" className="stroke-line-strong" />
        </svg>
        <span className="absolute top-0 left-3/5 grid h-5 w-6.5 -translate-x-1/2 place-items-center rounded-pill bg-green-700 text-white">
          <Truck className="size-3.5" strokeWidth={2} />
        </span>
      </div>
      <div className="text-caption leading-3.75 font-medium tracking-normal text-ink-2">{t.trackEta}</div>
    </Shot>
  );
}

export function CodeIllustration() {
  return (
    <Shot>
      <KeyValue label={t.codeLabel} />
      <div className="grid grid-cols-6 gap-1">
        {t.code.split("").map((digit, index) => (
          <span key={index} className="tabular grid h-9 place-items-center rounded-digit border border-success-200 bg-success-100 text-control font-semibold text-success">
            {digit}
          </span>
        ))}
      </div>
      <Rule />
      <Tick>{`${t.codeStatus} · ${t.codeResult}`}</Tick>
    </Shot>
  );
}

export const stepIllustrations = [BookIllustration, AcceptIllustration, TrackIllustration, CodeIllustration];
