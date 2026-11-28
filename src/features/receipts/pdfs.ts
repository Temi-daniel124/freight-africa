import "server-only";
import { block, C, finish, header, label, naira, newDocument, PAGE, px } from "@/lib/pdf/document";
import { companyLines } from "@/lib/settings/public";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { monthRange, receiptLines, statementTotals, type StatementLoad } from "./pdf-models";

// The sender receipt and statement (sender-mockups pdf/receipt-template.pdf, statement-template.pdf).
// Read with the person's own session, so RLS decides what they may print. Freight Africa's registered
// name, RC and address are founder items (PROJECT-STATE §4) and are left out until they are set.

const day = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(iso));
const dayShort = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(new Date(iso));
const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(iso));
// D056: name and email; a postal address only once the setting is filled in.
const FROM = ["Freight Africa", "hello@freight-africa.com"];

type Org = { name: string; cac_number: string | null; receipt_address: string | null; receipt_email: string | null };

// ---- Receipt ----------------------------------------------------------------------------------------

export async function receiptPdf(paymentId: string): Promise<{ bytes: Buffer; name: string } | null> {
  const supabase = await supabaseServer();
  const { data: payment } = await supabase.from("payments").select("id, load_id, provider, provider_ref, received_at, received_kobo").eq("id", paymentId).maybeSingle();
  if (!payment || Number(payment.received_kobo) <= 0) return null;
  const [{ data: load }, { data: payments }, { data: refunds }] = await Promise.all([
    supabase
      .from("loads")
      .select("ref, freight_kobo, shipper_org_id, is_demo, from:cities!loads_from_city_id_fkey(name), to:cities!loads_to_city_id_fkey(name), goods:goods_categories(name), weight_kg, truck_type:truck_types(name), trips(status, loaded_at, delivered_at, transporter:organizations(name), truck:trucks(plate_number))")
      .eq("id", payment.load_id)
      .maybeSingle(),
    supabase.from("payments").select("purpose, received_kobo, received_at").eq("load_id", payment.load_id),
    // Refunds are read for this one load with the service key: the person has already shown they may
    // read its payments (RLS above), and a booker can't read refunds, which would overstate the total (review).
    supabaseAdmin().from("refunds").select("amount_kobo").eq("load_id", payment.load_id),
  ]);
  if (!load) return null;
  const { data: org } = await supabase.from("organizations").select("name, cac_number, receipt_address, receipt_email").eq("id", load.shipper_org_id).maybeSingle();
  type Trip = { status: string; loaded_at: string | null; delivered_at: string | null; transporter: { name: string } | null; truck: { plate_number: string } | null };
  const trip = ((load.trips as unknown as Trip[] | null) ?? []).find((t) => t.status !== "cancelled") ?? null;
  const name = (x: unknown) => (x as { name: string } | null)?.name ?? "";
  const trip_ = ["load", "top_up", "raise"];
  const extraLabel: Record<string, string> = { waiting_charge: "Waiting charge", cancellation_fee: "Cancellation fee" };
  const lines = receiptLines({
    paid: (payments ?? []).filter((p) => trip_.includes(p.purpose)).map((p) => ({ kobo: Number(p.received_kobo) })),
    extras: (payments ?? []).filter((p) => extraLabel[p.purpose]).map((p) => ({ label: extraLabel[p.purpose], kobo: Number(p.received_kobo) })),
    refunded: (refunds ?? []).map((r) => ({ kobo: Number(r.amount_kobo) })),
    freightKobo: Number(load.freight_kobo),
  });
  const o = org as Org | null;
  const truck = [name(load.truck_type).toLowerCase(), name(load.goods).toLowerCase(), load.weight_kg ? `${Math.round(Number(load.weight_kg) / 1000)} t` : null].filter(Boolean).join(", ");
  return renderReceipt({
    from: await companyLines(),
    number: `FA-R-${payment.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
    issuedAt: payment.received_at ?? new Date().toISOString(),
    billed: [o?.name ?? "", o?.cac_number ? `RC ${o.cac_number.replace(/^RC/i, "")}` : "", o?.receipt_address ?? "", o?.receipt_email ?? ""].filter(Boolean),
    trip: [
      load.ref,
      `${name(load.from)} → ${name(load.to)}`,
      [trip?.loaded_at ? `Loaded ${dayShort(trip.loaded_at)}` : null, trip?.delivered_at ? `delivered ${dayShort(trip.delivered_at)}` : null].filter(Boolean).join(" · "),
      [trip?.transporter?.name, trip?.truck?.plate_number].filter(Boolean).join(" · "),
    ].filter(Boolean),
    tripRef: load.ref,
    truckLine: truck,
    lines,
    provider: load.is_demo || payment.provider !== "bachs" ? "demo" : "bachs",
    providerRef: payment.provider_ref,
    deliveredAt: trip?.delivered_at ?? null,
  });
}

export type ReceiptModel = {
  from?: string[];
  number: string;
  issuedAt: string;
  billed: string[];
  trip: string[];
  tripRef: string;
  truckLine: string;
  lines: ReturnType<typeof receiptLines>;
  provider: string | null;
  providerRef: string | null;
  deliveredAt: string | null;
};

/** Draws the receipt (sender-mockups pdf/receipt-template.pdf) from a model whose amounts already add up. */
export async function renderReceipt(m: ReceiptModel): Promise<{ bytes: Buffer; name: string }> {
  const { number, lines } = m;
  const doc = newDocument(`Receipt ${number}`, { subject: `Receipt for ${m.tripRef}` });
  let y = header(doc, "Receipt", [number, `Issued ${day(m.issuedAt)}`]);

  const colW = (PAGE.right - PAGE.x - px(40)) / 3;
  const cols: [string, string[]][] = [
    ["From", m.from ?? FROM],
    ["Billed to", m.billed],
    ["Trip", m.trip],
  ];
  let bottom = y;
  cols.forEach(([title, body], i) => {
    const x = PAGE.x + i * (colW + px(20));
    label(doc, title, x, y);
    bottom = Math.max(bottom, block(doc, body, x, y + px(22), colW));
  });

  // The lines table.
  y = bottom + px(30);
  const width = PAGE.right - PAGE.x;
  doc.rect(PAGE.x, y, width, px(44)).fill(C.paper);
  label(doc, "Description", PAGE.x + px(16), y + px(16));
  label(doc, "Amount", PAGE.x, y + px(16), width - px(16), "right");
  y += px(44);
  const rows: [string, number][] = [
    [`Truck and driver · ${m.truckLine}`, lines.freightKobo],
    ...lines.extras.map((e): [string, number] => [e.label, e.kobo]),
    ["Service fee", lines.feeKobo],
  ];
  if (lines.refundedKobo > 0) rows.push(["Refund to you", -lines.refundedKobo]);
  for (const [text, kobo] of rows) {
    doc.font("r").fontSize(px(14)).fillColor(C.ink).text(text, PAGE.x + px(16), y + px(17), { width: width * 0.7, lineBreak: false });
    doc.text(kobo < 0 ? `−${naira(-kobo)}` : naira(kobo), PAGE.x, y + px(17), { width: width - px(16), align: "right", lineBreak: false });
    y += px(55);
    doc.rect(PAGE.x, y, width, 0.75).fill(C.line);
  }

  // Total paid, in the deep-green box.
  y += px(22);
  const boxW = px(350);
  doc.roundedRect(PAGE.right - boxW, y, boxW, px(108), px(16)).fill(C.deep);
  doc.font("r").fontSize(px(13)).fillColor(C.green300).text("Total paid", PAGE.right - boxW + px(24), y + px(22), { lineBreak: false });
  doc.text("PAID", PAGE.right - boxW, y + px(22), { width: boxW - px(24), align: "right", lineBreak: false });
  doc.font("b").fontSize(px(32)).fillColor("#FFFFFF").text(naira(lines.netKobo), PAGE.right - boxW + px(24), y + px(46), { lineBreak: false });
  y += px(108) + px(42);

  const half = (width - px(40)) / 2;
  label(doc, "Payment", PAGE.x, y);
  block(doc, [`Paid through ${m.provider === "bachs" ? "Bachs" : "the demo provider (no real money)"} on ${day(m.issuedAt)}`, m.providerRef ? `Reference ${m.providerRef}` : ""].filter(Boolean), PAGE.x, y + px(22), half, true);
  if (m.deliveredAt) {
    label(doc, "Delivery", PAGE.x + half + px(40), y);
    block(doc, [`Confirmed with the delivery code, ${when(m.deliveredAt)}`], PAGE.x + half + px(40), y + px(22), half, true);
  }
  const bytes = await finish(doc, "Freight Africa · freight-africa.com · This receipt was generated electronically.");
  return { bytes, name: `${number}.pdf` };
}

// ---- Statement ---------------------------------------------------------------------------------------

const STATUS: Record<string, string> = { funded: "Finding a truck", matched: "Held · on the road", refunded: "Refunded", cancelled: "Cancelled" };

export async function statementPdf(orgId: string, month: string): Promise<{ bytes: Buffer; name: string } | null> {
  const range = monthRange(month);
  if (!range) return null;
  const supabase = await supabaseServer();
  const [{ data: org }, { data: loads }, { data: paid }, { data: refunds }, { data: heldLoads }] = await Promise.all([
    supabase.from("organizations").select("name, cac_number, receipt_address, receipt_email").eq("id", orgId).maybeSingle(),
    supabase
      .from("loads")
      .select("ref, status, funded_at, freight_kobo, fee_kobo, total_kobo, from:cities!loads_from_city_id_fkey(name), to:cities!loads_to_city_id_fkey(name), trips(status)")
      .eq("shipper_org_id", orgId)
      .gte("funded_at", range.from.toISOString())
      .lt("funded_at", range.to.toISOString())
      .order("funded_at"),
    supabase.from("payments").select("received_kobo").eq("shipper_org_id", orgId).gte("received_at", range.from.toISOString()).lt("received_at", range.to.toISOString()),
    supabase.from("refunds").select("amount_kobo").eq("shipper_org_id", orgId).gte("created_at", range.from.toISOString()).lt("created_at", range.to.toISOString()),
    supabase.from("loads").select("total_kobo, trips(status)").eq("shipper_org_id", orgId).in("status", ["funded", "matched"]),
  ]);
  if (!org) return null;
  const done = (trips: unknown) => ((trips as { status: string }[] | null) ?? []).some((t) => ["delivered", "delivered_with_exception", "closed"].includes(t.status));
  const name = (x: unknown) => (x as { name: string } | null)?.name ?? "";
  const rows: StatementLoad[] = (loads ?? []).map((l) => ({
    ref: l.ref,
    route: `${name(l.from)} → ${name(l.to)}`,
    status: done(l.trips) ? "Delivered" : (STATUS[l.status] ?? l.status),
    fundedAt: l.funded_at as string,
    freightKobo: Number(l.freight_kobo),
    feeKobo: Number(l.fee_kobo),
    totalKobo: Number(l.total_kobo),
    held: ["funded", "matched"].includes(l.status) && !done(l.trips),
  }));
  const totals = statementTotals({
    loads: rows,
    paid: (paid ?? []).map((p) => ({ kobo: Number(p.received_kobo) })),
    refunds: (refunds ?? []).map((r) => ({ kobo: Number(r.amount_kobo) })),
    heldKobo: (heldLoads ?? []).filter((l) => !done(l.trips)).reduce((s, l) => s + Number(l.total_kobo), 0),
  });
  return renderStatement({ month, org: { name: org.name, line: [org.cac_number ? `RC ${org.cac_number.replace(/^RC/i, "")}` : null, org.receipt_email].filter(Boolean).join(" · ") }, rows, totals, issuedAt: new Date().toISOString() });
}

export type StatementModel = { month: string; org: { name: string; line: string }; rows: StatementLoad[]; totals: ReturnType<typeof statementTotals>; issuedAt: string };

/** Draws the statement (sender-mockups pdf/statement-template.pdf). */
export async function renderStatement(m: StatementModel): Promise<{ bytes: Buffer; name: string } | null> {
  const range = monthRange(m.month);
  if (!range) return null;
  const { rows, totals, org } = m;
  const issued = new Date(m.issuedAt);
  const doc = newDocument(`Statement ${range.label}`, { subject: `Statement for ${org.name}` });
  let y = header(doc, "Statement", [range.label, `1 – ${range.lastDay} ${range.label.split(" ")[0].slice(0, 3)} · issued ${day(issued.toISOString())}`]);
  label(doc, "Account", PAGE.x, y);
  y = block(doc, [org.name, org.line].filter(Boolean), PAGE.x, y + px(22), PAGE.right - PAGE.x) + px(26);

  // Four totals.
  const tiles: [string, string, boolean][] = [
    ["Trips", String(totals.trips), false],
    ["Paid", naira(totals.paidKobo), false],
    ["Refunds", naira(totals.refundsKobo), false],
    ["Held now", naira(totals.heldKobo), true],
  ];
  const gap = px(14);
  const tileW = (PAGE.right - PAGE.x - gap * 3) / 4;
  tiles.forEach(([t, v, dark], i) => {
    const x = PAGE.x + i * (tileW + gap);
    doc.roundedRect(x, y, tileW, px(76), px(14)).fill(dark ? C.deep : C.paper);
    doc.font("r").fontSize(px(13)).fillColor(dark ? C.green300 : C.ink3).text(t, x + px(16), y + px(15), { lineBreak: false });
    doc.font("b").fontSize(px(21)).fillColor(dark ? "#FFFFFF" : C.ink).text(v, x + px(16), y + px(36), { width: tileW - px(24), lineBreak: false });
  });
  y += px(76) + px(30);

  // The trips table.
  const width = PAGE.right - PAGE.x;
  const cols = [
    { t: "Date", x: 12, w: 50 },
    { t: "Trip", x: 62, w: 72 },
    { t: "Route", x: 136, w: 150 },
    { t: "Status", x: 288, w: 118 },
    { t: "Freight", x: 404, w: 92, right: true },
    { t: "Fee", x: 498, w: 72, right: true },
    { t: "Total", x: 572, w: 88, right: true },
  ];
  const head = () => {
    doc.rect(PAGE.x, y, width, px(40)).fill(C.paper);
    for (const c of cols) label(doc, c.t, PAGE.x + px(c.x), y + px(14), px(c.w), c.right ? "right" : "left");
    y += px(40);
  };
  head();
  const cell = (text: string, c: (typeof cols)[number], bold = false) =>
    doc.font(bold ? "b" : "r").fontSize(px(12.5)).fillColor(C.ink).text(text, PAGE.x + px(c.x), y + px(14), { width: px(c.w), align: c.right ? "right" : "left", lineBreak: false, ellipsis: true });
  for (const r of rows) {
    if (y > PAGE.h - px(160)) {
      doc.addPage();
      y = px(80);
      head();
    }
    cell(dayShort(r.fundedAt), cols[0]);
    cell(r.ref, cols[1]);
    cell(r.route, cols[2]);
    cell(r.status, cols[3]);
    cell(naira(r.freightKobo), cols[4]);
    cell(naira(r.feeKobo), cols[5]);
    cell(naira(r.totalKobo), cols[6], true);
    y += px(42);
    doc.rect(PAGE.x, y, width, 0.75).fill(C.line);
  }
  doc.rect(PAGE.x, y, width, px(44)).fill(C.paper);
  doc.font("b").fontSize(px(13)).fillColor(C.ink).text(`Total for ${range.label.split(" ")[0]}`, PAGE.x + px(14), y + px(15), { lineBreak: false });
  for (const [i, v] of [
    [4, totals.freightKobo],
    [5, totals.feeKobo],
    [6, totals.totalKobo],
  ] as const) {
    doc.text(naira(v), PAGE.x + px(cols[i].x), y + px(15), { width: px(cols[i].w), align: "right", lineBreak: false });
  }
  y += px(44) + px(22);
  doc.font("r").fontSize(px(12.5)).fillColor(C.ink2).text(
    'Fee is the Freight Africa service fee. "Held" money stays protected until the trip finishes; it is released to the truck owner in stages. Receipts for each trip are in the app under Payments.',
    PAGE.x,
    y,
    { width, lineGap: px(3) },
  );
  const bytes = await finish(doc, `Freight Africa · freight-africa.com · Generated electronically on ${day(issued.toISOString())}.`);
  return { bytes, name: `statement-${m.month}.pdf` };
}
