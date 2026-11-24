import { requireStaffStep } from "@/features/staff/gate";
import { StaffCard } from "@/features/staff/staff-card";
import { EnrollFlow } from "@/features/staff/staff-forms";
import { staffMetadata, StaffSuspense } from "@/features/staff/staff-page";
import messages from "@/messages/en.json";

export const metadata = staffMetadata;
const t = messages.auth.staff.setup;

// X-00 step 3: two-step sign-in is required before anything in the console opens.
async function Setup() {
  await requireStaffStep("enroll", "/admin/setup");
  return (
    <StaffCard eyebrow={t.step} title={t.title} text={t.text}>
      <EnrollFlow />
    </StaffCard>
  );
}

export default function SetupPage() {
  return (
    <StaffSuspense>
      <Setup />
    </StaffSuspense>
  );
}
