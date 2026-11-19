import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { signOut } from "@/features/auth/actions";
import messages from "@/messages/en.json";
import { pageLabel } from "./app-shell";
import { pageHref, type PageKey, type ShellConfig } from "./config";
import { shellIcons } from "./icons";

// The pages a tab or sidebar item opens before its own slice builds it: the right title in the top bar
// and an honest empty state, never a blank screen.
export function PlaceholderPage({ config, page }: { config: ShellConfig; page: PageKey }) {
  const pageEntry = messages.shell.pages[page];
  const homes = messages.shell.homeEmpty;
  // Each role's home says what will appear there for that role.
  const entry = page === config.home && config.role in homes ? { empty: homes[config.role as keyof typeof homes].title, text: homes[config.role as keyof typeof homes].text } : pageEntry;
  // More (and the driver's and agent's Me) gathers what the phone tabs leave out, and Sign out.
  const gathers = page === "more" || page === "me";
  const extra = gathers ? [...config.sidebar, ...config.footer].filter((item) => !config.tabs.some((tab) => tab.page === item.page)) : [];
  return (
    <div className="flex flex-col gap-5">
      {extra.length ? (
        <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
          {extra.map((item) => {
            const Icon = shellIcons[item.icon];
            return (
              <li key={item.page} className="border-t border-line first:border-t-0">
                <Link href={pageHref(config, item.page)} className="flex h-14 items-center gap-3 px-4 text-body-sm text-ink hover:bg-paper">
                  <Icon aria-hidden className="size-5 text-ink-2" strokeWidth={1.75} />
                  {pageLabel(item.page)}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
      {gathers ? (
        <form action={signOut} className="rounded-tile bg-surface shadow-raised lg:rounded-card">
          <button type="submit" className="flex h-14 w-full items-center px-4 text-body-sm text-danger">
            {messages.shell.account.signOut}
          </button>
        </form>
      ) : (
        <section className="rounded-tile bg-surface shadow-raised lg:rounded-card">
          <EmptyState title={entry.empty}>{entry.text}</EmptyState>
        </section>
      )}
    </div>
  );
}
