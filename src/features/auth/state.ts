import type { CodeChannel } from "./schema";

export type SendState = {
  status: "idle" | "invalid" | "rate_limited" | "error";
  channel: CodeChannel;
  value: string;
  attempt: number;
};

export type VerifyState = {
  status: "idle" | "wrong" | "locked" | "error" | "ok";
  /** Where to go once the code is right. */
  next?: string;
  attempt: number;
};

export type ResendState = { status: "idle" | "sent" | "rate_limited" | "error"; attempt: number };
