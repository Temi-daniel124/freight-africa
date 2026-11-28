import type { AgentShareRow } from "@/features/receipts/agent-pdf";

// The agent mockups' sample data (Hauwa Bello in Kano). /dev previews only: the agent backend
// (attribution, shares, reminders) is Phase 6, and nothing here reaches production.
export const AGENT = { name: "Hauwa Bello", line: "Agent · Kano · Dawanau and Dakata", code: "HAU4K7Q2", bank: ["Jaiz Bank ···· 7192", "HAUWA BELLO"] };

export const SHARES: AgentShareRow[] = [
  { date: "2026-11-04T10:00:00Z", person: "Sahel Grains · sender", ref: "FA-3J7M2", route: "Kano → Abuja", shareKobo: 980_000, state: "void" },
  { date: "2026-11-18T10:00:00Z", person: "Garba & Sons · owner", ref: "FA-6P1R4", route: "Kano → Abuja", shareKobo: 930_000, state: "paid" },
  { date: "2026-11-20T10:00:00Z", person: "Musa Haulage Ltd · owner", ref: "FA-9R1M6", route: "Kano → Lagos", shareKobo: 1_020_000, state: "paid" },
  { date: "2026-11-20T11:00:00Z", person: "Sahel Grains · sender", ref: "FA-9R1M6", route: "Kano → Lagos", shareKobo: 1_020_000, state: "paid" },
  { date: "2026-11-25T10:00:00Z", person: "Musa Haulage Ltd · owner", ref: "FA-7K3Q9", route: "Lagos → Kano", shareKobo: 1_180_000, state: "waiting" },
];
