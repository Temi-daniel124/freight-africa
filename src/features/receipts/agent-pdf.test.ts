// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { SHARES } from "@/features/agent/sample";
import { agentTotals, renderAgentStatement } from "./agent-pdf";

describe("agent statement (agent-mockups pdf)", () => {
  it("void shares count for nothing; paid and waiting add up to the month", () => {
    const t = agentTotals(SHARES);
    expect(t.shares).toBe(4);
    expect(t.paidKobo).toBe(930_000 + 1_020_000 + 1_020_000);
    expect(t.waitingKobo).toBe(1_180_000);
    expect(t.totalKobo).toBe(t.paidKobo + t.waitingKobo);
  });
  it("renders an A4 PDF", async () => {
    const r = await renderAgentStatement({ month: "2026-11", agent: "Hauwa Bello", agentLine: "Kano", bank: ["Jaiz Bank ···· 7192", "HAUWA BELLO"], rows: SHARES, issuedAt: "2026-12-01T08:00:00Z", shareLine: "Your share is 1% of each trip for 6 months." });
    expect(r?.name).toBe("agent-statement-2026-11.pdf");
    expect(r?.bytes.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
