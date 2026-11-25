import { requireStaffStep } from "@/features/staff/gate";
import { StaffCard } from "@/features/staff/staff-card";
import { StaffCodeForm } from "@/features/staff/staff-forms";
import { staffMetadata, StaffSuspense } from "@/features/staff/staff-page";
import messages from "@/messages/en.json";

export const metadata = staffMetadata;
const t = messages.auth.staff.code;

// X-00 step 4: the staff code, once.
async function Code() {
  await requireStaffStep("code", "/admin/staff-code");
  return (
    <StaffCard eyebrow={t.step} title={t.title}>
      <ul className="flex flex-col gap-4">
        {t.points.map((point) => (
          <li key={point.title} className="flex flex-col gap-0.5 border-l-2 border-green-700 pl-4">
            <b className="text-body font-semibold text-ink">{point.title}</b>
            <span className="text-body-sm text-ink-2">{point.text}</span>
          </li>
        ))}
      </ul>
      <StaffCodeForm />
    </StaffCard>
  );
}

export default function StaffCodePage() {
  return (
    <StaffSuspense>
      <Code />
    </StaffSuspense>
  );
}
