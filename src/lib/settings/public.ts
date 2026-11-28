import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Settings that signed-in screens and PDFs show (D056). Settings are staff-only under RLS, so these are
// read with the service key, a few named keys only, never the whole table.
const KEYS = ["company_postal_address", "support_phone", "vat_on_service_fee"] as const;
type Key = (typeof KEYS)[number];

export async function publicSettings(): Promise<{ postalAddress: string; supportPhone: string; vatOnServiceFee: boolean }> {
  const { data } = await supabaseAdmin().from("settings").select("key, value").in("key", [...KEYS]);
  const get = (key: Key) => data?.find((row) => row.key === key)?.value;
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return { postalAddress: text(get("company_postal_address")), supportPhone: text(get("support_phone")), vatOnServiceFee: get("vat_on_service_fee") === true };
}

/** The FROM block on every PDF: name, postal address when set (D056), email. */
export async function companyLines(): Promise<string[]> {
  const { postalAddress } = await publicSettings();
  return ["Freight Africa", ...(postalAddress ? postalAddress.split(/\n|,\s*/).filter(Boolean) : []), "hello@freight-africa.com"];
}
