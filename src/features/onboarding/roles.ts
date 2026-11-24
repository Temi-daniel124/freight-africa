// A-03: what a new person is joining as. "Driver" is not a choice: drivers are added by their truck owner.
export const JOINING_AS = ["shipper", "owner", "agent"] as const;
export type JoiningAs = (typeof JOINING_AS)[number];

/** The version of the Terms and Privacy notice a person agrees to (the launch-time pages, Phase 7 replaces them). */
export const TERMS_VERSION = "2026-11-15";

export function parseJoiningAs(value: unknown): JoiningAs | null {
  return typeof value === "string" && (JOINING_AS as readonly string[]).includes(value) ? (value as JoiningAs) : null;
}

/** Agents can be switched off (ux-public-and-auth.md A-03: "hidden if agents disabled"). Moves to settings later. */
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

/** What a profile can record (profiles.joining_as): the A-03 choices plus owner-drivers, who choose that in the owner setup. */
export const JOINED = ["shipper", "owner", "owner_driver", "agent"] as const;
export type Joined = (typeof JOINED)[number];

export function parseJoined(value: unknown): Joined | null {
  return typeof value === "string" && (JOINED as readonly string[]).includes(value) ? (value as Joined) : null;
}

/** The shell a choice opens before any organisation exists (owner-drivers share the owner's /app/haul). */
export function shellFor(joined: Joined) {
  if (joined === "shipper") return "/app/ship";
  if (joined === "agent") return "/app/agent";
  return "/app/haul";
}
