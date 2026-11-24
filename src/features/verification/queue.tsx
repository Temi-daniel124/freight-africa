import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { DecideForm } from "./decide-form";

const t = messages.shell.staff.verification;
const idTypes = messages.onboarding.identity.idTypes;

const when = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

/**
 * The identity checks waiting for a decision, oldest first (ux-admin verification queue; D039 demo
 * provider). RLS shows them only to staff; the photos open through short-lived links.
 */
export async function VerificationQueue() {
  const supabase = await supabaseServer();
  const { data: sessions } = await supabase
    .from("verification_sessions")
    .select("id, user_id, purpose, id_type, name_on_id, evidence_paths, created_at")
    .eq("status", "needs_review")
    .order("created_at", { ascending: true })
    .limit(50);
  if (!sessions?.length) {
    return <p className="rounded-tile bg-surface p-6 text-body text-ink-2 shadow-raised lg:rounded-card">{t.empty}</p>;
  }
  // SECURITY.md §11: opening someone's ID photo is logged, with the reason.
  await Promise.all(sessions.map((s) => supabase.rpc("log_identity_photo_view", { p_session: s.id, p_reason: "verification review" })));
  const [{ data: people }, { data: links }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").in("id", [...new Set(sessions.map((s) => s.user_id))]),
    supabase.storage.from("verification").createSignedUrls(sessions.flatMap((s) => s.evidence_paths), 600),
  ]);
  const nameOf = new Map((people ?? []).map((p) => [p.id, p.full_name || p.email || ""]));
  const urlOf = new Map((links ?? []).map((l) => [l.path, l.signedUrl]));
  return (
    <ul className="flex flex-col gap-4">
      {sessions.map((s) => {
        const name = nameOf.get(s.user_id) ?? "";
        const photo = s.evidence_paths[0] ? urlOf.get(s.evidence_paths[0]) : undefined;
        return (
          <li key={s.id} className="grid gap-5 rounded-tile bg-surface p-5 shadow-raised lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:rounded-card lg:p-6">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={t.photoAlt.replace("{name}", name)} className="aspect-[3/2] w-full rounded-inner border border-line bg-paper object-contain" />
            ) : (
              <div className="aspect-[3/2] w-full rounded-inner bg-paper" />
            )}
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-caption font-bold tracking-caps text-ink-3 uppercase">{t.purposes[s.purpose as keyof typeof t.purposes]}</p>
                <h2 className="text-title-2 text-ink">{name}</h2>
                <p className="text-body-sm text-ink-3">{t.submitted.replace("{when}", when.format(new Date(s.created_at)))}</p>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
                <dt className="text-ink-3">{t.nameOnId}</dt>
                <dd className="font-semibold text-ink">{s.name_on_id}</dd>
                <dt className="text-ink-3">{t.accountName}</dt>
                <dd className="text-ink">{name}</dd>
                <dt className="text-ink-3">{t.idType}</dt>
                <dd className="text-ink">{s.id_type ? idTypes[s.id_type as keyof typeof idTypes] : ""}</dd>
              </dl>
              <DecideForm session={s.id} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
