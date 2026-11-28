import type { ReactNode } from "react";
import { StatusChip, type StatusTone } from "@/components/ui/chip";
import { StaffShell } from "@/features/shell/staff-shell";
import type { StaffPage } from "@/features/shell/config";
import { SosPreview } from "./sos-preview";

// Staff screens whose backend belongs to a later phase (combined brief 5f): built with sample data and
// shown only in /dev. PROJECT-STATE lists each as "UI built, backend Phase N". Never in production.

const kemi = { name: "Kemi Ogunleye", role: "Operations" };
const tolu = { name: "Tolu Bakare", role: "Support" };
const th = "px-4 py-3 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase";

function Frame({ page, person = kemi, children }: { page: StaffPage; person?: { name: string; role: string }; children: ReactNode }) {
  return (
    <StaffShell base="/dev/staff" page={page} person={person}>
      {children}
    </StaffShell>
  );
}

const DISPUTES: [string, string, string, string, string, string, string, StatusTone][] = [
  ["DP-0188", "FA-2Q9D1", "Goods damaged", "₦210,000", "Sender · Bua Foods", "9 h left", "Evidence in", "warning"],
  ["DP-0191", "FA-5L2K8", "Shortage · 24 bags", "₦62,400", "Sender · Sahel Grains", "31 h left", "Waiting on owner", "info"],
  ["DP-0193", "FA-1B9C3", "Waiting charge", "₦45,000", "Owner · Kano Line", "50 h left", "New", "neutral"],
  ["DP-0179", "FA-8N3S2", "Goods damaged", "₦1.4m", "Sender · Okafor Foods", "Decided", "Waiting approval", "warning"],
];

function Disputes() {
  return (
    <Frame page="disputes">
      <p className="-mt-4 mb-5 text-body text-ink-2">Decide on evidence, within 72 hours. The money claimed stays held until then.</p>
      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[900px] text-left text-body-sm">
          <thead className="border-b border-line">
            <tr>
              {["No.", "Trip", "Type", "Claimed and held", "Opened by", "Deadline", "Status"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DISPUTES.map(([no, trip, type, amount, by, due, status, tone]) => (
              <tr key={no} className="border-b border-line-soft last:border-b-0">
                <td className="tabular px-4 py-3 font-semibold text-ink">{no}</td>
                <td className="tabular px-4 py-3 text-ink">{trip}</td>
                <td className="px-4 py-3 text-ink">{type}</td>
                <td className="tabular px-4 py-3 text-ink">{amount}</td>
                <td className="px-4 py-3 text-ink-2">{by}</td>
                <td className="px-4 py-3 text-ink-2">{due}</td>
                <td className="px-4 py-3">
                  <StatusChip tone={tone}>{status}</StatusChip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
}

const THREADS = [
  ["Adaeze Okafor", "12 min", "email", "Where is my truck? FA-8D2V5 hasn't left"],
  ["Ibrahim Lawal", "18 min", "in-app", "Receiver says code is wrong"],
  ["Yusuf Danjuma", "1 h", "contact form", "Why was my truck rejected?"],
  ["Nkem Plastics", "3 h", "email", "Receipt for October"],
];

function Inbox() {
  return (
    <Frame page="support" person={tolu}>
      <p className="-mt-4 mb-5 text-body text-ink-2">Email, in-app help and the contact form. WhatsApp joins when it&apos;s connected.</p>
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <ul className="rounded-card border border-line bg-surface">
          {THREADS.map(([name, ago, via, subject], i) => (
            <li key={name} className={`border-b border-line-soft px-4 py-3 last:border-b-0 ${i === 0 ? "bg-green-50" : ""}`}>
              <p className="flex justify-between text-body-sm font-semibold text-ink">
                {name}
                <span className="font-normal text-ink-3">{ago}</span>
              </p>
              <p className="text-caption text-ink-3">{via}</p>
              <p className="truncate text-body-sm text-ink-2">{subject}</p>
            </li>
          ))}
        </ul>
        <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
          <div>
            <h2 className="text-title-3 text-ink">Adaeze Okafor · Okafor Foods Ltd</h2>
            <p className="text-meta text-ink-3">Email · waiting 12 min · linked to FA-8D2V5</p>
          </div>
          <p className="rounded-callout bg-paper p-4 text-body text-ink">Our truck FA-8D2V5 was due at 8am and the driver hasn&apos;t left Ikeja. What&apos;s happening?</p>
          <p className="rounded-callout bg-warning-100 p-4 text-body-sm text-ink">Called Sani 08:45: loaders late, starting by 09:15. · Kemi (operations) · note</p>
          <textarea rows={4} defaultValue="Good morning Adaeze. Your loaders arrived late at Ikeja, so loading started at 08:50. Sani expects to leave by 09:15 and you'll see the truck move on the tracking page." className="w-full rounded-input border border-line-field px-3 py-2.5 text-body" />
          <div className="flex justify-end">
            <button type="button" className="h-11 rounded-button bg-green-900 px-6 text-body font-semibold text-white">
              Send reply
            </button>
          </div>
        </section>
      </div>
    </Frame>
  );
}

export const STAFF_PREVIEWS: Record<string, () => ReactNode> = {
  sos: () => (
    <Frame page="sos">
      <SosPreview />
    </Frame>
  ),
  disputes: () => <Disputes />,
  inbox: () => <Inbox />,
};

export function StaffPreviews({ screen }: { screen: string }) {
  const render = STAFF_PREVIEWS[screen];
  return render ? <>{render()}</> : null;
}
