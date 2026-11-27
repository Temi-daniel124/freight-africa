// Pure builders for the sender receipt and statement (no I/O), so the tests can check that every amount
// printed comes from the money rows and adds up.

export type MoneyRow = { kobo: number };

/** A receipt's lines: what the truck and driver get and our service fee, always adding up to the money kept. */
export function receiptLines(input: { paid: MoneyRow[]; refunded: MoneyRow[]; freightKobo: number }) {
  const paid = input.paid.reduce((s, r) => s + r.kobo, 0);
  const refunded = input.refunded.reduce((s, r) => s + r.kobo, 0);
  const net = paid - refunded;
  const freight = Math.min(input.freightKobo, net);
  return { paidKobo: paid, refundedKobo: refunded, netKobo: net, freightKobo: freight, feeKobo: net - freight };
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
