import "server-only";
import { block, C, finish, header, label, naira, newDocument, PAGE, px } from "@/lib/pdf/document";
import { monthRange } from "./pdf-models";

// Agent monthly statement (agent-mockups pdf/agent-statement-template.pdf): the shares earned in a month
// from the trips of the people the agent brought. Agents never see prices or payments (D003-style), only
// their own shares. The data comes with the agent backend (Phase 6); /dev renders it with sample data.

const day = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(iso));
const dayShort = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(new Date(iso));

export type AgentShareRow = { date: string; person: string; ref: string; route: string; shareKobo: number; state: "paid" | "waiting" | "void" };

export function agentTotals(rows: AgentShareRow[]) {
  const sum = (s: AgentShareRow["state"]) => rows.filter((r) => r.state === s).reduce((t, r) => t + r.shareKobo, 0);
  return { shares: rows.filter((r) => r.state !== "void").length, paidKobo: sum("paid"), waitingKobo: sum("waiting"), totalKobo: sum("paid") + sum("waiting") };
}

const STATE: Record<AgentShareRow["state"], string> = { paid: "Paid", waiting: "Waiting for trip", void: "Void (problem upheld)" };

export async function renderAgentStatement(m: { month: string; agent: string; agentLine: string; bank: string[]; rows: AgentShareRow[]; issuedAt: string; shareLine: string }) {
  const range = monthRange(m.month);
  if (!range) return null;
  const totals = agentTotals(m.rows);
  const doc = newDocument(`Agent statement ${range.label}`, { subject: `Agent statement for ${m.agent}` });
  let y = header(doc, "Agent statement", [range.label, `Issued ${day(m.issuedAt)}`]);
  const width = PAGE.right - PAGE.x;
  label(doc, "Agent", PAGE.x, y);
  label(doc, "Paid to", PAGE.x, y, width, "right");
  block(doc, [m.agent, m.agentLine], PAGE.x, y + px(22), width / 2);
  doc.font("b").fontSize(px(13.5)).fillColor(C.ink).text(m.bank[0] ?? "", PAGE.x, y + px(22), { width, align: "right" });
  doc.font("r").fillColor(C.ink2).text(m.bank[1] ?? "", PAGE.x, doc.y + px(3), { width, align: "right" });
  y += px(22) + px(60);
  const tiles: [string, string, boolean][] = [
    ["Shares", String(totals.shares), false],
    ["Waiting", naira(totals.waitingKobo), false],
    ["Paid", naira(totals.paidKobo), false],
    ["Earned this month", naira(totals.totalKobo), true],
  ];
  const gap = px(14);
  const tileW = (width - gap * 3) / 4;
  tiles.forEach(([t, v, dark], i) => {
    const x = PAGE.x + i * (tileW + gap);
    doc.roundedRect(x, y, tileW, px(76), px(14)).fill(dark ? C.deep : C.paper);
    doc.font("r").fontSize(px(13)).fillColor(dark ? C.green300 : C.ink3).text(t, x + px(16), y + px(15), { lineBreak: false });
    doc.font("b").fontSize(px(20)).fillColor(dark ? "#FFFFFF" : C.ink).text(v, x + px(16), y + px(36), { width: tileW - px(24), lineBreak: false });
  });
  y += px(76) + px(30);
  const cols = [
    { t: "Date", x: 12, w: 54 },
    { t: "Person", x: 70, w: 160 },
    { t: "Trip", x: 234, w: 84 },
    { t: "Route", x: 322, w: 132 },
    { t: "State", x: 458, w: 106 },
    { t: "Share", x: 568, w: 86, right: true },
  ];
  const head = () => {
    doc.rect(PAGE.x, y, width, px(40)).fill(C.paper);
    for (const c of cols) label(doc, c.t, PAGE.x + px(c.x), y + px(14), px(c.w), c.right ? "right" : "left");
    y += px(40);
  };
  head();
  const cell = (text: string, c: (typeof cols)[number], bold = false) =>
    doc.font(bold ? "b" : "r").fontSize(px(12.5)).fillColor(C.ink).text(text, PAGE.x + px(c.x), y + px(14), { width: px(c.w), align: c.right ? "right" : "left", lineBreak: false, ellipsis: true });
  for (const r of m.rows) {
    if (y > PAGE.h - px(160)) {
      doc.addPage();
      y = px(80);
      head();
    }
    cell(dayShort(r.date), cols[0]);
    cell(r.person, cols[1]);
    cell(r.ref, cols[2]);
    cell(r.route, cols[3]);
    cell(STATE[r.state], cols[4]);
    cell(r.state === "void" ? naira(0) : naira(r.shareKobo), cols[5], true);
    y += px(40);
    doc.rect(PAGE.x, y, width, 0.75).fill(C.line);
  }
  doc.rect(PAGE.x, y, width, px(44)).fill(C.paper);
  doc.font("b").fontSize(px(12.5)).fillColor(C.ink).text(`Total for ${range.label.split(" ")[0]}`, PAGE.x + px(14), y + px(15), { lineBreak: false });
  doc.text(naira(totals.totalKobo), PAGE.x + px(cols[5].x), y + px(15), { width: px(cols[5].w), align: "right", lineBreak: false });
  y += px(44) + px(22);
  doc.font("r").fontSize(px(12.5)).fillColor(C.ink2).text(`${m.shareLine} A share is paid when its trip closes, and is void when a problem on that trip is upheld.`, PAGE.x, y, { width, lineGap: px(3) });
  const bytes = await finish(doc, `Freight Africa · freight-africa.com · Generated electronically on ${day(m.issuedAt)}.`);
  return { bytes, name: `agent-statement-${m.month}.pdf` };
}
