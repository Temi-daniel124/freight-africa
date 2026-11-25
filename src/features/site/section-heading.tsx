import { cn } from "@/lib/utils";

type EyebrowProps = { children: string; tone?: "default" | "inverse"; className?: string };

/** The small label pill above every section headline (Gate 3). */
export function Eyebrow({ children, tone = "default", className }: EyebrowProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-2 self-start rounded-pill pr-3 pl-2.5 text-caption font-semibold tracking-caps uppercase",
        tone === "inverse" ? "bg-white/10 text-white" : "bg-green-50 text-green-700",
        className,
      )}
    >
      <i aria-hidden className={cn("size-1.5 rounded-pill", tone === "inverse" ? "bg-road-yellow" : "bg-green-500")} />
      {children}
    </span>
  );
}

type SectionHeadingProps = { id: string; label: string; title: string; lead?: string; tone?: "default" | "inverse"; as?: "h2" };

/**
 * One heading pattern for every landing section (Gate 3 target): the label pill and a big headline on the
 * left, a short paragraph on the right (stacked on phones).
 */
export function SectionHeading({ id, label, title, lead, tone = "default" }: SectionHeadingProps) {
  return (
    <div className="mb-8 grid gap-4 lg:mb-14 lg:grid-cols-2 lg:items-end lg:gap-12">
      <div className="flex flex-col">
        <Eyebrow tone={tone}>{label}</Eyebrow>
        <h2 id={id} className={cn("type-section mt-3.5 text-balance lg:mt-4", tone === "inverse" ? "text-white" : "text-ink")}>
          {title}
        </h2>
      </div>
      {lead ? <p className={cn("type-section-lead max-w-120 text-wrap lg:justify-self-end", tone === "inverse" ? "text-white/80" : "text-ink-2")}>{lead}</p> : null}
    </div>
  );
}
