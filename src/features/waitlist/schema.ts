import { z } from "zod";
import { normaliseNigerianPhone } from "@/lib/phone";

export const corridorSlugs = ["lagos-kano", "lagos-abuja", "lagos-onitsha-aba", "eastern-loop"] as const;
export const waitlistRoles = ["shipper", "owner", "agent"] as const;

export type WaitlistRole = (typeof waitlistRoles)[number];
export type WaitlistField = "name" | "phone" | "email" | "role" | "trucks" | "consent";

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
    let trucks: number | null = null;
    if (data.role === "owner") {
      trucks = Number(data.trucks);
      if (!Number.isInteger(trucks) || trucks < 1 || trucks > 1000) {
        ctx.addIssue({ code: "custom", message: "trucks", path: ["trucks"] });
        return z.NEVER;
      }
    }
    return { ...data, trucks, source: data.source || "website" };
  });

export type WaitlistInput = z.input<typeof waitlistSchema>;
export type WaitlistData = z.output<typeof waitlistSchema>;
