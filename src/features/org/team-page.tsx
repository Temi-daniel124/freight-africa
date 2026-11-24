import { PinLinkButton } from "@/features/auth/pin-link-button";
import { StatusChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { initials, type Viewer } from "@/features/shell/viewer";
import { formatNigerianPhone } from "@/lib/phone";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { revokeInvite } from "./actions";
import { InviteSheet, MemberSheet } from "./team-sheets";

const t = messages.org.team;
type Role = keyof typeof messages.org.roles;

const showContact = (phone: string | null, email: string | null) => (phone ? `+234 ${formatNigerianPhone(phone)}` : (email ?? ""));

const lagosDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(new Date(iso));

/**
 * S-20 (senders) and T-16 (truck owners): the team, open invites, and inviting someone. What each person
 * may do comes from the database (org_permissions, team_members); this page only hides what they can't.
 */
export async function TeamPage({ viewer }: { viewer: Promise<Viewer> }) {
  const v = await viewer;
  if (!v.orgId) {
    return (
      <section className="rounded-tile bg-surface shadow-raised lg:rounded-card">
        <EmptyState title={t.emptyTitle}>{t.noOrg}</EmptyState>
      </section>
    );
  }
  const org = v.orgId;
  const supabase = await supabaseServer();
  const [{ data: organisation }, { data: members }, { data: permissions }, { data: myRole }, { data: invites }] = await Promise.all([
    supabase.from("organizations").select("name, kind").eq("id", org).maybeSingle(),
    supabase.rpc("team_members", { p_org: org }),
    supabase.rpc("org_permissions", { p_org: org }),
    supabase.rpc("member_role", { p_org: org }),
    // RLS shows only the invites this person could send themselves.
    supabase.from("invites").select("id, phone, email, role_payload, expires_at").eq("org_id", org).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
  ]);
  if (!organisation) return null;
  const can = new Set(permissions ?? []);
  // The roles this person may give (the database checks again on every action).
  const grantable: Role[] =
    organisation.kind === "shipper"
      ? can.has("manage_team")
        ? [...(myRole === "owner" ? (["owner"] as Role[]) : []), "admin", "booker", "finance", "viewer"]
        : []
      : [...(can.has("manage_managers") ? (["owner", "manager"] as Role[]) : []), ...(can.has("manage_drivers") ? (["driver"] as Role[]) : [])];
  return (
    <TeamView
      orgId={org}
      orgName={organisation.name}
      grantable={grantable}
      members={(members ?? []).map((m) => ({ userId: m.user_id, name: m.full_name, role: m.role as Role, phone: m.phone, email: m.email, isMe: m.is_me }))}
      invites={(invites ?? []).map((i) => {
        const payload = i.role_payload as { shipper_role?: Role; transporter_role?: Role };
        return { id: i.id, phone: i.phone, email: i.email, role: payload.shipper_role ?? payload.transporter_role ?? null, expiresAt: i.expires_at };
      })}
    />
  );
}

export type TeamMember = { userId: string; name: string | null; role: Role; phone: string | null; email: string | null; isMe: boolean };
export type TeamInvite = { id: string; phone: string | null; email: string | null; role: Role | null; expiresAt: string };
type TeamViewProps = { orgId: string; orgName: string; grantable: Role[]; members: TeamMember[]; invites: TeamInvite[] };

/** The Team screen itself, from data the server has already checked (also shown on /dev/team). */
export function TeamView({ orgId: org, orgName, grantable, members, invites }: TeamViewProps) {
  const inviteRoles = grantable.filter((role) => role !== "owner");
  const organisation = { name: orgName };
  const owners = members.filter((member) => member.role === "owner").length;
  const people = (members.length === 1 ? t.onePerson : t.people).replace("{n}", String(members.length));
  return (
    <div className="flex w-full flex-col gap-5 lg:max-w-[880px]">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 truncate text-body text-ink-2">
          {organisation.name} · {people}
        </p>
        {inviteRoles.length ? <InviteSheet orgId={org} orgName={organisation.name} roles={inviteRoles} /> : null}
      </div>

      <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
        {members.map((member) => {
          const role = member.role;
          const manageable = grantable.includes(role) || member.isMe;
          return (
            <li key={member.userId} className="grid grid-cols-row items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 lg:px-5 lg:py-3.5">
              <span aria-hidden className="grid size-9 place-items-center rounded-pill bg-green-100 text-label font-bold text-green-700 lg:size-10">
                {initials(member.name ?? "")}
              </span>
              <div className="min-w-0">
                <p className="flex min-w-0 text-body-sm text-ink">
                  <span className="truncate">{member.name ?? showContact(member.phone, member.email)}</span>
                  {member.isMe ? <span className="shrink-0 font-normal whitespace-pre text-ink-3"> · {t.you}</span> : null}
                </p>
                <p className="mt-0.5 flex min-w-0 items-center gap-2 text-caption font-medium tracking-normal text-ink-3">
                  <StatusChip tone="neutral">{messages.org.roles[role] ?? role}</StatusChip>
                  <span className="min-w-0 truncate">{showContact(member.phone, member.email)}</span>
                </p>
              </div>
              {manageable ? (
                <div className="flex flex-col items-end gap-2">
                  <MemberSheet orgId={org} orgName={organisation.name} userId={member.userId} name={member.name ?? t.you} role={role} roles={grantable} isMe={member.isMe} soleOwner={member.isMe && member.role === "owner" && owners === 1} />
                  {member.phone && !member.email && !member.isMe ? <PinLinkButton orgId={org} memberId={member.userId} name={member.name ?? ""} /> : null}
                </div>
              ) : (
                <span />
              )}
            </li>
          );
        })}
      </ul>

      {invites.length ? (
        <section>
          <h2 className="mb-3 text-body-lg leading-5.5 font-extrabold tracking-close text-ink">{t.pending}</h2>
          <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
            {invites.map((invite) => {
              const role = invite.role;
              return (
                <li key={invite.id} className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 lg:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm text-ink">{showContact(invite.phone, invite.email)}</p>
                    <p className="mt-0.5 text-caption font-medium tracking-normal text-ink-3">
                      {role ? messages.org.roles[role] : ""} · {t.expires.replace("{date}", lagosDate(invite.expiresAt))}
                    </p>
                  </div>
                  <form action={revokeInvite}>
                    <input type="hidden" name="invite" value={invite.id} />
                    <button type="submit" className="min-h-11 rounded-pill px-3 py-2 text-label font-bold tracking-normal text-danger hover:bg-danger-100">
                      {t.revoke}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
