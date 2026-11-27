// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: async () => ({}) }));

import { adviceLines, payoutTotals, renderAdvice, renderPayoutStatement } from "./owner-pdfs";

describe("payout advice (owner-mockups pdf)", () => {
  const model = {
    number: "FA-P-004127",
    paidAt: "2026-11-26T17:42:00Z",
    owner: "Musa Haulage Ltd",
    bank: ["Zenith Bank ••5678", "MUSA HAULAGE LTD"],
    trip: ["FA-7K3Q9", "Lagos → Kano · KJA 482 XA", "Loaded 26 Nov, 4:05 pm"],
    tierLabel: "Gold",
    commissionPct: 4,
    advancePct: 50,
    kind: "advance",
    freightKobo: 178_000_000,
    commissionKobo: 7_120_000,
    thisKobo: 85_440_000,
    stillKobo: 85_440_000,
    reference: "BCH-PO-77412",
    demo: false,
  };
  it("this payment and what's still to come add up to what the trip pays", () => {
    const l = adviceLines(model);
    expect(l.youGetKobo).toBe(170_880_000);
    expect(model.thisKobo + model.stillKobo).toBe(l.youGetKobo);
    expect(l.tripPart).toBe(true);
    expect(adviceLines({ ...model, kind: "cancellation_fee" }).tripPart).toBe(false);
  });
  it("renders", async () => {
    const pdf = await renderAdvice(model);
    expect(pdf.bytes.subarray(0, 5).toString()).toBe("%PDF-");
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync("test-results/pdf", { recursive: true });
    writeFileSync("test-results/pdf/payout-advice.pdf", pdf.bytes);
  });
});

describe("payout statement", () => {
  const rows = [
    { date: "2026-10-02T10:00:00Z", ref: "FA-1A4C2", route: "Lagos → Kano", truck: "KJA 482 XA", freightKobo: 178_000_000, commissionKobo: 7_120_000, paidKobo: 170_880_000 },
    { date: "2026-10-04T10:00:00Z", ref: "FA-1C8D5", route: "Kano → Lagos", truck: "KJA 482 XA", freightKobo: 126_000_000, commissionKobo: 5_040_000, paidKobo: 120_960_000 },
  ];
  it("totals are the sum of the rows, and paid is freight less commission", () => {
    const t = payoutTotals(rows);
    expect(t).toMatchObject({ trips: 2, freightKobo: 304_000_000, commissionKobo: 12_160_000, paidKobo: 291_840_000 });
    expect(t.freightKobo - t.commissionKobo).toBe(t.paidKobo);
  });
  it("renders", async () => {
    const pdf = await renderPayoutStatement({ month: "2026-10", owner: "Musa Haulage Ltd", ownerLine: "RC 1234567 · Kano · Gold", bank: ["Zenith Bank ••5678", "MUSA HAULAGE LTD"], rows, issuedAt: "2026-11-01T08:00:00Z", tierLabel: "Gold" });
    expect(pdf?.bytes.subarray(0, 5).toString()).toBe("%PDF-");
    const { writeFileSync } = await import("node:fs");
    writeFileSync("test-results/pdf/payout-statement.pdf", pdf!.bytes);
  });
});
