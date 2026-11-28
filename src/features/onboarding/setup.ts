import "server-only";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import { parseJoined, type Joined } from "./roles";

// What the "Finish setting up" card on each Home shows (founder, 24 Nov 2026): the steps of that
// role's setup (A-04, T-ON-02 to T-ON-06, G-ON-01 to G-ON-04) and which are done. Steps that Phase 2
// tracks (identity, bank, trucks, licence) stay open until their slices record them.

export type SetupRole = "shipper" | "owner" | "ownerDriver" | "agent" | "driver";
export type SetupStepKey = "details" | "business" | "identity" | "bank" | "truck" | "drivers" | "licence" | "agreement" | "install" | "pin";
export type SetupStep = { key: SetupStepKey; done: boolean; optional?: boolean; href: string };
export type Setup = { role: SetupRole; steps: SetupStep[]; complete: boolean };

const STEPS: Record<SetupRole, SetupStepKey[]> = {
  // D041: the sender's identity check is optional; it earns the Verified sender badge.
  shipper: ["details", "identity"],
  owner: ["business", "identity", "bank", "truck", "drivers"],
  ownerDriver: ["business", "identity", "bank", "truck", "licence"],
  agent: ["details", "agreement", "identity", "bank"],
  // ux-driver D-ON-02 to D-ON-04, and the app-lock PIN (D042).
  driver: ["identity", "licence", "install", "pin"],
};

/** Which setup a joining choice maps to; an owner who drives gets the licence step (D043). */
export function setupRoleFor(joined: Joined, drives = false): SetupRole {
  return joined === "owner" && drives ? "ownerDriver" : joined;
}

type MyJoining = {
  joined: Joined | null;
  kyc: string;
  kinds: { shipper: boolean; transporter: boolean; drives: boolean };
  /** The transporter business this person owns: whether T-ON-02 (routes) and T-ON-04 (bank) are done. */
  transporter: { routes: boolean; bank: boolean; truck: boolean; drivers: boolean };
};

export const getMyJoining = cache(async (): Promise<MyJoining> => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims?.sub;
  if (!sub) return { joined: null, kyc: "not_started", kinds: { shipper: false, transporter: false, drives: false }, transporter: { routes: false, bank: false, truck: false, drivers: false } };
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
  const { count: drivers } = transporterId
    ? await supabase.from("drivers").select("user_id", { count: "exact", head: true }).eq("org_id", transporterId)
    : { count: 0 };
  return {
    joined: parseJoined(profile?.joining_as),
    kyc: profile?.kyc_status ?? "not_started",
    transporter: { routes: (org?.corridor_ids?.length ?? 0) > 0, bank: !!org?.default_bank_account_id, truck: (trucks ?? 0) > 0, drivers: (drivers ?? 0) > 0 },
    kinds: {
      shipper: owned.some((row) => row.kind === "shipper"),
      transporter: owned.some((row) => row.kind === "transporter"),
      // The active business decides (review): an owner or admin there with "I drive my own truck" on (D043).
      drives: (() => {
        const list = rows ?? [];
        const active = list.find((row) => row.is_active) ?? list[0];
        return !!active && active.kind === "transporter" && (active.role === "owner" || active.role === "manager") && active.is_driver;
      })(),
    },
  };
});

const PURPOSE: Record<SetupRole, string> = { shipper: "sender", owner: "owner", ownerDriver: "owner", agent: "agent", driver: "driver" };

function hrefFor(role: SetupRole, key: SetupStepKey) {
  if (key === "identity") return `/onboarding/identity/${PURPOSE[role]}`;
  if (key === "licence") return "/onboarding/licence";
  if (key === "pin") return "/auth/pin/new?next=/app/drive";
  if (key === "install") return "/onboarding/install";
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
  const needsDriver = role === "driver" || role === "ownerDriver";
  const supabase = needsDriver ? await supabaseServer() : null;
  const [{ count: licences }, { data: hasPin }, { count: installs }] = supabase
    ? await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("subject_kind", "driver").in("status", ["pending", "approved"]),
        supabase.rpc("has_app_pin"),
        // D052: only an app that opened from the home screen and checked in counts.
        supabase.from("app_installs").select("id", { count: "exact", head: true }).eq("state", "installed"),
      ])
    : [{ count: 0 }, { data: false }, { count: 0 }];
  // A check that is waiting counts as done here: the person has nothing more to do for it.
  const identitySent = kyc === "approved" || kyc === "needs_review" || kyc === "in_progress";
  const done: Partial<Record<SetupStepKey, boolean>> = {
    details: role === "shipper" ? kinds.shipper : false,
    business: kinds.transporter && transporter.routes,
    identity: identitySent,
    bank: transporter.bank,
    truck: transporter.truck,
    drivers: transporter.drivers,
    licence: (licences ?? 0) > 0,
    install: (installs ?? 0) > 0,
    pin: hasPin === true,
  };
  const steps = STEPS[role].map((key) => ({
    key,
    done: done[key] ?? false,
    optional: role === "shipper" && key === "identity",
    href: hrefFor(role, key),
  }));
  return { role, steps, complete: steps.every((step) => step.done) };
}
