import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamView } from "@/features/org/team-page";
import { AppShell, ShellContent, ShellTopBar } from "@/features/shell/app-shell";
import { shells } from "@/features/shell/config";
import { initials, type Viewer } from "@/features/shell/viewer";

export const metadata: Metadata = { title: "Team preview", robots: { index: false, follow: false } };

// Preview only: the slice 4 Team screen (S-20) with sample people, as the owner of a sender business sees
// it. Real data comes from team_members() and the invites table.
export default function DevTeamPage() {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  const config = shells.shipper;
  const viewer: Promise<Viewer> = Promise.resolve({
    firstName: "Adaeze",
    isDemo: false,
    fullName: "Adaeze Okafor",
    account: "Okafor Foods Ltd",
    accountInitials: initials("Okafor Foods Ltd"),
    role: "Sender · Okafor Foods Ltd",
    contact: "adaeze@okaforfoods.ng",
    unread: 0,
    orgId: "preview",
    accounts: [
      { orgId: "preview", name: "Okafor Foods Ltd", label: "Sender", href: "/dev/team", active: true },
      { orgId: "preview-2", name: "Okafor Haulage", label: "Truck owner", href: "/dev/home?role=owner", active: false },
    ],
  });
  return (
    <AppShell config={config} viewer={viewer} current={`${config.base}/team`}>
      <ShellTopBar config={config} viewer={viewer} title="Team" />
      <ShellContent>
        <TeamView
          orgId="preview"
          orgName="Okafor Foods Ltd"
          grantable={["owner", "admin", "booker", "finance", "viewer"]}
          members={[
            { userId: "1", name: "Adaeze Okafor", role: "owner", phone: null, email: "adaeze@okaforfoods.ng", isMe: true },
            { userId: "2", name: "Tunde Bakare", role: "admin", phone: "+2348031234567", email: null, isMe: false },
            { userId: "3", name: "Chioma Eze", role: "booker", phone: null, email: "chioma@okaforfoods.ng", isMe: false },
            { userId: "4", name: "Femi Adeyemi", role: "finance", phone: "+2348091112233", email: null, isMe: false },
          ]}
          invites={[{ id: "i1", phone: "+2348055550101", email: null, role: "booker", expiresAt: "2026-11-27T09:00:00Z" }]}
        />
      </ShellContent>
    </AppShell>
  );
}
