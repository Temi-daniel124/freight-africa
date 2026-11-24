"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { markUnlocked } from "./pin";

// The driver's own setup (ux-driver.md D-ON-03) and the app-lock PIN (D042).

async function session() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  const sessionId = typeof claims?.session_id === "string" ? claims.session_id : null;
  return { supabase, userId, sessionId };
}

export type PinResult = { status: "ok" | "wrong" | "locked" | "weak" | "fresh" | "error"; left?: number };

export async function setPin(pin: string): Promise<PinResult> {
  const { supabase, userId, sessionId } = await session();
  if (!userId || !sessionId) return { status: "error" };
  const { error } = await supabase.rpc("set_app_pin", { p_pin: pin });
  if (error) return { status: error.code === "22023" ? "weak" : error.code === "28000" ? "fresh" : "error" };
  await markUnlocked(userId, sessionId);
  return { status: "ok" };
}

export async function unlockWithPin(pin: string, attemptsSoFar: number): Promise<PinResult> {
  const { supabase, userId, sessionId } = await session();
  if (!userId || !sessionId) return { status: "error" };
  const { data, error } = await supabase.rpc("check_app_pin", { p_pin: pin });
  if (error) return { status: "error" };
  if (data === "ok") {
    await markUnlocked(userId, sessionId);
    return { status: "ok" };
  }
  if (data === "locked") return { status: "locked" };
  if (data === "none") return { status: "ok" };
  return { status: "wrong", left: Math.max(0, 4 - attemptsSoFar) };
}

/** Locked out: sign out, so the next sign-in (with a code) allows a new PIN. */
export async function signOutForNewPin() {
  const { supabase } = await session();
  await supabase.auth.signOut();
  redirect("/auth?next=/onboarding/pin");
}

type Ticket = { status: "ok"; path: string; token: string } | { status: "error" };

/** A one-time address for the driver's licence photo, in <org>/drivers/<their id>/. */
export async function licenceUploadTicket(): Promise<Ticket> {
  const { supabase, userId } = await session();
  if (!userId) return { status: "error" };
  const { data: driver } = await supabase.from("drivers").select("org_id").eq("user_id", userId).maybeSingle();
  if (!driver) return { status: "error" };
  const path = `${driver.org_id}/drivers/${userId}/${randomUUID()}.jpg`;
  const { data, error } = await supabase.storage.from("fleet").createSignedUploadUrl(path);
  if (error || !data) return { status: "error" };
  return { status: "ok", path, token: data.token };
}

export type LicenceState = { status: "idle" | "invalid" | "sent" | "error"; errors: { photo?: boolean; expires?: "missing" | "expired"; number?: boolean } };

export async function sendLicence(_previous: LicenceState, formData: FormData): Promise<LicenceState> {
  const photo = String(formData.get("licence") ?? "");
  const expires = String(formData.get("expires") ?? "");
  const number = String(formData.get("number") ?? "").toUpperCase().replace(/\s+/g, "");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
  const errors: LicenceState["errors"] = {
    photo: !photo,
    expires: !/^\d{4}-\d{2}-\d{2}$/.test(expires) ? "missing" : expires <= today ? "expired" : undefined,
    number: !!number && !/^[A-Z0-9-]{5,20}$/.test(number),
  };
  if (errors.photo || errors.expires || errors.number) return { status: "invalid", errors };
  const { supabase } = await session();
  const { error } = await supabase.rpc("add_driver_licence", { p_photo: photo, p_expires_on: expires, p_number: number || undefined });
  if (error) {
    console.error("add_driver_licence failed", error.code);
    return { status: "error", errors: {} };
  }
  return { status: "sent", errors: {} };
}
