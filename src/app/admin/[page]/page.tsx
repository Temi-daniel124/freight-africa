import { notFound, redirect } from "next/navigation";
import { staffNav, type StaffPage } from "@/features/shell/config";
import { StaffShell } from "@/features/shell/staff-shell";
import { staffGate } from "@/features/staff/gate";
import { staffMetadata, StaffSuspense } from "@/features/staff/staff-page";
import messages from "@/messages/en.json";

export const metadata = staffMetadata;

const PAGES = new Set<string>([...staffNav.flatMap((group) => group.items.map((item) => item.page)), "playbooks", "help"]);

// The console itself: only for staff who have passed two-step sign-in and agreed the staff code. Each
// page fills in with its own slice; the database checks staff rights again on every read (is_staff()).
async function Console({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!PAGES.has(page)) notFound();
  const gate = await staffGate(`/admin/${page}`);
  if (gate.step !== "ready") redirect("/admin");
  const role = gate.role ? messages.auth.staff.roles[gate.role] : "";
  return <StaffShell base="/admin" page={page as StaffPage} person={{ name: gate.name, role }} />;
}

export default function ConsolePage({ params }: { params: Promise<{ page: string }> }) {
  return (
    <StaffSuspense>
      <Console params={params} />
    </StaffSuspense>
  );
}
