import "server-only";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import { parseJoined, type Joined } from "./roles";

// What the "Finish setting up" card on each Home shows (founder, 24 Nov 2026): the steps of that
// role's setup (A-04, T-ON-02 to T-ON-06, G-ON-01 to G-ON-04) and which are done. Steps that Phase 2
// tracks (identity, bank, trucks, licence) stay open until their slices record them.

export type SetupRole = "shipper" | "owner" | "ownerDriver" | "agent";
export type SetupStepKey = "details" | "business" | "identity" | "bank" | "truck" | "drivers" | "licence" | "agreement";
export type SetupStep = { key: SetupStepKey; done: boolean };
export type Setup = { role: SetupRole; steps: SetupStep[]; complete: boolean };

const STEPS: Record<SetupRole, SetupStepKey[]> = {
  shipper: ["details"],
  owner: ["business", "identity", "bank", "truck", "drivers"],
  ownerDriver: ["business", "identity", "bank", "truck", "licence"],
  agent: ["details", "agreement", "identity", "bank"],
};

/** Which shell role a joining choice maps to. */
export function setupRoleFor(joined: Joined): SetupRole {
  return joined === "owner_driver" ? "ownerDriver" : joined;
}

export const getMyJoining = cache(async (): Promise<{ joined: Joined | null; kinds: { shipper: boolean; transporter: boolean; drives: boolean } }> => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims?.sub;
  if (!sub) return { joined: null, kinds: { shipper: false, transporter: false, drives: false } };
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("joining_as").eq("id", sub).maybeSingle(),
    supabase.rpc("my_accounts"),
  ]);
  const owned = (rows ?? []).filter((row) => row.role === "owner");
  return {
    joined: parseJoined(profile?.joining_as),
    kinds: {
      shipper: owned.some((row) => row.kind === "shipper"),
      transporter: owned.some((row) => row.kind === "transporter"),
      drives: owned.some((row) => row.kind === "transporter" && row.is_driver),
    },
  };
});

export async function getSetup(role: SetupRole): Promise<Setup> {
  const { kinds } = await getMyJoining();
  const hasOrg = role === "shipper" ? kinds.shipper : role === "agent" ? false : kinds.transporter;
  const steps = STEPS[role].map((key) => ({ key, done: (key === "details" || key === "business") && hasOrg }));
  return { role, steps, complete: steps.every((step) => step.done) };
}
