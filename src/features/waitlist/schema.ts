import { z } from "zod";
import { normaliseNigerianPhone } from "@/lib/phone";

import { corridorSlugs, waitlistRoles } from "./options";

export { corridorSlugs, waitlistRoles, type WaitlistRole } from "./options";
export type WaitlistField = "name" | "phone" | "email" | "role" | "trucks" | "consent";

// Truck owners give a whole number of trucks from 1 to 1000; everyone else gives none.
// Returns the number, null when not needed, or "invalid". Also used by the action so this error
// shows together with the others (object-level checks only run once every field parses).
export function checkTrucks(role: string, trucks: string | undefined): number | null | "invalid" {
  if (role !== "owner") return null;
  const count = Number(trucks?.trim() || NaN);
  return Number.isInteger(count) && count >= 1 && count <= 1000 ? count : "invalid";
}

// Error messages are field names; the form shows the matching text from en.json.
export const waitlistSchema = z
  .object({
    name: z.string().trim().min(2, { error: "name" }).max(120, { error: "name" }),
    phone: z.string().transform((value, ctx) => {
      const phone = normaliseNigerianPhone(value);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: "phone" });
        return z.NEVER;
      }
      return phone;
    }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, { error: "email" })
      .refine((value) => value === "" || z.email().safeParse(value).success, { error: "email" })
      .transform((value) => value || null),
    role: z.enum(waitlistRoles, { error: "role" }),
    corridors: z.array(z.enum(corridorSlugs)).max(corridorSlugs.length),
    trucks: z.string().trim().optional(),
    consent: z.literal("on", { error: "consent" }),
    source: z
      .string()
      .trim()
      .max(64)
      .regex(/^[a-z0-9_.-]*$/i)
      .optional()
      .catch(undefined),
  })
  .transform((data, ctx) => {
    const trucks = checkTrucks(data.role, data.trucks);
    if (trucks === "invalid") {
      ctx.addIssue({ code: "custom", message: "trucks", path: ["trucks"] });
      return z.NEVER;
    }
    return { ...data, trucks, source: data.source || "website" };
  });

export type WaitlistInput = z.input<typeof waitlistSchema>;
export type WaitlistData = z.output<typeof waitlistSchema>;
