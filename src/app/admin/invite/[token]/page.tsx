import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/ui/button";
import { StaffCard } from "@/features/staff/staff-card";
import { InviteForm } from "@/features/staff/staff-forms";
import { staffMetadata, StaffSuspense } from "@/features/staff/staff-page";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

export const metadata = staffMetadata;
const t = messages.auth.staff;

// X-00 step 1: the invite link from the email. Only the role and the invite's state are shown before sign-in.
async function Invite({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const supabase = await supabaseServer();
  const [{ data: rows }, { data: claims }] = await Promise.all([supabase.rpc("staff_invite_details", { p_token: token }), supabase.auth.getClaims()]);
  const invite = rows?.[0];
  if (!invite || invite.state !== "open") {
    return <StaffCard eyebrow={t.eyebrow} title={t.invite.title} text={invite?.state === "expired" ? t.invite.expired : t.invite.used} />;
  }
  const role = t.roles[invite.role];
  const next = `/admin/invite/${encodeURIComponent(token)}`;
  return (
    <StaffCard eyebrow={t.eyebrow} title={t.invite.title} text={t.invite.text}>
      <p className="rounded-inner bg-paper px-4 py-3 text-body font-semibold text-ink">{t.invite.role.replace("{role}", role)}</p>
      {claims?.claims ? (
        <InviteForm token={token} />
      ) : (
        <Link href={`/auth?next=${encodeURIComponent(next)}`} className={buttonVariants({ className: "w-full" })}>
          {t.invite.continue}
        </Link>
      )}
    </StaffCard>
  );
}

export default function StaffInvitePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <StaffSuspense>
      <Invite params={params} />
    </StaffSuspense>
  );
}
