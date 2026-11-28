import { notFound } from "next/navigation";
import { AGENT, SHARES } from "@/features/agent/sample";
import { renderAgentStatement } from "@/features/receipts/agent-pdf";
import { pdfResponse } from "@/lib/pdf/document";

// GDOC agent statement with the mockups' sample data (preview and development only, Phase 6 backend).
export async function GET() {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  const r = await renderAgentStatement({ month: "2026-11", agent: AGENT.name, agentLine: AGENT.line, bank: AGENT.bank, rows: SHARES, issuedAt: "2026-12-01T08:00:00Z", shareLine: "Your share is 1% of each trip for 6 months after someone joins (settings)." });
  if (!r) notFound();
  return pdfResponse(r.bytes, r.name);
}
