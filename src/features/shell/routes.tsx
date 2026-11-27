import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { AppShell, ShellContent, ShellTopBar } from "./app-shell";
import { shellPages, shells, type PageKey, type ShellConfig, type ShellRole } from "./config";
import { TeamPage } from "@/features/org/team-page";
import { BookPage, LoadsPage, PaymentsPage, TripsPage } from "@/features/booking/sections";
import { OwnerTripsPage } from "@/features/booking/owner-trips";
import { DriverTrip } from "@/features/home/driver-trip";
import { OwnerHome } from "@/features/owner/owner-home";
import { OwnerMore } from "@/features/owner/more";
import { DriverMe } from "@/features/driver/me";
import { OwnerEarnings } from "@/features/owner/earnings";
import { OwnerPapers, OwnerTrucks } from "@/features/owner/fleet";
import { SenderHome } from "@/features/home/sender-home";
import { SettingsPage } from "@/features/settings/settings-page";
import { DriversPage } from "@/features/drivers/drivers-page";
import { requireUnlocked } from "@/features/auth/unlock";
import { getMyJoining, type SetupRole } from "@/features/onboarding/setup";
import { SetupChecklist } from "@/features/onboarding/setup-checklist";
import { PlaceholderPage } from "./placeholder-page";
import { SenderHelp, SenderMore, SenderPayments, SenderPlaces, SenderSettings } from "@/features/account/account";
import { ShipperHomeFirstVisit } from "./shipper-home";
import { getViewer, greetingFor, type Viewer } from "./viewer";

// Each role's routes (src/app/app/<base>/...) are one line each, built here from the shell config.

