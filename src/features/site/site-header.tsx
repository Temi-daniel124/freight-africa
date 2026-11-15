"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavLabels = {
  label: string;
  howItWorks: string;
  routes: string;
  pricing: string;
  questions: string;
  join: string;
  menu: string;
  closeMenu: string;
};

type SiteHeaderProps = { nav: NavLabels; homeLabel: string; showJoin?: boolean };

// The floating pill (DESIGN_SYSTEM.md 13.2, D031). It looks the same over the photo hero and over light
// sections, so its text is always ink on white; only the shadow deepens after 80 px.
export function SiteHeader({ nav, homeLabel, showJoin = true }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const menu = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 80);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const close = () => menu.current?.close();
  const links = [
    { href: "/#how-it-works", label: nav.howItWorks },
    { href: "/#routes", label: nav.routes },
    { href: "/#pricing", label: nav.pricing },
    { href: "/#questions", label: nav.questions },
  ];

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      {/* Same width and side insets as the page content, so the pill's edges line up with it. */}
      <div className="mx-auto max-w-site px-4 lg:px-6">
        <div
          className={cn(
            "nav-pill pointer-events-auto flex h-14 items-center gap-1.5 rounded-button p-1.5 transition-shadow duration-200 ease-out lg:h-16 lg:gap-2 lg:p-2",
            scrolled ? "shadow-pill-scrolled" : "shadow-pill",
          )}
        >
          <Link href="/" aria-label={homeLabel} className="flex h-full shrink-0 items-center rounded-button pr-1 pl-2.5 lg:pl-4">
            <Logo variant="primary-green" alt="" className="h-7 min-[22.5rem]:h-8 lg:h-9" priority />
          </Link>
          <nav aria-label={nav.label} className="mx-auto hidden lg:block">
            <ul className="flex items-center gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex h-12 items-center rounded-button px-4 text-body font-medium text-ink-2 transition-colors duration-150 hover:bg-green-50 hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {showJoin ? (
            <Link
              href="/waitlist"
              className={cn(buttonVariants({ variant: "primary", size: "md" }), "ml-auto h-11 px-4 text-label hover:translate-y-0 sm:px-5 sm:text-body lg:ml-0 lg:h-12 lg:px-6")}
            >
              {nav.join}
            </Link>
          ) : null}
          <button
            type="button"
            aria-label={nav.menu}
            aria-haspopup="dialog"
            onClick={() => menu.current?.showModal()}
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-pill bg-green-50 text-ink transition-colors hover:bg-green-100 lg:hidden",
              !showJoin && "ml-auto",
            )}
          >
            <Menu aria-hidden className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Phone menu: a native modal dialog styled as a bottom sheet (Escape and the backdrop close it). */}
      <dialog
        ref={menu}
        aria-label={nav.menu}
        onClick={(event) => event.target === menu.current && close()}
        className="pb-safe pointer-events-auto m-0 mt-auto w-full max-w-full rounded-t-sheet bg-surface p-0 text-ink shadow-floating backdrop:bg-scrim lg:hidden"
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex justify-end">
            <button type="button" aria-label={nav.closeMenu} onClick={close} className={buttonVariants({ variant: "icon", size: "icon" })}>
              <X aria-hidden className="size-6" strokeWidth={1.75} />
            </button>
          </div>
          <nav aria-label={nav.label}>
            <ul className="flex flex-col">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={close} className="flex h-14 items-center border-b border-line text-body-lg font-semibold text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {showJoin ? (
            <Link href="/waitlist" onClick={close} className={cn(buttonVariants(), "w-full")}>
              {nav.join}
            </Link>
          ) : null}
        </div>
      </dialog>
    </header>
  );
}
