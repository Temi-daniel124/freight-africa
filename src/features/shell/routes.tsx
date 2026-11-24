import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import messages from "@/messages/en.json";
import { AppShell, ShellContent, ShellTopBar } from "./app-shell";
import { shellPages, shells, type PageKey, type ShellRole } from "./config";
import { TeamPage } from "@/features/org/team-page";
import { getMyJoining, type SetupRole } from "@/features/onboarding/setup";
import { SetupChecklist } from "@/features/onboarding/setup-checklist";
import { PlaceholderPage } from "./placeholder-page";
import { ShipperHomeFirstVisit } from "./shipper-home";
import { getViewer, greetingFor } from "./viewer";

// Each role's routes (src/app/app/<base>/...) are one line each, built here from the shell config.

export const shellMetadata: Metadata = { robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

/**
 * /app/haul serves owners and owner-drivers: an owner-driver (an owner who drives, D003) gets the Drive
 * tab. Before the transporter organisation exists, the A-03/T-ON choice (profiles.joining_as) decides.
 */
const resolveRole = cache(async (role: ShellRole): Promise<ShellRole> => {
  // Home and the shells depend on who is signed in, so they render per request (no prerendered clock).
  await connection();
  if (role !== "owner") return role;
  const { joined, kinds } = await getMyJoining();
  return kinds.drives || (!kinds.transporter && joined === "owner_driver") ? "ownerDriver" : "owner";
});

async function ResolvedShell({ role, children }: { role: ShellRole; children: ReactNode }) {
  const config = shells[await resolveRole(role)];
  return (
    <AppShell config={config} viewer={getViewer(config)}>
      {children}
    </AppShell>
  );
}

export function shellLayout(role: ShellRole) {
  return function ShellLayout({ children }: { children: ReactNode }) {
    if (role !== "owner") {
      const config = shells[role];
      return (
        <AppShell config={config} viewer={getViewer(config)}>
          {children}
        </AppShell>
      );
    }
    return (
      <Suspense fallback={<Skeleton className="h-dvh w-full rounded-none" />}>
        <ResolvedShell role={role}>{children}</ResolvedShell>
      </Suspense>
    );
  };
}

const SETUP_ROLES: Partial<Record<ShellRole, SetupRole>> = { shipper: "shipper", owner: "owner", ownerDriver: "ownerDriver", agent: "agent" };

async function HomeContent({ role }: { role: ShellRole }) {
  const resolved = await resolveRole(role);
  const config = shells[resolved];
  const setupRole = SETUP_ROLES[resolved];
  return (
    <div className="flex flex-col gap-5">
      {setupRole ? <SetupChecklist role={setupRole} /> : null}
      {resolved === "shipper" ? <ShipperHomeFirstVisit config={config} /> : <PlaceholderPage config={config} page={config.home} />}
    </div>
  );
}

async function HomeTopBar({ role }: { role: ShellRole }) {
  const config = shells[await resolveRole(role)];
  const viewer = getViewer(config);
  // The clock is read only after the session (connection()) so the page is rendered per request.
  const greeting = viewer.then(() => greetingFor(new Date()));
  return <ShellTopBar config={config} viewer={viewer} greeting={greeting} />;
}

/** The role's first tab: the greeting instead of a title (Gate 4), and "Finish setting up" until setup is done. */
export function shellHome(role: ShellRole) {
  return function ShellHome() {
    return (
      <>
        <Suspense>
          <HomeTopBar role={role} />
        </Suspense>
        <ShellContent>
          <Suspense fallback={<Skeleton className="h-60 w-full rounded-card" />}>
            <HomeContent role={role} />
          </Suspense>
        </ShellContent>
      </>
    );
  };
}

/** A shell's pages; /app/haul also has the owner-driver's (Drive), checked against the person per request. */
function routePages(role: ShellRole): PageKey[] {
  return role === "owner" ? [...new Set([...shellPages(shells.owner), ...shellPages(shells.ownerDriver)])] : shellPages(shells[role]);
}

export function shellParams(role: ShellRole) {
  return function generateStaticParams() {
    return routePages(role).map((page) => ({ page }));
  };
}

function isPage(role: ShellRole, page: string): page is PageKey {
  return (shellPages(shells[role]) as string[]).includes(page);
}

export function shellPageMetadata(role: ShellRole) {
  return async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
    const { page } = await params;
    return { ...shellMetadata, title: (routePages(role) as string[]).includes(page) ? messages.shell.pages[page as PageKey].title : undefined };
  };
}

async function SectionPage({ role, params }: { role: ShellRole; params: Promise<{ page: string }> }) {
  const { page } = await params;
  const resolved = await resolveRole(role);
  if (!isPage(resolved, page)) notFound();
  const config = shells[resolved];
  const viewer = getViewer(config);
  return (
    <>
      <ShellTopBar config={config} viewer={viewer} title={messages.shell.pages[page].title} />
      <ShellContent>{page === "team" ? <TeamPage viewer={viewer} /> : <PlaceholderPage config={config} page={page} />}</ShellContent>
    </>
  );
}

export function shellSection(role: ShellRole) {
  return function ShellSection({ params }: { params: Promise<{ page: string }> }) {
    return (
      <Suspense fallback={<Skeleton className="m-4 h-40 lg:m-8" />}>
        <SectionPage role={role} params={params} />
      </Suspense>
    );
  };
}
