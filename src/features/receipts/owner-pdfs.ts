import "server-only";
import { block, C, finish, header, label, naira, newDocument, PAGE, px } from "@/lib/pdf/document";
import { supabaseServer } from "@/lib/supabase/server";
import { monthRange } from "./pdf-models";

// Owner payout advice and payout statement (owner-mockups pdf/payout-advice-template.pdf,
// payout-statement-template.pdf). Read with the person's own session (payouts: see_money). The bank
// number shows only to the business owner (bank_accounts RLS); Admins see "your bank account".

const day = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(iso));
const dayShort = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(new Date(iso));
const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(iso));
const FROM = ["Freight Africa", process.env.COMPANY_LEGAL_NAME, process.env.COMPANY_ADDRESS].filter((x): x is string => !!x);
const spaced = (p?: string | null) => (p ?? "").replace(/^([A-Z]{3})(\d{3})([A-Z]{2})$/, "$1 $2 $3");
const TIER: Record<string, string> = { new: "New", established: "Established", gold: "Gold" };
const KIND: Record<string, string> = { advance: "advance at loading", balance: "balance after delivery", waiting_charge: "waiting charge", cancellation_fee: "cancellation fee" };

export type AdviceModel = {
  number: string;
  paidAt: string;
  owner: string;
  bank: string[];
  trip: string[];
  tierLabel: string;
  commissionPct: number;
  advancePct: number;
  kind: string;
  freightKobo: number;
  commissionKobo: number;
  thisKobo: number;
  stillKobo: number;
  reference: string | null;
  demo: boolean;
};

/** The lines add up: freight less commission is what the trip pays; this payment plus what's still to come is that. */
export function adviceLines(m: Pick<AdviceModel, "freightKobo" | "commissionKobo" | "thisKobo" | "stillKobo">) {
  return { youGetKobo: m.freightKobo - m.commissionKobo, addsUp: m.freightKobo - m.commissionKobo >= m.thisKobo + m.stillKobo };
}

export async function renderAdvice(m: AdviceModel) {
  const doc = newDocument(`Payout advice ${m.number}`, { subject: `Payout ${m.number}` });
  let y = header(doc, "Payout advice", [m.number, when(m.paidAt)]);
  const colW = (PAGE.right - PAGE.x - px(40)) / 3;
  let bottom = y;
  ([
    ["From", FROM],
    ["Paid to", [m.owner, ...m.bank]],
    ["Trip", m.trip],
  ] as [string, string[]][]).forEach(([title, body], i) => {
    const x = PAGE.x + i * (colW + px(20));
    label(doc, title, x, y);
    bottom = Math.max(bottom, block(doc, body, x, y + px(22), colW));
  });
  y = bottom + px(30);
  const width = PAGE.right - PAGE.x;
  doc.rect(PAGE.x, y, width, px(44)).fill(C.paper);
  label(doc, "Description", PAGE.x + px(16), y + px(16));
  label(doc, "Amount", PAGE.x, y + px(16), width - px(16), "right");
  y += px(44);
  const youGet = m.freightKobo - m.commissionKobo;
  const rows: [string, string, "plain" | "bold" | "soft"][] = [
    ["Freight for the trip", naira(m.freightKobo), "plain"],
    [`Commission (${m.tierLabel}, ${m.commissionPct}%)`, `−${naira(m.commissionKobo)}`, "plain"],
    ["You get for the trip", naira(youGet), "plain"],
    [`This payment: ${KIND[m.kind] ?? m.kind}${m.kind === "advance" ? ` (${m.advancePct}%)` : ""}`, naira(m.thisKobo), "bold"],
  ];
  if (m.stillKobo > 0) rows.push(["Still to come: balance after delivery", naira(m.stillKobo), "soft"]);
  for (const [text, amount, style] of rows) {
    doc.font(style === "bold" ? "b" : "r").fontSize(px(14)).fillColor(style === "soft" ? C.ink3 : C.ink).text(text, PAGE.x + px(16), y + px(17), { width: width * 0.7, lineBreak: false });
    doc.text(amount, PAGE.x, y + px(17), { width: width - px(16), align: "right", lineBreak: false });
    y += px(55);
    doc.rect(PAGE.x, y, width, 0.75).fill(C.line);
  }
  y += px(22);
  const boxW = px(350);
  doc.roundedRect(PAGE.right - boxW, y, boxW, px(108), px(16)).fill(C.deep);
  doc.font("r").fontSize(px(13)).fillColor(C.green300).text("Amount paid", PAGE.right - boxW + px(24), y + px(22), { lineBreak: false });
  doc.text("PAID", PAGE.right - boxW, y + px(22), { width: boxW - px(24), align: "right", lineBreak: false });
  doc.font("b").fontSize(px(32)).fillColor("#FFFFFF").text(naira(m.thisKobo), PAGE.right - boxW + px(24), y + px(46), { lineBreak: false });
  y += px(108) + px(42);
  label(doc, "Bank reference", PAGE.x, y);
  block(doc, [`${m.reference ?? "—"} · sent through ${m.demo ? "the demo provider (no real money)" : "Bachs"}, ${when(m.paidAt)}`], PAGE.x, y + px(22), width, true);
  const bytes = await finish(doc, "Freight Africa · freight-africa.com · This advice was generated electronically.");
  return { bytes, name: `${m.number}.pdf` };
}

