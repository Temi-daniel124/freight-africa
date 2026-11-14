"use client";

import type { LucideIcon } from "lucide-react";
import * as m from "motion/react-m";
import { useId, useState } from "react";
import { springUi } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Tab = { key: string; label: string; icon: LucideIcon; raised?: boolean };

export function BottomTabs({ tabs, label }: { tabs: readonly Tab[]; label: string }) {
  const [active, setActive] = useState(tabs[0].key);
  const pillId = useId();
  return (
    <nav aria-label={label} className="pb-safe border-t border-line bg-surface shadow-floating">
      <ul className="flex h-18 items-stretch">
        {tabs.map(({ key, label: tabLabel, icon: Icon, raised }) => {
          const selected = active === key;
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => setActive(key)}
                className={cn("flex h-full w-full flex-col items-center justify-end gap-1 pb-2 text-label", selected ? "text-green-700" : "text-ink-2")}
              >
                {raised ? (
                  <span className="-mt-4 flex size-15 items-center justify-center rounded-pill bg-green-700 text-white shadow-floating">
                    <Icon aria-hidden className="size-6" strokeWidth={1.75} />
                  </span>
                ) : (
                  <span className="relative flex h-8 w-14 items-center justify-center">
                    {selected ? <m.span layoutId={pillId} transition={springUi} className="absolute inset-0 rounded-pill bg-green-100" /> : null}
                    <Icon aria-hidden className="relative size-6" strokeWidth={1.75} />
                  </span>
                )}
                {tabLabel}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
