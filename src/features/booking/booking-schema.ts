import { z } from "zod";

// S-02 booking input, shared by the form and the server action (a "use server" file may only export
// async functions, so the schema lives here).

const stop = z.object({
  city: z.uuid(),
  address: z.string().trim().min(3).max(200),
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(20).optional(),
});

// D055: one to ten items; each is tonnes or a count (with an optional weight each), and a value.
const item = z
  .object({
    goods: z.uuid(),
    description: z.string().trim().min(2).max(120),
    kind: z.enum(["tonnes", "count"]),
    amount: z.number().int().positive().max(1_000_000),
    unit: z.enum(["bags", "cartons", "pieces", "drums", "head"]).optional(),
    unitWeightKg: z.number().int().positive().max(5000).optional(),
    valueNaira: z.number().int().nonnegative().max(100_000_000_000),
  })
  .refine((v) => v.kind === "tonnes" || v.unit, { path: ["unit"] });

export const bookingSchema = z.object({
  org: z.uuid(),
  truckType: z.uuid(),
  pickupFrom: z.iso.datetime({ offset: true }),
  pickupUntil: z.iso.datetime({ offset: true }),
  stops: z.array(stop).min(2).max(5),
  items: z.array(item).min(1).max(10),
  note: z.string().trim().max(300).optional(),
  /** D047: the sender's own price in naira, fee included; absent books at our price. */
  offerNaira: z.number().int().positive().max(100_000_000_000).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type BookingItem = z.infer<typeof item>;

