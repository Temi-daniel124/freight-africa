import { normaliseNigerianPhone } from "@/lib/phone";
import { parseEmail } from "./schema";

/** An email (lower-cased) or a Nigerian mobile number (as 2348031234567, how accounts store it). */
export function parseLogin(raw: string): { kind: "email" | "phone"; login: string } | null {
  const value = raw.trim();
  if (value.includes("@")) {
    const email = parseEmail(value);
    return email ? { kind: "email", login: email } : null;
  }
  const phone = normaliseNigerianPhone(value);
  return phone ? { kind: "phone", login: phone.replace(/^\+/, "") } : null;
}

