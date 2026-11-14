import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type ListRowProps = { icon: LucideIcon; title: string; detail?: string; action?: ReactNode };

export function ListRow({ icon: Icon, title, detail, action }: ListRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-inner py-2">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-green-50 text-green-500">
        <Icon aria-hidden className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-ink">{title}</p>
        {detail ? <p className="truncate text-caption text-ink-2">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}
