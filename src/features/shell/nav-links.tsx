"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { shellIcons, sidebarIcons, type ShellIcon } from "./icons";

export type LinkItem = { href: string; label: string; icon: ShellIcon; raised?: boolean; badge?: boolean };

/** The base route is only "current" on itself; every other link also covers the pages under it. */
function isCurrent(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Desktop sidebar items (mockup .side .nav): 44 px, 14 px radius, 15/600, a 20 px icon (1.8 stroke) before
 * each; the current one pale green with green words and icon (.nav.act), the others ink-2 words, ink-3 icon.
 */
export function SidebarLinks({ items, base, current: currentPath }: { items: LinkItem[]; base: string; current?: string }) {
  const routePath = usePathname();
  const pathname = currentPath ?? routePath;
  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ href, label, icon }) => {
        const Icon = sidebarIcons[icon] ?? shellIcons[icon];
        const current = isCurrent(pathname, href, href === base);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-nav px-3.5 text-body leading-4.5 font-semibold transition-colors motion-quick",
                current ? "bg-green-50 text-green-700" : "text-ink-2 hover:bg-paper hover:text-ink",
              )}
            >
              <Icon aria-hidden className={cn("size-5 shrink-0", current ? "text-green-700" : "text-ink-3")} strokeWidth={1.8} />
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
        "rounded-pill border border-line bg-surface/96 px-1.5 shadow-tabs",
        inline ? "relative mt-6.5 w-full max-w-97.5" : "bottom-tabs fixed inset-x-3 z-20 lg:hidden",
        large ? "h-18" : "h-17",
      )}
    >
      <ul className="grid h-full" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ href, label: tabLabel, icon, raised, badge }) => {
          // The phone tabs draw the mockup paths too where there is one (sender P12: truck, card).
          const Icon = sidebarIcons[icon] ?? shellIcons[icon];
          const current = isCurrent(pathname, href, href === base);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative flex w-full flex-col items-center gap-0.75 font-semibold whitespace-nowrap",
                  large ? "text-label" : "text-micro",
                  raised ? "justify-start" : "justify-center",
                  current ? "text-green-700" : "text-ink-3",
                )}
              >
                {raised ? (
                  // Mockup: a 56 px green circle raised 22 px, ringed with 5 px of page colour, its label below.
                  <span aria-hidden className="-mt-5.5 mb-1 grid size-14 place-items-center rounded-pill bg-green-700 text-white shadow-[0_0_0_5px_var(--color-paper),var(--shadow-fab)]">
                    <Icon className="size-6" strokeWidth={2.2} />
                  </span>
                ) : (
                  <Icon aria-hidden className={cn(large ? "size-7" : "size-5.5", current && "fill-green-100")} strokeWidth={1.8} />
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
