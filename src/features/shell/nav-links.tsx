"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { shellIcons, type ShellIcon } from "./icons";

export type LinkItem = { href: string; label: string; icon: ShellIcon; raised?: boolean; badge?: boolean };

/** The base route is only "current" on itself; every other link also covers the pages under it. */
function isCurrent(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop sidebar items (DESIGN_SYSTEM 10.2): 44 px, 12 px radius, the current one on green-100. */
export function SidebarLinks({ items, base, current: currentPath }: { items: LinkItem[]; base: string; current?: string }) {
  const routePath = usePathname();
  const pathname = currentPath ?? routePath;
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon }) => {
        const Icon = shellIcons[icon];
        const current = isCurrent(pathname, href, href === base);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-nav px-3 text-body-sm leading-4.5 transition-colors motion-quick",
                current ? "bg-green-100 text-green-700" : "text-ink-2 hover:bg-paper hover:text-ink",
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
              <span className="min-w-0">{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type BottomTabsProps = {
  items: LinkItem[];
  base: string;
  label: string;
  large?: boolean;
  /** For the component gallery: drawn in place, not fixed to the screen, with the first tab current. */
  inline?: boolean;
  /** For previews: the address to treat as the current page. */
  current?: string;
};

/**
 * Phone bottom tabs (DESIGN_SYSTEM 10.1, Gate 4): a floating white pill 12 px from the sides and 12 px
 * above the bottom plus the safe area, 45 px radius, 1 px line, soft shadow; the raised green centre
 * action where the role has one. Drivers get the larger version.
 */
export function BottomTabs({ items, base, label, large = false, inline = false, current: currentPath }: BottomTabsProps) {
  const routePath = usePathname();
  const pathname = inline ? items[0].href : (currentPath ?? routePath);
  return (
    <nav
      aria-label={label}
      className={cn(
        "rounded-button border border-line bg-surface px-1.5 shadow-tabs",
        inline ? "relative mt-6.5 w-full max-w-97.5" : "bottom-tabs fixed inset-x-3 z-20 lg:hidden",
        large ? "h-18" : "h-17",
      )}
    >
      <ul className="grid h-full" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ href, label: tabLabel, icon, raised, badge }) => {
          const Icon = shellIcons[icon];
          const current = isCurrent(pathname, href, href === base);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative flex w-full flex-col items-center gap-1 font-semibold whitespace-nowrap",
                  large ? "text-label" : "text-caption tracking-normal",
                  raised ? "justify-end pb-3" : "justify-center",
                  current ? "text-green-700" : "text-ink-2",
                )}
              >
                {raised ? (
                  <span aria-hidden className="absolute -top-5 grid size-15 place-items-center rounded-pill bg-green-700 text-white shadow-fab">
                    <Icon className="size-6.5" strokeWidth={2.25} />
                  </span>
                ) : (
                  <span aria-hidden className={cn("grid h-7.5 w-14 place-items-center rounded-pill transition-colors motion-quick", current && "bg-green-100")}>
                    <Icon className={large ? "size-7" : "size-5.5"} strokeWidth={1.75} />
                  </span>
                )}
                {tabLabel}
                {badge ? <i aria-hidden className="absolute top-2.5 left-[calc(50%+0.5rem)] size-2.25 rounded-pill bg-danger ring-2 ring-surface" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
