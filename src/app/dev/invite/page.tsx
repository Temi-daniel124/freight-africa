import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { InviteFrame, InviteView } from "@/features/org/invite-view";

export const metadata: Metadata = { title: "Invite preview", robots: { index: false, follow: false } };

// Preview only: every state of the invite page (A-07).
export default function DevInvitePage() {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  const open = { orgName: "Musa Transport", role: "driver", inviter: "Musa", state: "open" };
  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 bg-paper px-4 py-8">
      <Logo variant="stacked-green" className="h-20" />
      <InviteFrame>
        <InviteView invite={open} token="preview" signedIn={false} />
      </InviteFrame>
      <InviteFrame>
        <InviteView invite={{ ...open, orgName: "Okafor Foods Ltd", role: "booker", inviter: "Tunde" }} token="preview" signedIn />
      </InviteFrame>
      <InviteFrame>
        <InviteView invite={{ ...open, state: "expired" }} token="preview" signedIn />
      </InviteFrame>
      <InviteFrame>
        <InviteView invite={{ ...open, state: "used" }} token="preview" signedIn />
      </InviteFrame>
      <InviteFrame>
        <InviteView invite={null} token="preview" signedIn={false} />
      </InviteFrame>
    </main>
  );
}
