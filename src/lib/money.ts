// Display only. Money is stored and calculated in kobo on the server (AGENT.md section 3).
export const nairaFormat = { style: "currency", currency: "NGN", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 } as const;

const formatter = new Intl.NumberFormat("en-NG", nairaFormat);

export function formatNaira(naira: number) {
  return formatter.format(naira);
}
