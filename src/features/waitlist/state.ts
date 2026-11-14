import type { WaitlistField } from "./schema";

export type WaitlistValues = {
  name: string;
  phone: string;
  email: string;
  role: string;
  corridors: string[];
  trucks: string;
  consent: boolean;
  source: string;
};

export type WaitlistState = {
  status: "idle" | "invalid" | "joined" | "duplicate" | "rate_limited" | "error";
  errors: Partial<Record<WaitlistField, true>>;
  values: WaitlistValues;
  firstName?: string;
  phone?: string;
  email?: string;
  attempt: number;
};
