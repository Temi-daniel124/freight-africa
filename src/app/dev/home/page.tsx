import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppShell, ShellContent, ShellTopBar } from "@/features/shell/app-shell";
import { shells, type ShellRole } from "@/features/shell/config";
import { PlaceholderPage } from "@/features/shell/placeholder-page";
import { ShipperHomeFirstVisit, ShipperHomeReturning } from "@/features/shell/shipper-home";
import { StaffShell } from "@/features/shell/staff-shell";
import { initials, type Viewer } from "@/features/shell/viewer";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: "Home preview", robots: { index: false, follow: false } };

const d = messages.devHome;
const roles = ["shipper", "new", "owner", "ownerDriver", "driver", "agent", "staff"] as const;
type PreviewRole = (typeof roles)[number];

function sampleViewer(role: ShellRole): Viewer {
  return {
    firstName: d.viewer.firstName,
    isDemo: false,
    fullName: d.viewer.fullName,
    account: d.viewer.account,
    accountInitials: initials(d.viewer.account),
    role: role === "shipper" ? d.viewer.role : messages.shell.roles[role],
    contact: "adaeze@okaforfoods.ng",
    unread: d.unread,
    orgId: null,
    accounts: [
      { orgId: "preview-1", name: d.viewer.account, label: "Sender", href: "/dev/home", active: true },
      { orgId: "preview-2", name: "Okafor Haulage", label: "Truck owner", href: "/dev/home?role=owner", active: false },
    ],
  };
}

async function Preview({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const asked = (await searchParams).role;
  const role: PreviewRole = (roles as readonly string[]).includes(asked ?? "") ? (asked as PreviewRole) : "shipper";
  const switcher = (
    <nav aria-label={d.otherShells} className="mb-4 flex flex-wrap gap-2 text-caption font-semibold tracking-normal">
      {roles.map((option) => (
        <Link
          key={option}
          href={option === "shipper" ? "/dev/home" : `/dev/home?role=${option}`}
          aria-current={option === role ? "page" : undefined}
          className="rounded-pill border border-line bg-surface px-3 py-1.5 text-ink-2 aria-[current=page]:border-green-700 aria-[current=page]:text-green-700"
        >
          {option === "staff" ? messages.shell.roles.staff : option === "new" ? d.newShipper : messages.shell.roles[option]}
        </Link>
      ))}
    </nav>
  );
  if (role === "staff") {
    return (
      <StaffShell base="/dev/home" page="work" person={{ name: "Chinedu Eze", role: "Operations lead" }}>
        {switcher}
      </StaffShell>
    );
  }
  const shellRole: ShellRole = role === "new" ? "shipper" : role;
  const config = shells[shellRole];
  const viewer = Promise.resolve({ ...sampleViewer(shellRole), unread: role === "new" ? 0 : d.unread });
  // The greeting is fixed here so screenshots don't change with the time of day.
  const greeting = Promise.resolve(messages.shell.greeting.morning);
  return (
    <AppShell config={config} viewer={viewer} homeBadge={role !== "new"} current={config.base}>
      <ShellTopBar config={config} viewer={viewer} greeting={greeting} />
      <ShellContent>
        {role === "shipper" ? null : switcher}
        {role === "shipper" ? (
          <ShipperHomeReturning config={config} data={d} />
        ) : role === "new" ? (
          <ShipperHomeFirstVisit config={config} />
        ) : (
          <PlaceholderPage config={config} page={config.home} />
        )}
      </ShellContent>
    </AppShell>
  );
}

// Preview only: the returning shipper's Home with the Gate 4 target's sample data (?role= shows the other
// shells). The real /app/ship has no trips yet, so it shows the first-visit empty state.
export default function DevHomePage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  return (
    <Suspense>
      <Preview searchParams={searchParams} />
    </Suspense>
  );
}
