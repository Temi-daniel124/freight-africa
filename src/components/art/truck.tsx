import { useId } from "react";
import { cn } from "@/lib/utils";

// D045/D046: our full-truckload trucks, side on, in our livery (deep green cab, the logo on the door).
// Never vans. The cargo area shows the load: how full (weight known), the goods and rough amount, or the
// animals and head count. The words sit in HTML over the drawing so they use our type and read aloud.

export type TruckKind = "flatbed" | "covered" | "tipper" | "tanker" | "livestock";

export type TruckLoad =
  | { kind: "weight"; percent: number; line: string }
  | { kind: "amount"; goods: string; amount?: string }
  | { kind: "livestock"; text: string }
  | null;

// The cargo area in the 320 × 140 drawing, as % of the frame (the label box sits here).
const CARGO = { left: 3.5, top: 14, width: 64, height: 52 };

/** Which drawing a truck type uses (catalogue code → kind). */
export function truckKind(code: string): TruckKind {
  if (code.startsWith("flatbed") || code.startsWith("container")) return code.startsWith("container") ? "covered" : "flatbed";
  if (code === "tipper" || code === "tanker" || code === "livestock") return code;
  return "covered";
}


/** Whole-number % rounded to 5, for "80% full" (D046). */
export function fillPercent(weightKg: number, capacityKg: number) {
  if (!(capacityKg > 0) || !(weightKg >= 0)) return 0;
  return Math.min(100, Math.round(((weightKg / capacityKg) * 100) / 5) * 5);
}

function Wheel({ x }: { x: number }) {
  return (
    <g>
      <circle cx={x} cy="118" r="15" fill="#1C2420" />
      <circle cx={x} cy="118" r="7" fill="#9AA6A0" />
      <circle cx={x} cy="118" r="3" fill="#5E6B64" />
    </g>
  );
}

function Body({ kind, fill, id }: { kind: TruckKind; fill: number | null; id: string }) {
  const x = 11;
  const y = 20;
  const w = 205;
  const h = 73;
  const filled = fill === null ? 0 : Math.max(0, Math.min(1, fill));
  const level = (
    <>
      <clipPath id={`${id}c`}>
        <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx="6" />
      </clipPath>
      {filled > 0 ? (
        <g clipPath={`url(#${id}c)`}>
          <rect x={x + 4} y={y + 4} width={(w - 8) * filled} height={h - 8} fill="#DCEBE2" />
          <rect x={x + 4} y={y + 4} width={(w - 8) * filled} height={h - 8} fill={`url(#${id}hatch)`} />
        </g>
      ) : null}
    </>
  );
  if (kind === "tanker") {
    return (
      <g>
        <rect x={x} y={y + 6} width={w} height={h - 6} rx="34" fill={`url(#${id}tank)`} />
        <rect x={x + 20} y={y + 2} width="26" height="8" rx="3" fill="#C9D1CC" />
        <rect x={x + 150} y={y + 2} width="26" height="8" rx="3" fill="#C9D1CC" />
        <rect x={x} y={y + 40} width={w} height="6" fill="#0C5034" opacity="0.9" />
      </g>
    );
  }
  if (kind === "tipper") {
    return (
      <g>
        <path d={`M${x} ${y + 8} L${x + w} ${y + 8} L${x + w - 14} ${y + h} L${x + 10} ${y + h} Z`} fill={`url(#${id}steel)`} />
        <path d={`M${x} ${y + 8} L${x + w} ${y + 8}`} stroke="#0C5034" strokeWidth="5" />
      </g>
    );
  }
  if (kind === "flatbed") {
    return (
      <g>
        <rect x={x} y={y + h - 10} width={w} height="10" rx="2" fill="#2C3A33" />
        <rect x={x + 6} y={y + 8} width={w - 12} height={h - 18} rx="4" fill="#F3F5F4" stroke="#DCE2DE" strokeDasharray="6 5" />
        {level}
      </g>
    );
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={`url(#${id}box)`} />
      {kind === "livestock"
        ? [0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={x + 8} y={y + 10 + i * 10} width={w - 16} height="3" rx="1.5" fill="#C9D1CC" />)
        : null}
      {level}
      <rect x={x} y={y + h - 8} width={w} height="8" fill="#0C5034" />
    </g>
  );
}

