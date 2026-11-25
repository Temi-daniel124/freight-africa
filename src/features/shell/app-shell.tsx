import { Bell, Check, ChevronDown, Command, Download, Search } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/features/auth/actions";
import { switchAccount } from "@/features/org/actions";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { pageHref, type PageKey, type ShellConfig } from "./config";
import { shellIcons } from "./icons";
import { BottomTabs, SidebarLinks, type LinkItem } from "./nav-links";
import { SearchShortcut } from "./search-shortcut";
import { initials, type Viewer } from "./viewer";

const t = messages.shell;

export function pageLabel(page: PageKey) {
  const entry = t.pages[page];
  return "nav" in entry ? entry.nav : entry.title;
}

function links(config: ShellConfig, items: ShellConfig["tabs"], badgeHome = false): LinkItem[] {
  return items.map((item) => ({
    href: pageHref(config, item.page),
    label: pageLabel(item.page),
    icon: item.icon,
    raised: "raised" in item ? item.raised : undefined,
    badge: badgeHome && item.page === config.home,
  }));
}

function Avatar({ text, src, className }: { text: string; src?: string | null; className?: string }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center overflow-hidden rounded-pill bg-green-100 text-label font-semibold text-green-700", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small local 3D faces (D045) */}
      {src ? <img src={src} alt="" className="size-full object-cover" /> : text}
    </span>
  );
}

/** The signed-in person at the bottom of the sidebar. */
async function Person({ viewer }: { viewer: Promise<Viewer> }) {
  const v = await viewer;
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 text-body-sm">
      <Avatar text={initials(v.fullName)} src={v.avatar} />
      <span className="min-w-0">
        <span className="block truncate">{v.fullName}</span>
        <small className="block truncate text-caption font-medium tracking-normal text-ink-3">{v.roleName}</small>
      </span>
    </div>
  );
}

/** D039: every page of a demo account says so, so nobody mistakes demo trips or money for real ones. */
async function DemoStrip({ viewer }: { viewer: Promise<Viewer> }) {
  const v = await viewer;
  if (!v.isDemo) return null;
  return (
    <p role="note" className="bg-warning-100 px-4 py-2 text-center text-label font-semibold text-warning lg:px-8">
      {t.demo}
    </p>
  );
}

type AppShellProps = {
  config: ShellConfig;
  viewer: Promise<Viewer>;
  children: ReactNode;
  homeBadge?: boolean;
  /** Previews (/dev/home) live at another address; this says which shell page they stand for. */
  current?: string;
};

/**
 * The frame every app page sits in (Gate 4): desktop sidebar on the left, phone tabs at the bottom.
 * Each page renders its own top bar (ShellTopBar) because only the page knows its title.
 */
export function AppShell({ config, viewer, children, homeBadge = false, current }: AppShellProps) {
  const action = config.action;
  const ActionIcon = action ? shellIcons[action.icon] : null;
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-shell">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-5 border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link href={config.base} aria-label={messages.site.homeLabel} className="mx-2 my-1 self-start rounded-nav">
          <Logo variant="primary-green" alt="" className="h-8.5" />
        </Link>
        {action && ActionIcon ? (
          <Link href={pageHref(config, action.page)} className={cn(buttonVariants({ size: "md" }), "w-full")}>
            <ActionIcon aria-hidden strokeWidth={1.75} />
            {t.pages[action.page].title}
          </Link>
        ) : null}
        <nav aria-label={t.mainNav} className="min-h-0 overflow-y-auto">
          <SidebarLinks items={links(config, config.sidebar)} base={config.base} current={current} />
        </nav>
        <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
          <SidebarLinks items={links(config, config.footer)} base={config.base} current={current} />
          <InstallAppLink />
          <Suspense fallback={<Skeleton className="mx-3 my-2 h-9" />}>
            <Person viewer={viewer} />
          </Suspense>
        </div>
      </aside>
      <div className="pb-tabs min-w-0 lg:pb-0">
        <Suspense>
          <DemoStrip viewer={viewer} />
        </Suspense>
        {children}
      </div>
      <BottomTabs items={links(config, config.tabs, homeBadge)} base={config.base} label={t.mainNav} large={config.largeTabs} current={current} />
    </div>
  );
}

/** One role's phone tabs drawn in place, for the component gallery. */
export function ShellTabsPreview({ config }: { config: ShellConfig }) {
  return <BottomTabs items={links(config, config.tabs)} base={config.base} label={t.mainNav} large={config.largeTabs} inline />;
}