export async function advicePdf(payoutId: string) {
  const supabase = await supabaseServer();
  const { data: p } = await supabase.from("payouts").select("id, kind, status, amount_kobo, paid_at, provider_ref, trip_id, org_id, bank_account_id").eq("id", payoutId).maybeSingle();
  if (!p || p.status !== "paid" || !p.trip_id || !p.paid_at) return null;
  const [{ data: trip }, { data: money }, { data: org }, { data: bank }, { data: others }] = await Promise.all([
    supabase.from("trips").select("ref, commission_bps, advance_bps, loaded_at, truck:trucks(plate_number), load:loads(is_demo, from:cities!loads_from_city_id_fkey(name), to:cities!loads_to_city_id_fkey(name))").eq("id", p.trip_id).maybeSingle(),
    supabase.rpc("trip_money", { p_trip: p.trip_id }),
    supabase.from("organizations").select("name, tier").eq("id", p.org_id).maybeSingle(),
    p.bank_account_id ? supabase.from("bank_accounts").select("bank_name, account_last4, resolved_name").eq("id", p.bank_account_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("payouts").select("kind, status, amount_kobo").eq("trip_id", p.trip_id),
  ]);
  const m = money?.[0];
  if (!trip || !m || !org) return null;
  const load = trip.load as unknown as { is_demo: boolean; from: { name: string } | null; to: { name: string } | null } | null;
  const balance = Number(m.balance_kobo);
  const balancePaid = (others ?? []).some((o) => o.kind === "balance" && o.status === "paid");
  return renderAdvice({
    number: `FA-P-${p.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
    paidAt: p.paid_at,
    owner: org.name,
    bank: bank ? [`${bank.bank_name} ••${bank.account_last4}`, bank.resolved_name] : ["Your bank account on file"],
    trip: [trip.ref.replace(/-T\d+$/, ""), `${load?.from?.name ?? ""} → ${load?.to?.name ?? ""} · ${spaced((trip.truck as unknown as { plate_number: string } | null)?.plate_number)}`, trip.loaded_at ? `Loaded ${when(trip.loaded_at)}` : ""].filter(Boolean),
    tierLabel: TIER[org.tier ?? "new"] ?? "New",
    commissionPct: Number(trip.commission_bps) / 100,
    advancePct: Number(trip.advance_bps) / 100,
    kind: p.kind,
    freightKobo: Number(m.freight_kobo),
    commissionKobo: Number(m.commission_kobo),
    thisKobo: Number(p.amount_kobo),
    stillKobo: p.kind === "advance" && !balancePaid ? balance : 0,
    reference: p.provider_ref,
    demo: !!load?.is_demo,
  });
}

export type PayoutStatementRow = { date: string; ref: string; route: string; truck: string; freightKobo: number; commissionKobo: number; paidKobo: number };

export function payoutTotals(rows: PayoutStatementRow[]) {
  return {
    trips: rows.length,
    freightKobo: rows.reduce((s, r) => s + r.freightKobo, 0),
    commissionKobo: rows.reduce((s, r) => s + r.commissionKobo, 0),
    paidKobo: rows.reduce((s, r) => s + r.paidKobo, 0),
  };
}

export async function renderPayoutStatement(m: { month: string; owner: string; ownerLine: string; bank: string[]; rows: PayoutStatementRow[]; issuedAt: string; tierLabel: string }) {
  const range = monthRange(m.month);
  if (!range) return null;
  const totals = payoutTotals(m.rows);
  const doc = newDocument(`Payout statement ${range.label}`, { subject: `Payout statement for ${m.owner}` });
  let y = header(doc, "Payout statement", [range.label, `Issued ${day(m.issuedAt)}`]);
  const width = PAGE.right - PAGE.x;
  label(doc, "Truck owner", PAGE.x, y);
  label(doc, "Paid to", PAGE.x, y, width, "right");
  block(doc, [m.owner, m.ownerLine], PAGE.x, y + px(22), width / 2);
  doc.font("b").fontSize(px(13.5)).fillColor(C.ink).text(m.bank[0] ?? "", PAGE.x, y + px(22), { width, align: "right" });
  doc.font("r").fillColor(C.ink2).text(m.bank[1] ?? "", PAGE.x, doc.y + px(3), { width, align: "right" });
  y += px(22) + px(60);
  const tiles: [string, string, boolean][] = [
    ["Trips", String(totals.trips), false],
    ["Freight", naira(totals.freightKobo), false],
    ["Commission", naira(totals.commissionKobo), false],
    ["Paid to you", naira(totals.paidKobo), true],
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
    { t: "Date", x: 12, w: 50 },
    { t: "Trip", x: 62, w: 78 },
    { t: "Route", x: 140, w: 132 },
    { t: "Truck", x: 272, w: 92 },
    { t: "Freight", x: 364, w: 98, right: true },
    { t: "Commission", x: 464, w: 92, right: true },
    { t: "Paid", x: 560, w: 94, right: true },
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
    cell(r.ref, cols[1]);
    cell(r.route, cols[2]);
    cell(r.truck, cols[3]);
    cell(naira(r.freightKobo), cols[4]);
    cell(`−${naira(r.commissionKobo)}`, cols[5]);
    cell(naira(r.paidKobo), cols[6], true);
    y += px(40);
    doc.rect(PAGE.x, y, width, 0.75).fill(C.line);
  }
  doc.rect(PAGE.x, y, width, px(44)).fill(C.paper);
  doc.font("b").fontSize(px(12.5)).fillColor(C.ink).text(`Total for ${range.label.split(" ")[0]}`, PAGE.x + px(14), y + px(15), { lineBreak: false });
  for (const [i, v] of [
    [4, naira(totals.freightKobo)],
    [5, `−${naira(totals.commissionKobo)}`],
    [6, naira(totals.paidKobo)],
  ] as const) {
    doc.text(v, PAGE.x + px(cols[i].x), y + px(15), { width: px(cols[i].w), align: "right", lineBreak: false });
  }
  y += px(44) + px(22);
  doc.font("r").fontSize(px(12.5)).fillColor(C.ink2).text(
    `Each trip was paid in two parts: an advance when the goods were loaded, and the balance after the receiver's delivery code. Commission is at your ${m.tierLabel} rate. Payout advices for each part are in the app under Earnings.`,
    PAGE.x,
    y,
    { width, lineGap: px(3) },
  );
  const bytes = await finish(doc, `Freight Africa · freight-africa.com · Generated electronically on ${day(m.issuedAt)}.`);
  return { bytes, name: `payout-statement-${m.month}.pdf` };
}

/** A month: every trip whose balance was paid that month (paid in full), from payouts and trip money. */
export async function payoutStatementPdf(orgId: string, month: string) {
  const range = monthRange(month);
  if (!range) return null;
  const supabase = await supabaseServer();
  const [{ data: org }, { data: balances }, { data: bank }] = await Promise.all([
    supabase.from("organizations").select("name, cac_number, tier, home_city_id").eq("id", orgId).maybeSingle(),
    supabase.from("payouts").select("trip_id, paid_at").eq("org_id", orgId).eq("kind", "balance").eq("status", "paid").gte("paid_at", range.from.toISOString()).lt("paid_at", range.to.toISOString()).order("paid_at"),
    supabase.from("bank_accounts").select("bank_name, account_last4, resolved_name, status").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1),
  ]);
  if (!org) return null;
  const rows: PayoutStatementRow[] = [];
  for (const b of balances ?? []) {
    if (!b.trip_id || !b.paid_at) continue;
    const [{ data: trip }, { data: money }, { data: paid }] = await Promise.all([
      supabase.from("trips").select("ref, truck:trucks(plate_number), load:loads(from:cities!loads_from_city_id_fkey(name), to:cities!loads_to_city_id_fkey(name))").eq("id", b.trip_id).maybeSingle(),
      supabase.rpc("trip_money", { p_trip: b.trip_id }),
      supabase.from("payouts").select("amount_kobo").eq("trip_id", b.trip_id).in("kind", ["advance", "balance"]).eq("status", "paid"),
    ]);
    const mm = money?.[0];
    if (!trip || !mm) continue;
    const load = trip.load as unknown as { from: { name: string } | null; to: { name: string } | null } | null;
    rows.push({
      date: b.paid_at,
      ref: trip.ref.replace(/-T\d+$/, ""),
      route: `${load?.from?.name ?? ""} → ${load?.to?.name ?? ""}`,
      truck: spaced((trip.truck as unknown as { plate_number: string } | null)?.plate_number),
      freightKobo: Number(mm.freight_kobo),
      commissionKobo: Number(mm.commission_kobo),
      paidKobo: (paid ?? []).reduce((s, x) => s + Number(x.amount_kobo), 0),
    });
  }
  const ba = bank?.[0];
  const city = org.home_city_id ? (await supabase.from("cities").select("name").eq("id", org.home_city_id).maybeSingle()).data?.name : null;
  return renderPayoutStatement({
    month,
    owner: org.name,
    ownerLine: [org.cac_number ? `RC ${org.cac_number.replace(/^RC/i, "")}` : null, city, TIER[org.tier ?? "new"]].filter(Boolean).join(" · "),
    bank: ba ? [`${ba.bank_name} ••${ba.account_last4}`, ba.resolved_name] : ["Your bank account on file"],
    rows,
    issuedAt: new Date().toISOString(),
    tierLabel: TIER[org.tier ?? "new"] ?? "New",
  });
}
