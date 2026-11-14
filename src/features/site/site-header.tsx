"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Drawer } from "vaul";
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

type SiteHeaderProps = { nav: NavLabels; homeLabel: string; overlay?: boolean; showJoin?: boolean };

export function SiteHeader({ nav, homeLabel, overlay = false, showJoin = true }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const update = () => setScrolled(window.scrollY > 80);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [overlay]);

  // Over the green hero the header is clear with white text; after 80 px it turns frosted (DESIGN_SYSTEM.md 13.2).
  const onGreen = overlay && !scrolled;
  const links = [
    { href: "/#how-it-works", label: nav.howItWorks },
    { href: "/#routes", label: nav.routes },
    { href: "/#pricing", label: nav.pricing },
    { href: "/#questions", label: nav.questions },
  ];

  return (
    <header className={cn("fixed inset-x-0 top-0 z-30 transition-colors motion-header", onGreen ? "bg-transparent" : "frosted border-b border-line")}>
      <div className="mx-auto flex h-16 max-w-site items-center gap-4 px-4 lg:gap-8 lg:px-6">
        <Link href="/" aria-label={homeLabel} className="shrink-0 rounded-nav">
          <Logo variant={onGreen ? "primary-white" : "primary-green"} alt="" className="h-9" priority />
        </Link>
        <nav aria-label={nav.label} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-8">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={cn("text-body font-semibold hover:underline", onGreen ? "text-white" : "text-ink")}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {showJoin ? (
          <Link href="/waitlist" className={cn(buttonVariants({ variant: onGreen ? "inverse" : "primary", size: "md" }), "ml-auto hidden sm:inline-flex lg:ml-0")}>
            {nav.join}
          </Link>
        ) : null}
        <Drawer.Root>
          <Drawer.Trigger
            aria-label={nav.menu}
            className={cn(
              buttonVariants({ variant: "icon", size: "icon" }),
              "lg:hidden",
              !showJoin && "ml-auto",
              showJoin && "ml-auto sm:ml-0",
              onGreen && "border-on-green bg-transparent text-white hover:bg-green-900",
            )}
          >
            <Menu aria-hidden className="size-6" strokeWidth={1.75} />
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim" />
            <Drawer.Content className="pb-safe fixed inset-x-0 bottom-0 z-50 rounded-t-sheet bg-surface shadow-floating outline-none">
              <div aria-hidden className="mx-auto mt-3 h-1 w-10 rounded-pill bg-line-strong" />
              <Drawer.Title className="sr-only">{nav.menu}</Drawer.Title>
              <nav aria-label={nav.label} className="flex flex-col gap-4 p-6">
                <ul className="flex flex-col">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Drawer.Close asChild>
                        <Link href={link.href} className="flex h-14 items-center border-b border-line text-body-lg font-semibold text-ink">
                          {link.label}
                        </Link>
                      </Drawer.Close>
                    </li>
                  ))}
                </ul>
                {showJoin ? (
                  <Drawer.Close asChild>
                    <Link href="/waitlist" className={cn(buttonVariants(), "w-full")}>
                      {nav.join}
                    </Link>
                  </Drawer.Close>
                ) : null}
              </nav>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </header>
  );
}
