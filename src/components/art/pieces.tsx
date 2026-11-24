import { useId } from "react";

// D045 illustrations: one soft 3D style, drawn by us from design-assets/source/. Light from the top left;
// gentle gradients on volumes only; a soft contact shadow; no outlines. Boxes stay brown, pins and
// shields are green, clouds white, the city pale grey, routes green and dashed. Every piece is a <g>
// placed by the scenes in scenes.tsx, so sizes stay consistent.

type Piece = { x?: number; y?: number; s?: number };

const at = ({ x = 0, y = 0, s = 1 }: Piece) => `translate(${x} ${y}) scale(${s})`;

/** A soft ellipse under a piece, so it sits on the ground. */
export function Shadow({ x = 0, y = 0, w = 120, h = 18, o = 0.16 }: { x?: number; y?: number; w?: number; h?: number; o?: number }) {
  const id = useId();
  return (
    <>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor="#083826" stopOpacity={o} />
          <stop offset="1" stopColor="#083826" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={y} rx={w / 2} ry={h / 2} fill={`url(#${id})`} />
    </>
  );
}

/** A brown cardboard box, three faces and dark tape, 120 wide at s=1 (origin: bottom centre). */
export function Box(props: Piece) {
  const id = useId();
  return (
    <g transform={at(props)}>
      <defs>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E3A764" />
          <stop offset="1" stopColor="#C98A47" />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C4823F" />
          <stop offset="1" stopColor="#A86B30" />
        </linearGradient>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2C48C" />
          <stop offset="1" stopColor="#E2AA6A" />
        </linearGradient>
      </defs>
      <Shadow y={2} w={150} h={22} />
      <path d="M-60 -16 L0 14 L0 -66 L-60 -96 Z" fill={`url(#${id}l)`} />
      <path d="M0 14 L60 -16 L60 -96 L0 -66 Z" fill={`url(#${id}r)`} />
      <path d="M-60 -96 L0 -126 L60 -96 L0 -66 Z" fill={`url(#${id}t)`} />
      {/* Tape across the top and down the front edge. */}
      <path d="M-14 -103 L46 -73 L46 -59 L-14 -89 Z" fill="#2A2A2A" opacity="0.92" />
      <path d="M-14 -89 L46 -59 L46 -49 L-14 -79 Z" fill="#1E1E1E" opacity="0.18" />
      <path d="M32 -66 L46 -73 L46 -40 L32 -33 Z" fill="#262626" />
      <path d="M-60 -96 L0 -126 L60 -96" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.5" />
    </g>
  );
}

/** A green map pin with a hole, standing on a dark base (origin: base centre). 110 tall at s=1. */
export function Pin({ hole = true, ...props }: Piece & { hole?: boolean }) {
  const id = useId();
  return (
    <g transform={at(props)}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2F9A5E" />
          <stop offset="0.55" stopColor="#13703F" />
          <stop offset="1" stopColor="#0A4A2B" />
        </linearGradient>
        <radialGradient id={`${id}h`} cx="0.35" cy="0.3" r="0.6">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Shadow y={2} w={70} h={14} o={0.22} />
      <ellipse cx="0" cy="-4" rx="22" ry="7" fill="#1F2A24" />
      <path d="M0 -10 C-6 -26 -34 -52 -34 -78 A34 34 0 1 1 34 -78 C34 -52 6 -26 0 -10 Z" fill={`url(#${id}g)`} />
      <path d="M0 -10 C-6 -26 -34 -52 -34 -78 A34 34 0 1 1 34 -78 C34 -52 6 -26 0 -10 Z" fill={`url(#${id}h)`} />
      {hole ? <circle cx="0" cy="-80" r="12" fill="#F6F8F5" /> : null}
    </g>
  );
}

/** A green shield with a white rim and a tick (origin: bottom tip). 90 tall at s=1. */
export function Shield(props: Piece) {
  const id = useId();
  return (
    <g transform={at(props)}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2A9358" />
          <stop offset="1" stopColor="#0B5131" />
        </linearGradient>
      </defs>
      <Shadow y={4} w={70} h={12} />
      <path d="M0 0 C-30 -14 -40 -36 -40 -60 L-40 -78 L0 -92 L40 -78 L40 -60 C40 -36 30 -14 0 0 Z" fill="#FFFFFF" />
      <path d="M0 -8 C-24 -20 -32 -38 -32 -58 L-32 -72 L0 -84 L32 -72 L32 -58 C32 -38 24 -20 0 -8 Z" fill={`url(#${id}g)`} />
      <path d="M-14 -46 L-4 -36 L16 -58" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** A white, puffy cloud (origin: bottom centre). 80 wide at s=1. */
export function Cloud(props: Piece) {
  const id = useId();
  return (
    <g transform={at(props)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E3E8E5" />
        </linearGradient>
      </defs>
      <path d="M-40 0 A16 16 0 0 1 -30 -28 A20 20 0 0 1 2 -38 A18 18 0 0 1 34 -24 A13 13 0 0 1 40 0 Z" fill={`url(#${id})`} />
    </g>
  );
}

/** A pale grey city skyline, 260 wide at s=1 (origin: bottom left). */
export function City(props: Piece) {
  const blocks: [number, number, number][] = [
    [0, 40, 70], [34, 30, 110], [60, 44, 150], [100, 26, 96], [122, 40, 186], [158, 32, 120], [186, 44, 140], [226, 34, 84],
  ];
  return (
    <g transform={at(props)} opacity="0.9">
      {blocks.map(([x, w, h]) => (
        <g key={x}>
          <rect x={x} y={-h} width={w} height={h} fill="#EEF1EF" />
          <rect x={x + w * 0.62} y={-h} width={w * 0.38} height={h} fill="#E1E6E3" />
        </g>
      ))}
      <path d="M141 -186 L141 -214 M138 -200 L144 -200" stroke="#E1E6E3" strokeWidth="3" />
    </g>
  );
}

/** A green dashed route between points. */
export function Route({ d, width = 4 }: { d: string; width?: number }) {
  return <path d={d} fill="none" stroke="#13703F" strokeWidth={width} strokeDasharray="10 9" strokeLinecap="round" />;
}

/** The soft white platform the pieces stand on. */
export function Platform({ x = 0, y = 0, w = 320 }: { x?: number; y?: number; w?: number }) {
  const id = useId();
  const h = w * 0.36;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EEF1EF" />
        </linearGradient>
      </defs>
      <Shadow y={h * 0.62} w={w * 1.05} h={h * 0.5} o={0.12} />
      <path d={`M0 ${h * 0.5} L${w / 2} ${h} L${w} ${h * 0.5} L${w / 2} 0 Z`} transform={`translate(${-w / 2} ${-h / 2})`} fill={`url(#${id})`} />
      <path d={`M0 ${h * 0.5} L${w / 2} ${h} L${w} ${h * 0.5} L${w} ${h * 0.5 + 14} L${w / 2} ${h + 14} L0 ${h * 0.5 + 14} Z`} transform={`translate(${-w / 2} ${-h / 2})`} fill="#E4E9E6" />
    </g>
  );
}
