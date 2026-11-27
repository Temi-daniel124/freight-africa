// Pure builders for the sender receipt and statement (no I/O), so the tests can check that every amount
// printed comes from the money rows and adds up.

export type MoneyRow = { kobo: number };

/**
 * A receipt's lines: what the truck and driver get, any waiting charge or cancellation fee on its own
 * line, and our service fee, adding up to what was paid; then every refund owed back (a refund that
 * failed is still owed, so it still counts), leaving the money kept.
 */
export function receiptLines(input: { paid: MoneyRow[]; refunded: MoneyRow[]; freightKobo: number; extras?: { label: string; kobo: number }[] }) {
  const paid = input.paid.reduce((s, r) => s + r.kobo, 0) + (input.extras ?? []).reduce((s, e) => s + e.kobo, 0);
  const refunded = input.refunded.reduce((s, r) => s + r.kobo, 0);
  const net = paid - refunded;
  const extras = (input.extras ?? []).filter((e) => e.kobo > 0);
  const extrasKobo = extras.reduce((s, e) => s + e.kobo, 0);
  // The lines add up to what was paid; a refund line then takes it down to the total kept.
  const freight = Math.max(0, Math.min(input.freightKobo, paid - extrasKobo));
  return { paidKobo: paid, refundedKobo: refunded, netKobo: net, freightKobo: freight, feeKobo: paid - extrasKobo - freight, extras };
}

export type StatementLoad = {
  ref: string;
  route: string;
  status: string;
  fundedAt: string;
  freightKobo: number;
  feeKobo: number;
  totalKobo: number;
  held: boolean;
};

/** The four totals and the month total row. */
export function statementTotals(input: { loads: StatementLoad[]; paid: MoneyRow[]; refunds: MoneyRow[]; heldKobo: number }) {
  const sum = (rows: MoneyRow[]) => rows.reduce((s, r) => s + r.kobo, 0);
  return {
    trips: input.loads.length,
    paidKobo: sum(input.paid),
    refundsKobo: sum(input.refunds),
    heldKobo: input.heldKobo,
    freightKobo: input.loads.reduce((s, l) => s + l.freightKobo, 0),
    feeKobo: input.loads.reduce((s, l) => s + l.feeKobo, 0),
    totalKobo: input.loads.reduce((s, l) => s + l.totalKobo, 0),
  };
}

/** "2026-11" → the first instant of that month and of the next, in Lagos time (UTC+1, no DST). */
export function monthRange(month: string) {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const from = new Date(Date.UTC(y, mo - 1, 1, -1));
  const to = new Date(Date.UTC(mo === 12 ? y + 1 : y, mo === 12 ? 0 : mo, 1, -1));
  return { from, to, label: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, mo - 1, 15))), lastDay: new Date(Date.UTC(y, mo, 0)).getUTCDate() };
}
