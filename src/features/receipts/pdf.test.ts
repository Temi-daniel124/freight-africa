// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: async () => ({}) }));

import { block, finish, header, label, naira, newDocument, PAGE } from "@/lib/pdf/document";
import { monthRange, receiptLines, statementTotals } from "./pdf-models";

describe("receipt amounts (combined brief section 7)", () => {
  it("the lines add up to what was paid, less refunds", () => {
    const l = receiptLines({ paid: [{ kobo: 124_000_000 }], refunded: [], freightKobo: 119_700_000 });
    expect(l.freightKobo + l.feeKobo).toBe(124_000_000);
    expect(l.feeKobo).toBe(4_300_000);
  });

  it("a top-up and a part refund: the lines add up to what was paid, less the refund to the total", () => {
    const l = receiptLines({ paid: [{ kobo: 170_000_000 }, { kobo: 8_000_000 }], refunded: [{ kobo: 500_000 }], freightKobo: 171_000_000 });
    expect(l.netKobo).toBe(177_500_000);
    expect(l.freightKobo + l.feeKobo - l.refundedKobo).toBe(l.netKobo);
  });

  it("a waiting charge is its own line, never inside the service fee", () => {
    const l = receiptLines({ paid: [{ kobo: 124_000_000 }], refunded: [], freightKobo: 119_700_000, extras: [{ label: "Waiting charge", kobo: 1_500_000 }] });
    expect(l.feeKobo).toBe(4_300_000);
    expect(l.freightKobo + l.feeKobo + l.extras[0].kobo).toBe(l.netKobo);
  });

  it("a full refund leaves nothing kept, and the lines still add up", () => {
    const l = receiptLines({ paid: [{ kobo: 100_000_000 }], refunded: [{ kobo: 100_000_000 }], freightKobo: 95_000_000 });
    expect(l.netKobo).toBe(0);
    expect(l.freightKobo + l.feeKobo - l.refundedKobo).toBe(0);
  });
});

describe("statement totals", () => {
  const loads = [
    { ref: "FA-4C7T2", route: "Ibadan → Abuja", status: "Delivered", fundedAt: "2026-11-06T09:00:00Z", freightKobo: 119_000_000, feeKobo: 4_000_000, totalKobo: 123_000_000, held: false },
    { ref: "FA-7K3Q9", route: "Lagos → Kano", status: "Held · on the road", fundedAt: "2026-11-25T09:00:00Z", freightKobo: 178_000_000, feeKobo: 7_000_000, totalKobo: 185_000_000, held: true },
  ];
  it("adds every row, and the month totals equal the sum of the rows", () => {
    const t = statementTotals({ loads, paid: [{ kobo: 123_000_000 }, { kobo: 185_000_000 }], refunds: [], heldKobo: 185_000_000 });
    expect(t).toMatchObject({ trips: 2, paidKobo: 308_000_000, refundsKobo: 0, heldKobo: 185_000_000, totalKobo: 308_000_000 });
    expect(t.freightKobo + t.feeKobo).toBe(t.totalKobo);
  });

  it("months are Lagos months", () => {
    const r = monthRange("2026-11")!;
    expect(r.from.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-11-30T23:00:00.000Z");
    expect(r.label).toBe("November 2026");
    expect(r.lastDay).toBe(30);
    expect(monthRange("2026-13")).toBeNull();
  });
});

describe("the document frame", () => {
  it("renders an A4 PDF with the fonts, the watermark and page numbers", async () => {
    const doc = newDocument("Receipt FA-R-TEST", { subject: "test" });
    const y = header(doc, "Receipt", ["FA-R-TEST", "Issued 14 Nov 2026"]);
    label(doc, "Billed to", PAGE.x, y);
    block(doc, ["Okafor Foods Ltd", "RC 1234567"], PAGE.x, y + 16, 200);
    doc.text(naira(124_000_000), PAGE.x, y + 80);
    const bytes = await finish(doc, "Freight Africa · freight-africa.com");
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(20_000);
    expect(naira(124_000_000)).toBe("₦1,240,000");
  });
});

describe("the receipt and statement render (sample data from the templates)", () => {
  it("draws both, and writes them to test-results for a look", async () => {
    const { renderReceipt, renderStatement } = await import("./pdfs");
    const lines = receiptLines({ paid: [{ kobo: 124_000_000 }], refunded: [], freightKobo: 119_700_000 });
    const receipt = await renderReceipt({
      number: "FA-R-000482",
      issuedAt: "2026-11-14T13:41:00Z",
      billed: ["Okafor Foods Ltd", "RC 1234567", "12 Creek Road, Apapa, Lagos", "accounts@okaforfoods.ng"],
      trip: ["FA-9P1L6", "Lagos → Port Harcourt", "Loaded 12 Nov · delivered 14 Nov", "Musa Haulage Ltd · KJA 482 XA"],
      tripRef: "FA-9P1L6",
      truckLine: "covered truck, tomatoes, 18 t",
      lines,
      provider: "bachs",
      providerRef: "BCH-82KD-1194",
      deliveredAt: "2026-11-14T13:41:00Z",
    });
    const loads = [
      { ref: "FA-4C7T2", route: "Ibadan → Abuja", status: "Delivered", fundedAt: "2026-11-06T09:00:00Z", freightKobo: 119_000_000, feeKobo: 4_000_000, totalKobo: 123_000_000, held: false },
      { ref: "FA-9P1L6", route: "Lagos → Port Harcourt", status: "Delivered", fundedAt: "2026-11-10T09:00:00Z", freightKobo: 119_700_000, feeKobo: 4_300_000, totalKobo: 124_000_000, held: false },
      { ref: "FA-7K3Q9", route: "Lagos → Kano", status: "Held · on the road", fundedAt: "2026-11-25T09:00:00Z", freightKobo: 178_000_000, feeKobo: 7_000_000, totalKobo: 185_000_000, held: true },
    ];
    const statement = await renderStatement({
      month: "2026-11",
      org: { name: "Okafor Foods Ltd", line: "RC 1234567 · accounts@okaforfoods.ng" },
      rows: loads,
      totals: statementTotals({ loads, paid: loads.map((l) => ({ kobo: l.totalKobo })), refunds: [], heldKobo: 185_000_000 }),
      issuedAt: "2026-12-01T08:00:00Z",
    });
    expect(receipt.bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(statement?.bytes.subarray(0, 5).toString()).toBe("%PDF-");
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync("test-results/pdf", { recursive: true });
    writeFileSync("test-results/pdf/receipt.pdf", receipt.bytes);
    writeFileSync("test-results/pdf/statement.pdf", statement!.bytes);
  });
});