/** "Good morning, Adaeze" (desktop) or "Good morning / Adaeze" (phone). */
async function Greeting({ viewer, greeting, phone }: { viewer: Promise<Viewer>; greeting: Promise<string>; phone?: boolean }) {
  const [v, hello] = await Promise.all([viewer, greeting]);
  if (phone) {
    return (
      <p className="min-w-0 flex-1 text-body font-medium text-ink-2">
        {hello}
        {v.firstName ? <b className="block truncate text-body-lg leading-5 font-semibold text-ink">{v.firstName}</b> : null}
      </p>
    );
  }
  return (
    <p className="min-w-0 shrink truncate text-control font-medium whitespace-nowrap text-ink-2">
      {hello}
      {v.firstName ? (
        <>
          , <b className="font-semibold text-ink">{v.firstName}</b>
        </>
      ) : null}
    </p>
  );
}

function Bell_({ href, unread, size }: { href: string; unread: number; size: "md" | "sm" }) {
  const label = unread ? `${t.notifications}, ${t.unread.replace("{count}", String(unread))}` : t.notifications;
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "relative grid size-11 shrink-0 place-items-center rounded-pill border border-line bg-surface text-ink-2 transition-colors hover:bg-paper",
        size === "md" ? "" : "",
      )}
    >
      <Bell aria-hidden className="size-5" strokeWidth={1.75} />
      {unread ? (
        <span aria-hidden className="tabular absolute -top-1 -right-1 grid h-4.5 min-w-4.5 place-items-center rounded-pill bg-danger px-1.25 text-micro font-semibold text-white ring-2 ring-surface">
          {unread}
        </span>
      ) : null}
    </Link>
  );
}

async function UnreadBell({ viewer, href, size }: { viewer: Promise<Viewer>; href: string; size: "md" | "sm" }) {
  const v = await viewer;
  return <Bell_ href={href} unread={v.unread} size={size} />;
}

/**
 * The account switcher (A-09). Organisations arrive with slice 4; until then it shows the person's own
 * account, Settings and Sign out. A native popover: Escape and a click outside close it.
 */
