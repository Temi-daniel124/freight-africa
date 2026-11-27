import { StatusChip } from "@/components/ui/chip";
import { ApproveButton } from "@/features/money/approve-button";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { DecideButtons, InviteStaff, SettingChange } from "./admin-client";

// X17 approvals, X21 settings, X18 fees, X25 audit log, X24 staff and X20 messages, from the database.
// Reads are checked by RLS (super admins and finance for approvals, super admins for the audit log).

const t = messages.staffAdmin;
const when = (d: string | null) => (d ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(d)) : "—");
const naira = (kobo: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(Math.round(kobo / 100));
const json = (v: unknown) => JSON.stringify(v);
const card = "overflow-x-auto rounded-card border border-line bg-surface";
const th = "px-4 py-3 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase";

async function me() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  return { supabase, id: (data?.claims?.sub as string) ?? "" };
}

function Lead({ children }: { children: string }) {
  return <p className="-mt-4 mb-5 text-body text-ink-2">{children}</p>;
}

export async function StaffApprovals() {
  const { supabase, id } = await me();
  const [{ data: changes }, { data: payouts }, { data: refunds }] = await Promise.all([
    supabase.from("approvals").select("id, kind, subject_id, payload, note, created_at, requested_by, person:requested_by(full_name)").eq("status", "pending").order("created_at"),
    supabase.from("payouts").select("id, amount_kobo, kind, created_at, requested_by, org:org_id(name)").eq("status", "awaiting_approval").order("created_at"),
    supabase.from("refunds").select("id, amount_kobo, created_at, requested_by, reason").eq("status", "awaiting_approval").order("created_at"),
  ]);
  const money = [
    ...(payouts ?? []).map((p) => ({ id: p.id, kind: "payout" as const, amount: p.amount_kobo, at: p.created_at, mine: p.requested_by === id, who: (p.org as { name?: string } | null)?.name ?? "" })),
    ...(refunds ?? []).map((r) => ({ id: r.id, kind: "refund" as const, amount: r.amount_kobo, at: r.created_at, mine: r.requested_by === id, who: r.reason ?? "" })),
  ];
  return (
    <div className="flex flex-col gap-6">
      <Lead>{t.approvals.lead}</Lead>
      <section className="flex flex-col gap-3">
        <h2 className="text-title-3 text-ink">{t.approvals.settings}</h2>
        {changes?.length ? (
          changes.map((a) => {
            const payload = a.payload as { from?: unknown; to?: unknown } | null;
            return (
              <article key={a.id} className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-4">
                <div className="min-w-0">
                  <p className="font-mono text-body-sm font-semibold text-ink">{a.subject_id}</p>
                  <p className="mt-1 text-body-sm text-ink-2">
                    {t.approvals.from} <code className="text-ink">{json(payload?.from)}</code> {t.approvals.to} <code className="text-ink">{json(payload?.to)}</code>
                  </p>
                  <p className="mt-1 text-meta text-ink-3">{[t.approvals.by.replace("{name}", (a.person as { full_name?: string } | null)?.full_name ?? "").replace("{when}", when(a.created_at)), a.note].filter(Boolean).join(" · ")}</p>
                </div>
                {a.requested_by === id ? <p className="text-meta text-ink-3">{t.approvals.yours}</p> : <DecideButtons id={a.id} />}
              </article>
            );
          })
        ) : (
          <p className="text-body text-ink-2">{t.approvals.none}</p>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title-3 text-ink">{t.approvals.money}</h2>
        {money.length ? (
          money.map((m) => (
            <article key={m.id} className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-4">
              <div>
                <p className="text-body font-semibold text-ink">
                  {m.kind === "payout" ? t.approvals.payout : t.approvals.refund} · {naira(m.amount)}
                </p>
                <p className="text-meta text-ink-3">{[m.who, when(m.at)].filter(Boolean).join(" · ")}</p>
              </div>
              {m.mine ? <p className="text-meta text-ink-3">{t.approvals.yours}</p> : <ApproveButton kind={m.kind} id={m.id} />}
            </article>
          ))
        ) : (
          <p className="text-body text-ink-2">{t.approvals.none}</p>
        )}
      </section>
    </div>
  );
}

async function SettingsTable({ filter }: { filter: (key: string, money: boolean) => boolean }) {
  const { supabase } = await me();
  const [{ data: settings }, { data: role }] = await Promise.all([supabase.from("settings").select("key, value, is_money, description, updated_at").order("key"), supabase.rpc("my_staff_role")]);
  const rows = (settings ?? []).filter((s) => filter(s.key, s.is_money));
  return (
    <div className={card}>
      <table className="w-full min-w-[720px] text-left">
        <tbody>
          {rows.map((s) => (
            <tr key={s.key} className="border-b border-line-soft align-top last:border-b-0">
              <td className="px-4 py-3.5">
                <p className="font-mono text-body-sm font-semibold text-ink">{s.key}</p>
                <p className="mt-0.5 max-w-md text-meta text-ink-3">{s.description}</p>
              </td>
              <td className="px-4 py-3.5">
                <code className="block max-w-sm text-body-sm break-all text-ink">{json(s.value)}</code>
                <p className="mt-1 text-caption text-ink-3">{t.settings.by.replace("{when}", when(s.updated_at))}</p>
              </td>
              <td className="px-4 py-3.5 text-right">
                {s.is_money ? <StatusChip tone="warning">{t.settings.money}</StatusChip> : null}
                {role === "super_admin" ? (
                  <div className="mt-2">
                    <SettingChange settingKey={s.key} current={json(s.value)} money={s.is_money} />
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FEE = /(fee|commission|advance|offer|raise|_bps$)/;

export function StaffSettings() {
  return (
    <div className="flex flex-col">
      <Lead>{t.settings.lead}</Lead>
      <SettingsTable filter={(key) => !FEE.test(key)} />
    </div>
  );
}

export function StaffFees() {
  return (
    <div className="flex flex-col">
      <Lead>{t.fees.lead}</Lead>
      <SettingsTable filter={(key) => FEE.test(key)} />
    </div>
  );
}

export async function StaffAudit() {
  const { supabase } = await me();
  const { data: rows } = await supabase.from("audit_log").select("id, actor_role, action, table_name, row_id, new, created_at, person:actor_user_id(full_name)").order("created_at", { ascending: false }).limit(50);
  return (
    <div className="flex flex-col">
      <Lead>{t.audit.lead}</Lead>
      <div className={card}>
        {rows?.length ? (
          <table className="w-full min-w-[820px] text-left text-body-sm">
            <thead className="border-b border-line">
              <tr>
                <th className={th}>{t.audit.when}</th>
                <th className={th}>{t.audit.who}</th>
                <th className={th}>{t.audit.action}</th>
                <th className={th}>{t.audit.what}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const reason = (r.new as { reason?: string; note?: string } | null)?.reason ?? (r.new as { note?: string } | null)?.note;
                return (
                  <tr key={r.id} className="border-b border-line-soft last:border-b-0">
                    <td className="px-4 py-3 whitespace-nowrap text-ink-2">{when(r.created_at)}</td>
                    <td className="px-4 py-3 text-ink">
                      {(r.person as { full_name?: string } | null)?.full_name ?? t.audit.system}
                      <span className="block text-caption text-ink-3">{r.actor_role}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-ink">{r.action}</td>
                    <td className="px-4 py-3 text-ink-2">{[r.table_name, r.row_id?.slice(0, 12), reason].filter(Boolean).join(" · ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-6 py-10 text-center text-body text-ink-2">{t.audit.none}</p>
        )}
      </div>
    </div>
  );
}

export async function StaffTeam() {
  const { supabase } = await me();
  const [{ data: staff }, { data: role }] = await Promise.all([
    supabase.from("staff_members").select("user_id, role, active, staff_code_accepted_at, created_at, person:user_id(full_name, email)").order("created_at"),
    supabase.rpc("my_staff_role"),
  ]);
  const roles = messages.auth.staff.roles;
  return (
    <div className="flex flex-col">
      <div className="-mt-4 mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink-2">{t.team.lead}</p>
        {role === "super_admin" ? <InviteStaff roles={Object.entries(roles).map(([value, label]) => ({ value, label }))} /> : null}
      </div>
      <div className={card}>
        <table className="w-full min-w-[720px] text-left text-body-sm">
          <thead className="border-b border-line">
            <tr>
              <th className={th}>{t.team.name}</th>
              <th className={th}>{t.team.role}</th>
              <th className={th}>{t.team.status}</th>
              <th className={th}>{t.team.joined}</th>
            </tr>
          </thead>
          <tbody>
            {(staff ?? []).map((s) => {
              const person = s.person as { full_name?: string; email?: string } | null;
              return (
                <tr key={s.user_id} className="border-b border-line-soft last:border-b-0">
                  <td className="px-4 py-3 text-ink">
                    <span className="font-semibold">{person?.full_name}</span>
                    <span className="block text-caption text-ink-3">{person?.email}</span>
                  </td>
                  <td className="px-4 py-3 text-ink">{roles[s.role as keyof typeof roles]}</td>
                  <td className="px-4 py-3">
                    <StatusChip tone={s.active ? "success" : "neutral"}>{s.active ? t.team.active : t.team.inactive}</StatusChip>
                    <span className="mt-1 block text-caption text-ink-3">{s.staff_code_accepted_at ? t.team.codeAgreed : t.team.codeNot}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{when(s.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export async function StaffMessages() {
  const { supabase } = await me();
  const { data: templates } = await supabase.from("message_templates").select("code, channel, subject, body").eq("language", "en").order("code").order("channel");
  return (
    <div className="flex flex-col">
      <Lead>{t.messages.lead}</Lead>
      <p className="mb-4 rounded-callout bg-warning-100 px-4 py-3 text-body-sm text-ink">{t.messages.whatsappNote}</p>
      <div className={card}>
        <table className="w-full min-w-[820px] text-left text-body-sm">
          <thead className="border-b border-line">
            <tr>
              <th className={th}>{t.messages.code}</th>
              <th className={th}>{t.messages.channel}</th>
              <th className={th}>{t.messages.text}</th>
              <th className={th}>
                <span className="sr-only">{t.messages.live}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {(templates ?? []).map((m) => (
              <tr key={`${m.code}-${m.channel}`} className="border-b border-line-soft align-top last:border-b-0">
                <td className="px-4 py-3 font-mono text-ink">{m.code}</td>
                <td className="px-4 py-3 text-ink">{m.channel}</td>
                <td className="max-w-lg px-4 py-3 text-ink-2">{[m.subject, m.body].filter(Boolean).join(" — ")}</td>
                <td className="px-4 py-3">
                  <StatusChip tone={m.channel === "whatsapp" ? "warning" : "success"}>{m.channel === "whatsapp" ? t.messages.onHold : t.messages.live}</StatusChip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
