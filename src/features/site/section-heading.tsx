import { cn } from "@/lib/utils";

type SectionHeadingProps = { id?: string; title: string; lead?: string; tone?: "default" | "inverse"; className?: string };

export function SectionHeading({ id, title, lead, tone = "default", className }: SectionHeadingProps) {
  return (
    <div className={cn("flex max-w-text flex-col gap-3", className)}>
      <h2 id={id} className={cn("type-h2", tone === "inverse" ? "text-white" : "text-ink")}>
        {title}
      </h2>
      {lead ? <p className={cn("type-lead", tone === "inverse" ? "text-on-green" : "text-ink-2")}>{lead}</p> : null}
    </div>
  );
}
