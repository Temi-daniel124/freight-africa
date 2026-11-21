import { normaliseNigerianPhone } from "@/lib/phone";

/** One box for "phone number or email" (S-20): a Nigerian mobile number, or an email address. */
export function parseContact(raw: string): { phone: string } | { email: string } | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.includes("@")) {
    const email = value.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? { email } : null;
  }
  const phone = normaliseNigerianPhone(value);
  return phone ? { phone } : null;
}
