import { z } from "zod";
import { normaliseNigerianPhone } from "@/lib/phone";

export type CodeChannel = "email" | "whatsapp";

/** The email address, trimmed and lower-cased, or null when it isn't one. */
export function parseEmail(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  return value.length <= 254 && z.email().safeParse(value).success ? value : null;
}

/** The address the code goes to, normalised (email lower-cased, phone as +234…), or null. */
export function parseDestination(channel: CodeChannel, raw: string): string | null {
  return channel === "email" ? parseEmail(raw) : normaliseNigerianPhone(raw);
}

/** Six digits, from typing or pasting ("482 916" and "482-916" both work). */
export function parseCode(raw: string, length = 6): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === length ? digits : null;
}
