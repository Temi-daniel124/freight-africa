import { notFound, redirect } from "next/navigation";
import { staffNav, staffPageRoles, type StaffPage } from "@/features/shell/config";
import { StaffShell } from "@/features/shell/staff-shell";
import { staffGate } from "@/features/staff/gate";
import { EscrowView, PayoutsView, RefundsView } from "@/features/money/finance-views";
import { FieldTasks } from "@/features/staff/field-tasks";
import { NoAccess, StaffOverview, StaffWork } from "@/features/staff/home";
import { staffMetadata, StaffSuspense } from "@/features/staff/staff-page";
import { BankQueue } from "@/features/verification/bank-queue";
import { FleetQueue } from "@/features/verification/fleet-queue";
import { VerificationQueue } from "@/features/verification/queue";
import messages from "@/messages/en.json";

export const metadata = staffMetadata;

const PAGES = new Set<string>([...staffNav.flatMap((group) => group.items.map((item) => item.page)), "playbooks", "help"]);

// The console itself: only for staff who have passed two-step sign-in and agreed the staff code. Each
// page fills in with its own slice; the database checks staff rights again on every read (is_staff()).
type Search = Promise<Record<string, string | string[] | undefined>>;
const clock = () => Date.now();

async function Console({ params, searchParams }: { params: Promise<{ page: string }>; searchParams: Search }) {
  const { page } = await params;
  const query = await searchParams;
  if (!PAGES.has(page)) notFound();
  const gate = await staffGate(`/admin/${page}`);
  if (gate.step !== "ready") redirect("/admin");
  // A page outside the role's sidebar is not shown at all (the database refuses its data anyway).
  const role = gate.role ? messages.auth.staff.roles[gate.role] : "";
  // X00k: a page outside the role shows "You don't have access to this" (the database refuses its data anyway).
  if (gate.role && !staffPageRoles[page as StaffPage].includes(gate.role))
    return (
      <StaffShell base="/admin" page={page as StaffPage} person={{ name: gate.name, role }} staffRole={gate.role} bare>
        <NoAccess page={page as StaffPage} />
      </StaffShell>
    );
  // Pages with their own content so far; the rest show the console's placeholder until their slice.
  const v = messages.shell.staff.verification;
  const content =
    page === "verification" ? (
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-title-2 text-ink">{v.peopleTitle}</h2>
          <VerificationQueue />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-title-2 text-ink">{v.trucksTitle}</h2>
          <FleetQueue />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-title-2 text-ink">{v.bankTitle}</h2>
          <BankQueue />
        </section>
      </div>
    ) : page === "work" ? (
      <StaffWork name={gate.name} filter={typeof query.f === "string" ? query.f : "all"} now={clock()} />
    ) : page === "overview" ? (
      <StaffOverview now={clock()} />
    ) : page === "tasks" ? (
      <FieldTasks />
    ) : page === "escrow" ? (
      <EscrowView />
    ) : page === "payouts" ? (
      <PayoutsView />
    ) : page === "refunds" ? (
      <RefundsView />
    ) : undefined;
  return (
    <StaffShell base="/admin" page={page as StaffPage} person={{ name: gate.name, role }} staffRole={gate.role}>
      {content}
    </StaffShell>
  );
}

export default function ConsolePage({ params, searchParams }: { params: Promise<{ page: string }>; searchParams: Search }) {
  return (
    <StaffSuspense>
      <Console params={params} searchParams={searchParams} />
    </StaffSuspense>
  );
}
