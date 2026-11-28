import type { PayoutStatementRow } from "./owner-pdfs";
import type { StatementLoad } from "./pdf-models";
import { receiptLines, statementTotals } from "./pdf-models";
import type { ReceiptModel } from "./pdfs";

// The mockups' sample documents (sender DOC-Receipt, DOC-Statement; owner ODOC-Advice, ODOC-Statement),
// for /dev previews only (combined brief: sample data never in real screens).

export const SAMPLE_RECEIPT: ReceiptModel = {
  from: ["Freight Africa", "hello@freight-africa.com"],
  number: "FA-R-000482",
  issuedAt: "2026-11-14T13:41:00Z",
  billed: ["Okafor Foods Ltd", "RC 1234567", "12 Creek Road, Apapa, Lagos", "accounts@okaforfoods.ng"],
  trip: ["FA-9P1L6", "Lagos → Port Harcourt", "Loaded 12 Nov · delivered 14 Nov, 2:41 pm", "Musa Haulage Ltd · KJA 482 XA"],
  tripRef: "FA-9P1L6",
  truckLine: "Tomatoes, 18 t · covered truck",
  lines: receiptLines({ paid: [{ kobo: 124_000_000 }], refunded: [], freightKobo: 119_700_000 }),
  provider: "bachs",
  providerRef: "BCH-82KD-1194",
  deliveredAt: "2026-11-14T13:41:00Z",
};

const LOADS: StatementLoad[] = [
  { ref: "FA-7K3Q9", route: "Lagos → Kano", status: "On the road", fundedAt: "2026-11-25T08:42:00Z", freightKobo: 178_000_000, feeKobo: 7_000_000, totalKobo: 185_000_000, held: true },
  { ref: "FA-4R2N8", route: "Lagos → Onitsha", status: "Finding a truck", fundedAt: "2026-11-24T10:05:00Z", freightKobo: 107_500_000, feeKobo: 4_500_000, totalKobo: 112_000_000, held: true },
  { ref: "FA-9P1L6", route: "Lagos → Port Harcourt", status: "Delivered", fundedAt: "2026-11-10T09:10:00Z", freightKobo: 119_700_000, feeKobo: 4_300_000, totalKobo: 124_000_000, held: false },
  { ref: "FA-2B9N4", route: "Lagos → Ibadan", status: "Delivered", fundedAt: "2026-11-04T07:30:00Z", freightKobo: 38_400_000, feeKobo: 1_600_000, totalKobo: 40_000_000, held: false },
];

export const SAMPLE_STATEMENT = {
  month: "2026-11",
  org: { name: "Okafor Foods Ltd", line: "RC 1234567 · accounts@okaforfoods.ng" },
  rows: LOADS,
  totals: statementTotals({ loads: LOADS, paid: LOADS.map((l) => ({ kobo: l.totalKobo })), refunds: [], heldKobo: 297_000_000 }),
  issuedAt: "2026-12-01T08:00:00Z",
};

export const SAMPLE_ADVICE = {
  from: ["Freight Africa", "hello@freight-africa.com"],
  number: "FA-P-001207",
  paidAt: "2026-11-26T17:42:00Z",
  owner: "Musa Haulage Ltd",
  bank: ["Zenith Bank ••5678", "MUSA HAULAGE LTD"],
  trip: ["FA-7K3Q9", "Lagos → Kano", "Rice, 600 bags · flatbed KJA 482 XA", "Driver Musa Ibrahim"],
  tierLabel: "Gold",
  commissionPct: 4,
  advancePct: 50,
  kind: "advance",
  freightKobo: 178_000_000,
  commissionKobo: 7_120_000,
  thisKobo: 85_440_000,
  stillKobo: 85_440_000,
  reference: "BCH-PO-55K2-0917",
  demo: false,
};

const PAYOUT_ROWS: PayoutStatementRow[] = [
  { date: "2026-10-03T14:00:00Z", ref: "FA-1C4D2", route: "Lagos → Kano", truck: "KJA 482 XA", freightKobo: 176_000_000, commissionKobo: 7_040_000, paidKobo: 168_960_000 },
  { date: "2026-10-09T12:20:00Z", ref: "FA-3H8K1", route: "Lagos → Abuja", truck: "KAN 219 BT", freightKobo: 98_000_000, commissionKobo: 3_920_000, paidKobo: 94_080_000 },
  { date: "2026-10-15T16:10:00Z", ref: "FA-6M2P7", route: "Lagos → Port Harcourt", truck: "KAN 774 RD", freightKobo: 121_000_000, commissionKobo: 4_840_000, paidKobo: 116_160_000 },
  { date: "2026-10-22T10:05:00Z", ref: "FA-8Q5R3", route: "Kano → Lagos", truck: "KJA 482 XA", freightKobo: 137_000_000, commissionKobo: 5_480_000, paidKobo: 131_520_000 },
];

export const SAMPLE_PAYOUT_STATEMENT = {
  month: "2026-10",
  owner: "Musa Haulage Ltd",
  ownerLine: "RC 7654321 · Kano · Gold",
  bank: ["Zenith Bank ••5678", "MUSA HAULAGE LTD"],
  rows: PAYOUT_ROWS,
  issuedAt: "2026-11-01T08:00:00Z",
  tierLabel: "Gold",
};
