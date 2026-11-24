import Link from "next/link";
import { redirect } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { staffGate } from "@/features/staff/gate";
import { StaffCard } from "@/features/staff/staff-card";
import { staffMetadata, StaffSuspense } from "@/features/staff/staff-page";
import { appHref } from "@/lib/hosts";
import messages from "@/messages/en.json";

export const metadata = staffMetadata;
const t = messages.auth.staff;

// The staff console's front door (ux-admin X-00, D033): each person is sent to the step they're on.
async function Entry() {
  const gate = await staffGate("/admin");
  if (gate.step === "enroll") redirect("/admin/setup");
  if (gate.step === "verify") redirect("/admin/verify");
  if (gate.step === "code") redirect("/admin/staff-code");
  if (gate.step === "ready") redirect("/admin/work");
  return (
    <StaffCard eyebrow={t.eyebrow} title={t.notStaffTitle} text={t.notStaffText.replace("{who}", gate.email || gate.name)}>
      <div className="flex flex-col gap-3">
        <Link href={appHref("/app")} className={buttonVariants({ className: "w-full" })}>
          {t.toApp}
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="secondary" className="w-full">
            {t.signOut}
          </Button>
        </form>
      </div>
    </StaffCard>
  );
}

export default function AdminPage() {
  return (
    <StaffSuspense>
      <Entry />
    </StaffSuspense>
  );
}
