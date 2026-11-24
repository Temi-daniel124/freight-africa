import "server-only";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import { parseJoined, type Joined } from "./roles";

// What the "Finish setting up" card on each Home shows (founder, 24 Nov 2026): the steps of that
// role's setup (A-04, T-ON-02 to T-ON-06, G-ON-01 to G-ON-04) and which are done. Steps that Phase 2
// tracks (identity, bank, trucks, licence) stay open until their slices record them.

export type SetupRole = "shipper" | "owner" | "ownerDriver" | "agent";
export type SetupStepKey = "details" | "business" | "identity" | "bank" | "truck" | "drivers" | "licence" | "agreement";
export type SetupStep = { key: SetupStepKey; done: boolean; optional?: boolean; href: string };
export type Setup = { role: SetupRole; steps: SetupStep[]; complete: boolean };

const STEPS: Record<SetupRole, SetupStepKey[]> = {
  // D041: the sender's identity check is optional; it earns the Verified sender badge.
  shipper: ["details", "identity"],
  owner: ["business", "identity", "bank", "truck", "drivers"],
  ownerDriver: ["business", "identity", "bank", "truck", "licence"],
  agent: ["details", "agreement", "identity", "bank"],
};

/** Which shell role a joining choice maps to. */
export function setupRoleFor(joined: Joined): SetupRole {
  return joined === "owner_driver" ? "ownerDriver" : joined;
}

type MyJoining = {
  joined: Joined | null;
  kyc: string;
  kinds: { shipper: boolean; transporter: boolean; drives: boolean };
  /** The transporter business this person owns: whether T-ON-02 (routes) and T-ON-04 (bank) are done. */
  transporter: { routes: boolean; bank: boolean; truck: boolean };
};

export const getMyJoining = cache(async (): Promise<MyJoining> => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims?.sub;
  if (!sub) return { joined: null, kyc: "not_started", kinds: { shipper: false, transporter: false, drives: false }, transporter: { routes: false, bank: false, truck: false } };
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("joining_as, kyc_status").eq("id", sub).maybeSingle(),
    supabase.rpc("my_accounts"),
  ]);
  const owned = (rows ?? []).filter((row) => row.role === "owner");
  const transporterId = owned.find((row) => row.kind === "transporter")?.org_id;
  const { data: org } = transporterId
    ? await supabase.from("organizations").select("corridor_ids, default_bank_account_id").eq("id", transporterId).maybeSingle()
    : { data: null };
  const { count: trucks } = transporterId
    ? await supabase.from("trucks").select("id", { count: "exact", head: true }).eq("org_id", transporterId).neq("status", "retired")
    : { count: 0 };
  return {
    joined: parseJoined(profile?.joining_as),
    kyc: profile?.kyc_status ?? "not_started",
    transporter: { routes: (org?.corridor_ids?.length ?? 0) > 0, bank: !!org?.default_bank_account_id, truck: (trucks ?? 0) > 0 },
    kinds: {
      shipper: owned.some((row) => row.kind === "shipper"),
      transporter: owned.some((row) => row.kind === "transporter"),
      drives: owned.some((row) => row.kind === "transporter" && row.is_driver),
    },
  };
});

const PURPOSE: Record<SetupRole, string> = { shipper: "sender", owner: "owner", ownerDriver: "owner", agent: "agent" };

function hrefFor(role: SetupRole, key: SetupStepKey) {
  if (key === "identity") return `/onboarding/identity/${PURPOSE[role]}`;
  if (role === "shipper") return "/onboarding/shipper";
  if (role === "agent") return "/onboarding/agent";
  if (key === "business") return "/onboarding/owner?step=about";
  if (key === "bank") return "/onboarding/owner?step=bank";
  // Trucks, drivers and the licence get their own screens in the next slices.
  if (key === "truck") return "/app/haul/trucks/new";
  if (key === "drivers") return "/app/haul/drivers";
  return "/onboarding/owner";
}

export async function getSetup(role: SetupRole): Promise<Setup> {
  const { kinds, kyc, transporter } = await getMyJoining();
  // A check that is waiting counts as done here: the person has nothing more to do for it.
  const identitySent = kyc === "approved" || kyc === "needs_review" || kyc === "in_progress";
  const done: Partial<Record<SetupStepKey, boolean>> = {
    details: role === "shipper" ? kinds.shipper : false,
    business: kinds.transporter && transporter.routes,
    identity: identitySent,
    bank: transporter.bank,
    truck: transporter.truck,
  };
  const steps = STEPS[role].map((key) => ({
    key,
    done: done[key] ?? false,
    optional: role === "shipper" && key === "identity",
    href: hrefFor(role, key),
  }));
  return { role, steps, complete: steps.every((step) => step.done) };
}
