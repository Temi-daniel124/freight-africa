import { requireStaffStep } from "@/features/staff/gate";
import { StaffCard } from "@/features/staff/staff-card";
import { RecoverForm } from "@/features/staff/staff-forms";
import { staffMetadata, StaffSuspense } from "@/features/staff/staff-page";
import messages from "@/messages/en.json";

export const metadata = staffMetadata;
const t = messages.auth.staff;

// Lost authenticator (X-00 States): a backup code removes it so a new one can be linked.
async function Recover() {
  await requireStaffStep("verify", "/admin/recover");
  return (
    <StaffCard eyebrow={t.eyebrow} title={t.recover.title} text={t.recover.text}>
      <RecoverForm />
    </StaffCard>
  );
}

export default function RecoverPage() {
  return (
    <StaffSuspense>
      <Recover />
    </StaffSuspense>
  );
}
