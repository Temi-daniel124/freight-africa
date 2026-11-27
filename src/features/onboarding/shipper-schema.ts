import { z } from "zod";

// A-04 input (a "use server" file may only export async functions, so the schema lives here).
export const shipperSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    as: z.enum(["myself", "business"]),
    businessName: z.string().trim().max(120),
    // Same shape the database checks: up to 4 letters then digits (RC1234567, BN123456).
    cac: z.string().trim().toUpperCase().regex(/^([A-Z]{0,4}[0-9]{1,12})?$/),
  })
  .refine((v) => v.as === "myself" || v.businessName.length >= 2, { path: ["businessName"] });
