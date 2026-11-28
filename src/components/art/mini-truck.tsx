import { truckKind } from "./truck";

// The small side-view trucks in the owners' truck lists (owner mockups O10, OD01, O18): a body shape per
// kind (flatbed deck, covered box, tipper tub, tank, livestock cage), the cab and two wheels.
const BODY: Record<ReturnType<typeof truckKind>, React.ReactNode> = {
  flatbed: <rect x="2" y="14" width="34" height="6" rx="2" />,
  covered: <rect x="2" y="4" width="34" height="16" rx="2" />,
  tipper: <path d="M2 8h34l-4 12H6z" />,
  tanker: <rect x="2" y="7" width="34" height="13" rx="6.5" />,
  livestock: <path d="M2 5h34v15H2zM6 9v7h3V9zm7 0v7h3V9zm7 0v7h3V9zm7 0v7h3V9z" fillRule="evenodd" />,
};

export function MiniTruck({ code, className }: { code: string; className?: string }) {
  const kind = truckKind(code);
  return (
    <svg aria-hidden viewBox="0 0 56 28" width="36" height="18" className={className}>
      <g fill="var(--color-green-700)">
        {BODY[kind]}
        <path d={kind === "flatbed" ? "M38 6h8l6 8v6H38z" : "M38 8h8l6 7v5H38z"} />
      </g>
      <circle cx="10" cy="23" r="3.5" fill="var(--color-ink)" />
      <circle cx="44" cy="23" r="3.5" fill="var(--color-ink)" />
    </svg>
  );
}
