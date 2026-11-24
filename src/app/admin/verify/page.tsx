import { requireStaffStep } from "@/features/staff/gate";
import { StaffCard } from "@/features/staff/staff-card";
import { VerifyForm } from "@/features/staff/staff-forms";
import { staffMetadata, StaffSuspense } from "@/features/staff/staff-page";
import messages from "@/messages/en.json";

export const metadata = staffMetadata;
const t = messages.auth.staff;

// Every later sign-in: after the email code, the authenticator code (X-00 "Every later sign-in").
async function Verify() {
  await requireStaffStep("verify", "/admin/verify");
  return (
    <StaffCard eyebrow={t.eyebrow} title={t.verify.title} text={t.verify.text}>
      <VerifyForm />
    </StaffCard>
  );
}

export default function VerifyPage() {
  return (
    <StaffSuspense>
      <Verify />
    </StaffSuspense>
  );
}
