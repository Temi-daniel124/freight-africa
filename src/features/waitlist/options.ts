// Plain lists shared by the form (browser) and the schema (server). Kept apart from schema.ts so the
// browser bundle doesn't pull in zod.
export const corridorSlugs = ["lagos-kano", "lagos-abuja", "lagos-onitsha-aba", "eastern-loop"] as const;
export const waitlistRoles = ["shipper", "owner", "agent"] as const;

export type WaitlistRole = (typeof waitlistRoles)[number];
