import type { Viewer } from "@/features/shell/viewer";
import { PushToggle } from "./push-toggle";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { lockMinutes } from "@/features/auth/unlock";
import { AvatarPicker } from "./avatar-picker";
import { DriveSwitch } from "./drive-switch";
import { SecuritySection } from "./security-section";

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
export async function SettingsPage({ viewer, base }: { viewer: Promise<Viewer>; base: string }) {
  const { orgId, fullName, avatar } = await viewer;
  const supabase = await supabaseServer();
  const { data: rows } = await supabase.rpc("my_accounts");
  const active = (rows ?? []).find((row) => row.org_id === orgId);
  const [{ data: factors }, { data: staff }, minutes] = await Promise.all([supabase.auth.mfa.listFactors(), supabase.rpc("my_staff_role"), lockMinutes()]);
  const twoStep = !!factors?.totp.some((factor) => factor.status === "verified");
  const canDrive = active?.kind === "transporter" && (active.role === "owner" || active.role === "manager");
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4">
      <Section title={t.picture.title}>
        <AvatarPicker name={fullName} current={avatar ? (avatar.split("/").pop()?.replace(".webp", "") ?? null) : null} />
      </Section>
      {canDrive && orgId ? (
        <Section title={t.driving.title}>
          <DriveSwitch orgId={orgId} drives={!!active?.is_driver} />
        </Section>
      ) : null}
      <PushToggle />
      <Section title={t.security.title}>
        <SecuritySection back={`${base}/settings`} twoStep={twoStep} staff={!!staff} lockMinutes={minutes} changed={false} />
      </Section>
    </div>
  );
}
