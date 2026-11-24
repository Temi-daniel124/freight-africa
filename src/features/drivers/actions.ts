"use server";

import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { assertUnlocked } from "@/features/auth/unlock";

// The driver's own setup (ux-driver.md D-ON-03). The PIN lives in src/features/auth (D044).

async function session() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  const sessionId = typeof claims?.session_id === "string" ? claims.session_id : null;
  return { supabase, userId, sessionId };
}

type Ticket = { status: "ok"; path: string; token: string } | { status: "error" };

/** A one-time address for the driver's licence photo, in <org>/drivers/<their id>/. */
export async function licenceUploadTicket(): Promise<Ticket> {
  await assertUnlocked();
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
  await assertUnlocked();
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
