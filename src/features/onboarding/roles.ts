// A-03: what a new person is joining as (D043). Drivers join through a truck owner's invite; agents
// through a link staff send them. Neither is a sign-up choice.
export const JOINING_AS = ["shipper", "owner"] as const;
export type JoiningAs = (typeof JOINING_AS)[number];

/** The version of the Terms and Privacy notice a person agrees to (the launch-time pages, Phase 7 replaces them). */
export const TERMS_VERSION = "2026-11-15";

export function parseJoiningAs(value: unknown): JoiningAs | null {
  return typeof value === "string" && (JOINING_AS as readonly string[]).includes(value) ? (value as JoiningAs) : null;
}

/** The agents master switch (agents_enabled). Agents are never offered at sign-up (D043); their link-only setup honours it. */
export function agentsEnabled() {
  return process.env.AGENTS_ENABLED !== "off";
}

export type RoleState = {
  status: "idle" | "invalid" | "error";
  /** Which parts were missing, so the form can mark them. */
  missing: { role: boolean; terms: boolean; whatsapp: boolean };
  values: { role: JoiningAs | null; terms: boolean; whatsapp: boolean; marketing: boolean };
  attempt: number;
};

/** What a profile can record (profiles.joining_as): the two A-03 choices (D043). Driving is the is_driver switch. */
export const JOINED = JOINING_AS;
export type Joined = (typeof JOINED)[number];

export function parseJoined(value: unknown): Joined | null {
  return typeof value === "string" && (JOINED as readonly string[]).includes(value) ? (value as Joined) : null;
}

/** The shell a choice opens before any organisation exists. */
export function shellFor(joined: Joined | "agent") {
  if (joined === "shipper") return "/app/ship";
  if (joined === "agent") return "/app/agent";
  return "/app/haul";
}