/** A truck graphic with its load display (D046). `fill` is 0–1 when the weight is known. */
export function TruckGraphic({ kind, load, className, plateLabel }: { kind: TruckKind; load: TruckLoad; className?: string; plateLabel?: string }) {
  const id = useId().replace(/:/g, "");
  const fill = load?.kind === "weight" ? load.percent / 100 : null;
  return (
    <div className={cn("relative w-full [container-type:inline-size]", className)} style={{ aspectRatio: "320 / 140" }}>
      <svg viewBox="0 0 320 140" className="absolute inset-0 size-full" role="img" aria-label={plateLabel ?? ""}>
        <defs>
          <linearGradient id={`${id}box`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#E6EBE8" />
          </linearGradient>
          <linearGradient id={`${id}cab`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1C7A4A" />
            <stop offset="1" stopColor="#083826" />
          </linearGradient>
          <linearGradient id={`${id}tank`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.6" stopColor="#DDE3DF" />
            <stop offset="1" stopColor="#B9C3BD" />
          </linearGradient>
          <linearGradient id={`${id}steel`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E9EDEA" />
            <stop offset="1" stopColor="#B9C3BD" />
          </linearGradient>
          <pattern id={`${id}hatch`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3" height="8" fill="#2F7A57" opacity="0.18" />
          </pattern>
          <radialGradient id={`${id}sh`}>
            <stop offset="0" stopColor="#083826" stopOpacity="0.18" />
            <stop offset="1" stopColor="#083826" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="160" cy="132" rx="156" ry="7" fill={`url(#${id}sh)`} />
        {/* Chassis */}
        <rect x="8" y="96" width="290" height="8" rx="3" fill="#2C3A33" />
        <Body kind={kind} fill={fill} id={id} />
        {/* Cab */}
        <path d="M226 36 L276 36 C288 36 296 44 300 56 L308 80 L308 104 L226 104 Z" fill={`url(#${id}cab)`} />
        <path d="M262 44 L280 44 C286 44 290 48 292 54 L297 70 L262 70 Z" fill="#BFE0F0" opacity="0.9" />
        <path d="M262 44 L272 44 L268 70 L262 70 Z" fill="#FFFFFF" opacity="0.35" />
        <image href="/brand/svg/icon-white.svg" x="232" y="50" width="24" height="24" opacity="0.95" />
        <rect x="304" y="84" width="6" height="8" rx="2" fill="#F5C451" />
        <Wheel x={52} />
        <Wheel x={88} />
        <Wheel x={180} />
        <Wheel x={274} />
      </svg>
      {load ? (
        <div
          className="pointer-events-none absolute flex flex-col items-center justify-center px-2 text-center"
          style={{ left: `${CARGO.left}%`, top: `${CARGO.top}%`, width: `${CARGO.width}%`, height: `${CARGO.height}%` }}
        >
          {load.kind === "weight" ? (
            <>
              <span className="text-[clamp(14px,4.2cqw,22px)] leading-tight font-semibold text-green-900 tabular">{load.percent}% full</span>
              <span className="truncate text-[clamp(10px,2.6cqw,13px)] font-semibold text-ink-2 tabular">{load.line}</span>
            </>
          ) : load.kind === "amount" ? (
            <>
              <span className="w-full truncate text-[clamp(12px,3.4cqw,17px)] leading-tight font-semibold text-green-900">{load.goods}</span>
              {load.amount ? <span className="w-full truncate text-[clamp(10px,2.6cqw,13px)] font-semibold text-ink-2">{load.amount}</span> : null}
            </>
          ) : (
            <span className="w-full truncate text-[clamp(12px,3.4cqw,17px)] leading-tight font-semibold text-green-900">{load.text}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
