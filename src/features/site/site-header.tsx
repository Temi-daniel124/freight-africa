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
  signIn: string;
  getStarted: string;
  menu: string;
  closeMenu: string;
};

// signInHref is null while the public site is waitlist-only (D036): then the only action is Join the waitlist.
type SiteHeaderProps = { nav: NavLabels; homeLabel: string; showJoin?: boolean; signInHref: string | null };

// The floating pill (DESIGN_SYSTEM.md 13.2, D031), built to the Gate 2 target: solid white, so nothing
// shows through it over the photo or the page; only the shadow deepens after 80 px.
export function SiteHeader({ nav, homeLabel, showJoin = true, signInHref }: SiteHeaderProps) {
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
    <header className="pointer-events-none fixed inset-x-0 top-3 z-30 px-3 lg:top-7 lg:px-10">
      <div
        className={cn(
          "pointer-events-auto mx-auto flex h-14 max-w-300 items-center gap-2 rounded-pill bg-surface py-1.5 pr-1.5 pl-3.5 transition-shadow duration-200 ease-out lg:h-16 lg:py-2 lg:pr-2 lg:pl-5",
          scrolled ? "shadow-pill-scrolled" : "shadow-pill",
        )}
      >
        <Link href="/" aria-label={homeLabel} className="flex shrink-0 items-center rounded-button">
          <Logo variant="primary-green" alt="" className="h-7.5 lg:h-9" priority />
        </Link>
        <nav aria-label={nav.label} className="mx-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex h-10 items-center rounded-pill px-4 text-body font-semibold text-ink-2 transition-colors duration-150 hover:bg-green-50 hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {signInHref ? (
          <a href={signInHref} className="hidden h-12 items-center rounded-pill px-4 text-body font-semibold text-ink transition-colors hover:bg-green-50 lg:inline-flex">
            {nav.signIn}
          </a>
        ) : null}
        <button
          type="button"
          aria-label={nav.menu}
          aria-haspopup="dialog"
          onClick={() => menu.current?.showModal()}
          className="ml-auto inline-flex size-11 shrink-0 items-center justify-center rounded-pill border border-line bg-surface text-ink transition-colors hover:bg-green-50 lg:hidden"
        >
          <Menu aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
        {showJoin ? (
          <Link
            href={signInHref ?? "/waitlist"}
            className="inline-flex h-11 shrink-0 items-center rounded-pill bg-green-700 px-4 text-body-sm font-semibold text-white transition-colors hover:bg-green-800 max-[22.5rem]:px-3.5 lg:h-12 lg:px-5.5 lg:text-body lg:font-semibold"
          >
            {signInHref ? nav.getStarted : nav.join}
          </Link>
        ) : null}
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
          {signInHref ? (
            <a href={signInHref} onClick={close} className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
              {nav.signIn}
            </a>
          ) : null}
          {showJoin ? (
            <Link href={signInHref ?? "/waitlist"} onClick={close} className={cn(buttonVariants(), "w-full")}>
              {signInHref ? nav.getStarted : nav.join}
            </Link>
          ) : null}
        </div>
      </dialog>
    </header>
  );
}
