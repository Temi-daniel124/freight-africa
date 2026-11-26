import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { staffNavFor, type StaffPage, type StaffRole } from "./config";
import { shellIcons, type ShellIcon } from "./icons";

const t = messages.shell.staff;

/** A count beside a console item: red for SOS, amber for "needs action soon", grey otherwise (mockup .bd). */
export type StaffBadge = { count: number; tone?: "red" | "amber" | "grey" };

const badgeTones = { red: "bg-sos text-white", amber: "bg-warning-100 text-warning", grey: "bg-line-soft text-ink-nav" } as const;

function ConsoleLink({ href, label, icon, current, badge }: { href: string; label: string; icon: ShellIcon; current: boolean; badge?: StaffBadge }) {
  const Icon = shellIcons[icon];
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-nav-dense px-3 text-[13.5px] transition-colors motion-quick",
        current ? "bg-green-50 font-semibold text-green-700" : "font-medium text-ink-nav hover:bg-paper hover:text-ink",
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
      <span className="min-w-0 truncate">{label}</span>
      {badge?.count ? (
        <span className={cn("tabular ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-micro font-semibold", badgeTones[badge.tone ?? "grey"])}>
          {badge.count}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * The console's grouped sidebar (admin mockups .xs): dense 32 px rows, folding groups (a native
 * <details>, so it works before any script loads), only the pages the staff member's role may see.
 */
export function ConsoleNav({ base, page, role, badges = {} }: { base: string; page: string; role: StaffRole | null; badges?: Partial<Record<StaffPage, StaffBadge>> }) {
  return (
    <div className="flex flex-col gap-px">
      {staffNavFor(role).map((group, index) => {
        const links = group.items.map((item) => (
          <ConsoleLink key={item.page} href={`${base}/${item.page}`} label={t.pages[item.page]} icon={item.icon} current={item.page === page} badge={badges[item.page]} />
        ));
        if (!group.group) return <div key={index} className="flex flex-col gap-px">{links}</div>;
        return (
          <details key={group.group} open className="group/fold">
            <summary className="flex h-8 cursor-pointer list-none items-center justify-between rounded-nav-dense px-3 pt-1.5 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase hover:text-ink-2">
              {t.groups[group.group]}
              <ChevronDown aria-hidden className="size-3.5 -rotate-90 transition-transform motion-quick group-open/fold:rotate-0" strokeWidth={2} />
            </summary>
            <div className="flex flex-col gap-px">{links}</div>
          </details>
        );
      })}
    </div>
  );
}

type StaffShellProps = {
  base: string;
  page: StaffPage;
  person: { name: string; role: string };
  /** The staff member's role, which decides the pages in the sidebar (null: every page, for previews). */
  staffRole?: StaffRole | null;
  badges?: Partial<Record<StaffPage, StaffBadge>>;
  children?: ReactNode;
};

/**
 * The staff console's frame (admin mockups X01): a 248 px grouped sidebar and a 64 px top bar with a
 * 40 px search pill and the bell; desktop first, with the sidebar in a menu on smaller screens.
 */
export function StaffShell({ base, page, person, staffRole = null, badges, children }: StaffShellProps) {
  const Icon = shellIcons.dashboard;
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-staff">
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-line bg-surface px-3 pt-4.5 pb-3.5 lg:flex">
        <Logo variant="primary-green" alt={messages.site.homeLabel} className="mx-3 mt-0.5 h-6.5 self-start" />
        <span className="px-3 pt-1 pb-2 text-caption font-semibold text-green-700">{t.console}</span>
        <nav aria-label={messages.shell.mainNav}>
          <ConsoleNav base={base} page={page} role={staffRole} badges={badges} />
        </nav>
        <div className="mt-auto flex flex-col gap-px border-t border-line pt-3">
          <ConsoleLink href={`${base}/playbooks`} label={t.pages.playbooks} icon="book" current={page === "playbooks"} />
          <ConsoleLink href={`${base}/help`} label={t.pages.help} icon="help" current={page === "help"} />
          <p className="px-3 pt-2 text-body-sm font-semibold">
            {person.name}
            <small className="block text-caption font-normal text-ink-3">{person.role}</small>
          </p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-15 items-center gap-3 border-b border-line bg-surface px-4 lg:h-16 lg:px-7">
          <button type="button" popoverTarget="staff-menu" aria-label={messages.site.nav.menu} className="grid size-11 place-items-center rounded-pill border border-line text-ink-2 lg:hidden">
            <Menu aria-hidden className="size-5" strokeWidth={1.75} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-title-3 text-ink lg:hidden">{t.pages[page]}</h1>
          <Link
            href={`${base}/overview`}
            className="hidden h-10 max-w-115 flex-[0_1_460px] items-center gap-2.5 rounded-pill border border-line bg-paper px-3.5 text-body-sm text-ink-3 lg:flex"
          >
            <Search aria-hidden className="size-4.5 shrink-0" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate">{t.search}</span>
            <kbd aria-hidden className="rounded-md border border-control-off bg-surface px-1.5 py-px font-sans text-micro font-semibold text-ink-3">
              /
            </kbd>
          </Link>
          <Link href={`${base}/work`} aria-label={messages.shell.notifications} className="ml-auto grid size-11 shrink-0 place-items-center rounded-pill border border-line bg-surface text-ink-2 lg:size-10">
            <Bell aria-hidden className="size-5" strokeWidth={1.75} />
          </Link>
        </header>
        <div id="staff-menu" popover="auto" className="inset-auto top-16 left-4 m-0 max-h-[80dvh] w-72 overflow-y-auto rounded-callout border border-line bg-surface p-3 shadow-floating">
          <ConsoleNav base={base} page={page} role={staffRole} badges={badges} />
        </div>
        <main className="w-full min-w-0 px-4 pt-4 pb-10 lg:px-8 lg:pt-6.5">
          <h1 className="mb-5 hidden text-console-title text-ink lg:block">{t.pages[page]}</h1>
          {children ?? (
            <section className="rounded-card border border-line bg-surface">
              <EmptyState title={t.pages[page]} art={<Icon aria-hidden className="size-10 text-green-700" strokeWidth={1.5} />}>
                {t.empty}
              </EmptyState>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