export const shellMetadata: Metadata = { robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

/**
 * /app/haul serves truck owners; an owner or admin with "I drive my own truck" on (is_driver, D043) gets
 * the raised Drive tab.
 */
const resolveRole = cache(async (role: ShellRole): Promise<ShellRole> => {
  // Home and the shells depend on who is signed in, so they render per request (no prerendered clock).
  await connection();
  if (role !== "owner") return role;
  const { kinds } = await getMyJoining();
  return kinds.drives ? "ownerDriver" : "owner";
});

async function ResolvedShell({ role, children }: { role: ShellRole; children: ReactNode }) {
  const config = shells[await resolveRole(role)];
  return (
    <AppShell config={config} viewer={getViewer(config)}>
      {children}
    </AppShell>
  );
}

/** D044: every role's shell opens only after the PIN on this device (and the authenticator code when two-step is on). */
async function PinGate({ base, children }: { base: string; children: ReactNode }) {
  await connection();
  await requireUnlocked(base);
  return <>{children}</>;
}

export function shellLayout(role: ShellRole) {
  return function ShellLayout({ children }: { children: ReactNode }) {
    const base = shells[role].base;
    return (
      <Suspense fallback={<Skeleton className="h-dvh w-full rounded-none" />}>
        <PinGate base={base}>
          {role === "owner" ? (
            <ResolvedShell role={role}>{children}</ResolvedShell>
          ) : (
            <AppShell config={shells[role]} viewer={getViewer(shells[role])}>
              {children}
            </AppShell>
          )}
        </PinGate>
      </Suspense>
    );
  };
}

const SETUP_ROLES: Partial<Record<ShellRole, SetupRole>> = { shipper: "shipper", owner: "owner", ownerDriver: "ownerDriver", agent: "agent", driver: "driver" };

/** D041: once an owner of the sending business is verified, Home says so (owners see the same badge). */
async function VerifiedSender() {
  const viewer = await getViewer(shells.shipper);
  if (!viewer.orgId) return null;
  const { data: verified } = await (await supabaseServer()).rpc("is_verified_sender", { p_org: viewer.orgId });
  if (!verified) return null;
  return (
    <p className="flex items-center gap-1.5 self-start rounded-pill bg-success-100 px-3 py-1.5 text-label font-semibold text-success">
      <BadgeCheck aria-hidden className="size-4" strokeWidth={2} />
      {messages.shell.verifiedSender}
    </p>
  );
}

async function HomeContent({ role }: { role: ShellRole }) {
  const resolved = await resolveRole(role);
  // Pages check the PIN themselves too: layouts don't run again on in-app navigation.
  await requireUnlocked(shells[resolved].base);
  const config = shells[resolved];
  const setupRole = SETUP_ROLES[resolved];
  return (
    <div className="flex flex-col gap-5">
      {resolved === "shipper" ? <VerifiedSender /> : null}
      {setupRole ? <SetupChecklist role={setupRole} /> : null}
      {resolved === "shipper" ? (
        (await getViewer(config)).orgId ? <SenderHome viewer={getViewer(config)} /> : <ShipperHomeFirstVisit config={config} />
      ) : resolved === "owner" || resolved === "ownerDriver" ? (
        <OwnerHome viewer={getViewer(config)} drives={resolved === "ownerDriver"} />
      ) : resolved === "driver" ? (
        <DriverTrip />
      ) : (
        <PlaceholderPage config={config} page={config.home} />
      )}
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

/** The page body for a shell tab; pages not built yet show their placeholder. */
async function sectionBody(page: PageKey, config: ShellConfig, viewer: Promise<Viewer>) {
  const shipper = config.role === "shipper";
  switch (page) {
    case "team":
      return <TeamPage viewer={viewer} />;
    case "trucks":
      return <OwnerTrucks viewer={viewer} />;
    case "documents":
      return <OwnerPapers viewer={viewer} />;
    case "drivers":
      return <DriversPage orgId={(await viewer).orgId} />;
    case "settings":
      return shipper ? <SenderSettings viewer={viewer} /> : <SettingsPage viewer={viewer} base={config.base} />;
    case "me":
      return config.role === "driver" ? <DriverMe viewer={viewer} /> : <SettingsPage viewer={viewer} base={config.base} />;
    case "book":
      return <BookPage viewer={viewer} />;
    case "trips":
      return shipper ? <TripsPage viewer={viewer} /> : <OwnerTripsPage viewer={viewer} />;
    case "payments":
      return shipper ? <SenderPayments viewer={viewer} /> : <PaymentsPage viewer={viewer} />;
    case "more":
      return shipper ? (
        <SenderMore viewer={viewer} />
      ) : config.role === "owner" || config.role === "ownerDriver" ? (
        <OwnerMore viewer={viewer} drives={config.role === "ownerDriver"} />
      ) : (
        <PlaceholderPage config={config} page={page} />
      );
    case "places":
      return shipper ? <SenderPlaces viewer={viewer} /> : <PlaceholderPage config={config} page={page} />;
    case "help":
      return shipper ? <SenderHelp /> : <PlaceholderPage config={config} page={page} />;
    case "loads":
    case "findLoads":
      return <LoadsPage viewer={viewer} />;
    case "earnings":
      return config.role === "agent" ? <PlaceholderPage config={config} page={page} /> : <OwnerEarnings viewer={viewer} />;
    default:
      return <PlaceholderPage config={config} page={page} />;
  }
}

async function SectionPage({ role, params }: { role: ShellRole; params: Promise<{ page: string }> }) {
  const { page } = await params;
  const resolved = await resolveRole(role);
  // Each page checks the PIN itself too: layouts don't run again on in-app navigation (D044).
  await requireUnlocked(shells[resolved].base);
  if (!isPage(resolved, page)) notFound();
  const config = shells[resolved];
  const viewer = getViewer(config);
  // Booking draws its own header and, on phones, covers the tabs (mockups P08, D03).
  if (page === "book") return <>{await sectionBody(page, config, viewer)}</>;
  return (
    <>
      <ShellTopBar config={config} viewer={viewer} title={messages.shell.pages[page].title} />
      <ShellContent>{await sectionBody(page, config, viewer)}</ShellContent>
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

async function SubpageBody({ role, title, flush, children }: { role: ShellRole; title: string; flush?: boolean; children: ReactNode }) {
  const config = shells[await resolveRole(role)];
  await requireUnlocked(config.base);
  const viewer = getViewer(config);
  if (flush) {
    // Full-screen pages (the trip map): no top bar on phones, no padding.
    return (
      <>
        <div className="max-lg:hidden">
          <ShellTopBar config={config} viewer={viewer} title={title} />
        </div>
        <main>{children}</main>
      </>
    );
  }
  return (
    <>
      <ShellTopBar config={config} viewer={viewer} title={title} />
      <ShellContent>{children}</ShellContent>
    </>
  );
}

/** A page deeper than a tab (Add a truck), inside the role's shell with its own title. */
export function ShellSubpage({ role, title, flush, children }: { role: ShellRole; title: string; flush?: boolean; children: ReactNode }) {
  return (
    <Suspense fallback={<Skeleton className="m-4 h-40 lg:m-8" />}>
      <SubpageBody role={role} title={title} flush={flush}>
        {children}
      </SubpageBody>
    </Suspense>
  );
}
