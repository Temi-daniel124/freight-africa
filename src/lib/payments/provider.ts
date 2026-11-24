import "server-only";
import { demoAllowed } from "@/lib/verification/provider";

// Payments sit behind this interface (AGENT.md §6; D039). Business code never imports a vendor SDK.
// The demo provider works off production or for demo accounts; Bachs switches on when its keys and
// API documentation arrive (PROJECT-STATE §4). Ledger postings are real either way (D039).

export type Bank = { code: string; name: string };

export type PaymentProvider = {
  kind: "demo" | "bachs";
  banks: () => Promise<Bank[]>;
  /** The account holder's name as the bank has it (NIBSS name enquiry), or null if the account doesn't exist. */
  resolveAccount: (input: { bankCode: string; accountNumber: string; demoName: string }) => Promise<string | null>;
};

// Common Nigerian banks and their CBN codes, for the demo. Bachs's own bank list replaces it.
const DEMO_BANKS: Bank[] = [
  { code: "044", name: "Access Bank" },
  { code: "023", name: "Citibank" },
  { code: "050", name: "Ecobank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank" },
  { code: "214", name: "FCMB" },
  { code: "058", name: "GTBank" },
  { code: "030", name: "Heritage Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "50211", name: "Kuda" },
  { code: "50515", name: "Moniepoint" },
  { code: "999992", name: "OPay" },
  { code: "999991", name: "PalmPay" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "221", name: "Stanbic IBTC" },
  { code: "232", name: "Sterling Bank" },
  { code: "032", name: "Union Bank" },
  { code: "033", name: "UBA" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];

const demo: PaymentProvider = {
  kind: "demo",
  banks: async () => DEMO_BANKS,
  // The demo bank answers with the person's own name, so the match can be tried; any number starting
  // 99 belongs to a stranger, so the "doesn't match" path can be tried too. 0000000000 doesn't exist.
  resolveAccount: async ({ accountNumber, demoName }) => {
    if (accountNumber === "0000000000") return null;
    if (accountNumber.startsWith("99")) return "CHUKWUDI OBI";
    return demoName.toUpperCase();
  },
};

/** The provider serving this person, or null when none is ready (production, a real account, no Bachs keys). */
export function paymentProvider(isDemoAccount: boolean): PaymentProvider | null {
  if (process.env.BACHS_API_KEY && process.env.BACHS_BASE_URL) {
    // Built when the Bachs keys and API documentation exist (PROJECT-STATE §4).
    return null;
  }
  return demoAllowed(isDemoAccount) ? demo : null;
}