async function AccountMenu({ viewer, settingsHref, id, phone }: { viewer: Promise<Viewer>; settingsHref: string; id: string; phone?: boolean }) {
  const v = await viewer;
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={phone ? t.account.open : undefined}
        className={cn(
          "flex shrink-0 items-center rounded-pill bg-surface text-body-sm transition-colors hover:bg-paper",
          phone ? "size-11 justify-center" : "h-11 min-w-0 gap-2.5 border border-line pr-3 pl-1.5",
        )}
      >
        <Avatar text={initials(v.fullName)} src={v.avatar} className={phone ? undefined : "size-8 text-caption font-semibold tracking-normal"} />
        {phone ? null : (
          <>
            <span className="max-w-40 min-w-0 truncate">{v.account}</span>
            <ChevronDown aria-hidden className="size-4 text-ink-3" strokeWidth={1.75} />
          </>
        )}
      </button>
      <div
        id={id}
        popover="auto"
        className={cn(
          "inset-auto m-0 w-72 rounded-inner border border-line bg-surface p-2 text-ink shadow-floating",
          phone ? "top-16 left-4" : "top-17 right-8",
        )}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar text={initials(v.fullName)} src={v.avatar} />
          <div className="min-w-0">
            <p className="truncate text-body-sm">{v.fullName}</p>
            {v.contact ? (
              <>
                <p className="text-caption font-medium tracking-normal text-ink-3">{t.account.signedInAsLabel}</p>
                <p className="truncate text-caption font-medium tracking-normal text-ink-2">{v.contact}</p>
              </>
            ) : null}
          </div>
        </div>
        {/* A-09: every business with its type and role, a tick on the active one; choosing one opens its shell. */}
        {v.accounts.length ? (
          <ul className="mt-1 flex flex-col border-t border-line pt-1">
            {v.accounts.map((account) => (
              <li key={account.orgId}>
                <form action={switchAccount}>
                  <input type="hidden" name="org" value={account.orgId} />
                  <button type="submit" aria-current={account.active ? "true" : undefined} className="flex min-h-11 w-full items-center gap-3 rounded-nav px-3 py-2 text-left hover:bg-paper">
                    <Avatar text={initials(account.name)} className="size-8 text-caption font-semibold tracking-normal" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm">{account.name}</span>
                      <span className="block truncate text-caption font-medium tracking-normal text-ink-3">{account.label}</span>
                    </span>
                    {account.active ? <Check aria-label={messages.org.switcher.current} className="size-4.5 shrink-0 text-green-700" strokeWidth={2.25} /> : null}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-1 flex flex-col border-t border-line pt-1">
          <Link href="/onboarding/role" className="flex h-11 items-center rounded-nav px-3 text-body-sm text-green-700 hover:bg-paper">
            {messages.org.switcher.add}
          </Link>
          <Link href={settingsHref} className="flex h-11 items-center rounded-nav px-3 text-body-sm text-ink-2 hover:bg-paper hover:text-ink">
            {t.account.settings}
          </Link>
          <form action={signOut}>
            <button type="submit" className="flex h-11 w-full items-center rounded-nav px-3 text-body-sm text-danger hover:bg-danger-100">
              {t.account.signOut}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

type TopBarProps = {
  config: ShellConfig;
  viewer: Promise<Viewer>;
  /** Every page but Home shows its title; Home shows the greeting instead (Gate 4). */
  title?: string;
  greeting?: Promise<string>;
};

export function ShellTopBar({ config, viewer, title, greeting }: TopBarProps) {
  const bell = pageHref(config, "notifications");
  const settings = pageHref(config, config.footer.find((item) => item.page === "settings") ? "settings" : "me");
  return (
    <>
      <header className="sticky top-0 z-10 hidden h-16 items-center gap-4 border-b border-line bg-surface px-8 lg:flex">
        {greeting ? (
          <Suspense fallback={<Skeleton className="h-6 w-48" />}>
            <Greeting viewer={viewer} greeting={greeting} />
          </Suspense>
        ) : (
          <h1 className="min-w-0 shrink truncate text-title-2 font-semibold tracking-close text-ink">{title}</h1>
        )}
        {/* Fix 2a: the search pill shrinks first (240 px at least); narrower than that it is an icon button. */}
        <Link href={pageHref(config, "search")} aria-label={t.search} className="ml-auto grid size-11 shrink-0 place-items-center rounded-pill border border-line bg-paper text-ink-2 xl:hidden">
          <Search aria-hidden className="size-5" strokeWidth={1.75} />
        </Link>
        <Link
          href={pageHref(config, "search")}
          className="mx-auto hidden h-11 max-w-130 min-w-60 flex-1 items-center gap-2.5 rounded-pill border border-line bg-paper px-4 text-body-sm font-normal text-ink-3 transition-colors hover:border-line-strong xl:flex"
        >
          <Search aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
          <span className="truncate">{t.search}</span>
          {/* The font has no ⌘, so it is drawn (like ⇄ in CorridorText). */}
          <kbd aria-hidden className="ml-auto inline-flex items-center rounded-md border border-line-strong bg-surface px-2 py-0.5 font-sans text-caption font-semibold tracking-normal text-ink-2">
            <Command className="size-3" strokeWidth={2} />
            {t.searchShortcut}
          </kbd>
        </Link>
        <SearchShortcut href={pageHref(config, "search")} />
        <Suspense fallback={<Bell_ href={bell} unread={0} size="md" />}>
          <UnreadBell viewer={viewer} href={bell} size="md" />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-11 w-44 rounded-pill" />}>
          <AccountMenu viewer={viewer} settingsHref={settings} id="account-menu-desktop" />
        </Suspense>
      </header>
      <header className="sticky top-0 z-10 flex h-15 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
        <Suspense fallback={<Skeleton className="size-9 rounded-pill" />}>
          <AccountMenu viewer={viewer} settingsHref={settings} id="account-menu-phone" phone />
        </Suspense>
        {greeting ? (
          <Suspense fallback={<Skeleton className="h-10 flex-1" />}>
            <Greeting viewer={viewer} greeting={greeting} phone />
          </Suspense>
        ) : (
          <h1 className="min-w-0 flex-1 truncate text-lead leading-6 font-semibold tracking-close text-ink">{title}</h1>
        )}
        <Suspense fallback={<Bell_ href={bell} unread={0} size="sm" />}>
          <UnreadBell viewer={viewer} href={bell} size="sm" />
        </Suspense>
      </header>
    </>
  );
}

/** The page body under the top bar: 28/32 px padding on desktop, 16 px on phones, 1264 px wide at most. */
export function ShellContent({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-316 px-4 pt-4 pb-6 lg:px-8 lg:pt-7 lg:pb-12", className)}>{children}</main>;
}

/** D045: a small "Install app" item in the sidebar footer (hidden once installed). */
function InstallAppLink() {
  return (
    <a href="/onboarding/install" className="flex h-11 items-center gap-3 rounded-nav px-3 text-body-sm font-semibold text-ink-2 hover:bg-paper hover:text-ink [@media(display-mode:standalone)]:hidden">
      <Download aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
      <span className="truncate">{messages.welcome.install.sidebar}</span>
    </a>
  );
}
