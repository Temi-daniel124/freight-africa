import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { DriveSwitch } from "./drive-switch";

const t = messages.settings;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
      <h2 className="text-title-3 text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** A-10 Settings (ux-public-and-auth.md), inside any shell. */
export async function SettingsPage({ viewer }: { viewer: Promise<Viewer> }) {
  const { orgId } = await viewer;
  const supabase = await supabaseServer();
  const { data: rows } = await supabase.rpc("my_accounts");
  const active = (rows ?? []).find((row) => row.org_id === orgId);
  const canDrive = active?.kind === "transporter" && (active.role === "owner" || active.role === "manager");
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4">
      {canDrive && orgId ? (
        <Section title={t.driving.title}>
          <DriveSwitch orgId={orgId} drives={!!active?.is_driver} />
        </Section>
      ) : null}
    </div>
  );
}
