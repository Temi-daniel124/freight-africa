import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { EmptyState } from "@/components/ui/empty-state";
import messages from "@/messages/en.json";
import { staffNav, type StaffPage } from "./config";
import { shellIcons } from "./icons";
import { SidebarLinks } from "./nav-links";

const t = messages.shell.staff;

function Groups({ base }: { base: string }) {
  return (
    <div className="flex flex-col gap-4">
      {staffNav.map((group, index) => (
        <div key={group.group ?? index}>
          {group.group ? <p className="mb-1 px-3 text-caption font-bold tracking-caps text-ink-3 uppercase">{t.groups[group.group]}</p> : null}
          <SidebarLinks base={base} current={`${base}/work`} items={group.items.map((item) => ({ href: `${base}/${item.page}`, label: t.pages[item.page], icon: item.icon }))} />
        </div>
      ))}
    </div>
  );
}

type StaffShellProps = { base: string; page: StaffPage; person: { name: string; role: string }; children?: ReactNode };

/**
 * The staff console's frame (ux-admin.md §1): a 260 px grouped sidebar and a 64 px top bar with search
 * and the bell; desktop first, with the sidebar in a menu on smaller screens. Staff sign-in and roles
 * arrive with slice 5, so for now this is shown on the preview only.
 */
export function StaffShell({ base, page, person, children }: StaffShellProps) {
  const Icon = shellIcons.dashboard;
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-staff">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-5 overflow-y-auto border-r border-line bg-surface px-4 py-5 lg:flex">
        <Logo variant="primary-green" alt={messages.site.homeLabel} className="mx-2 my-1 h-8.5 self-start" />
        <nav aria-label={messages.shell.mainNav}>
          <Groups base={base} />
        </nav>
        <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
          <SidebarLinks base={base} items={[{ href: `${base}/playbooks`, label: t.pages.playbooks, icon: "book" }, { href: `${base}/help`, label: t.pages.help, icon: "help" }]} />
          <p className="px-3 py-2 text-body-sm">
            {person.name}
            <small className="block text-caption font-medium tracking-normal text-ink-3">{person.role}</small>
          </p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-15 items-center gap-3 border-b border-line bg-surface px-4 lg:h-16 lg:gap-4 lg:px-8">
          <button type="button" popoverTarget="staff-menu" aria-label={messages.site.nav.menu} className="grid size-10 place-items-center rounded-pill border border-line text-ink-2 lg:hidden">
            <Menu aria-hidden className="size-5" strokeWidth={1.75} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lead leading-6 font-extrabold tracking-close text-ink lg:flex-none lg:text-title-2 lg:font-extrabold">{t.pages[page]}</h1>
          <Link href={`${base}/overview`} className="mx-auto hidden h-11 max-w-130 flex-1 items-center gap-2.5 rounded-pill border border-line bg-paper px-4 text-body-sm font-normal text-ink-3 lg:flex">
            <Search aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{t.search}</span>
          </Link>
          <Link href={`${base}/work`} aria-label={messages.shell.notifications} className="grid size-10 shrink-0 place-items-center rounded-pill border border-line bg-surface text-ink-2 lg:size-11">
            <Bell aria-hidden className="size-5" strokeWidth={1.75} />
          </Link>
        </header>
        <div id="staff-menu" popover="auto" className="inset-auto top-16 left-4 m-0 max-h-[80dvh] w-72 overflow-y-auto rounded-inner border border-line bg-surface p-3 shadow-floating">
          <Groups base={base} />
        </div>
        <main className="mx-auto w-full max-w-316 px-4 pt-4 pb-6 lg:px-8 lg:pt-7 lg:pb-12">
          {children ?? (
            <section className="rounded-tile bg-surface shadow-raised lg:rounded-card">
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
