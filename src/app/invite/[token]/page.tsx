import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteFrame, InviteView } from "@/features/org/invite-view";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.org.invite.title, robots: { index: false, follow: false } };

// A-07: a team or driver invite. Its details are readable before sign-in; accepting needs the person it
// was sent to, signed in (accept_invite checks their confirmed phone or email).
async function Invite({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const supabase = await supabaseServer();
  const [{ data: rows }, { data: claims }] = await Promise.all([supabase.rpc("invite_details", { p_token: token }), supabase.auth.getClaims()]);
  const row = rows?.[0];
  const invite = row ? { orgName: row.org_name, role: row.role, inviter: row.invited_by_first_name, state: row.state } : null;
  return <InviteView invite={invite} token={token} signedIn={Boolean(claims?.claims)} />;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 bg-paper px-4 py-8 lg:justify-center">
      <Logo variant="stacked-green" className="h-20" priority />
      <InviteFrame>
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <Invite params={params} />
        </Suspense>
      </InviteFrame>
    </main>
  );
}
