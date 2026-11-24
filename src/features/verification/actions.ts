"use server";

import { assertUnlocked } from "@/features/auth/unlock";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { verificationProvider, type CheckPurpose } from "@/lib/verification/provider";

// The identity check's photo flow (demo provider, D039/D041). The photo goes straight from the phone to
// the private bucket with a one-time upload address, so it never passes through our server.

const PURPOSES: CheckPurpose[] = ["sender", "owner", "driver", "agent"];
const ID_TYPES = ["nin_slip", "national_id", "drivers_licence", "passport", "voters_card"] as const;

export type UploadTicket = { status: "ok"; path: string; token: string } | { status: "error" };
export type IdentityState = { status: "idle" | "invalid" | "sent" | "waiting" | "error"; errors: { idType?: boolean; name?: boolean; photo?: boolean } };

async function demoUser() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const { data: isDemo } = await supabase.rpc("am_i_demo");
  return { supabase, userId, provider: verificationProvider(isDemo === true) };
}

/** A one-time address to upload this person's ID photo to their own folder. */
export async function identityUploadTicket(): Promise<UploadTicket> {
  await assertUnlocked();
  const { supabase, userId, provider } = await demoUser();
  if (!userId || provider?.kind !== "demo") return { status: "error" };
  const path = `${userId}/${randomUUID()}.jpg`;
  const { data, error } = await supabase.storage.from("verification").createSignedUploadUrl(path);
  if (error || !data) {
    console.error("signed upload failed", error?.message);
    return { status: "error" };
  }
  return { status: "ok", path, token: data.token };
}

export async function submitIdentity(_previous: IdentityState, formData: FormData): Promise<IdentityState> {
  await assertUnlocked();
  const purpose = String(formData.get("purpose") ?? "") as CheckPurpose;
  const idType = String(formData.get("idType") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const photo = String(formData.get("photoPath") ?? "");
  const errors = {
    idType: !(ID_TYPES as readonly string[]).includes(idType),
    name: name.length < 2 || name.length > 120,
    photo: !photo,
  };
  if (!PURPOSES.includes(purpose) || errors.idType || errors.name || errors.photo) return { status: "invalid", errors };
  const { supabase, provider } = await demoUser();
  if (provider?.kind !== "demo") return { status: "error", errors: {} };
  const { error } = await supabase.rpc("submit_identity_check", { p_purpose: purpose, p_id_type: idType, p_name_on_id: name, p_photo_path: photo });
  if (error) {
    if (error.code === "23505") return { status: "waiting", errors: {} };
    console.error("submit_identity_check failed", error.code);
    return { status: "error", errors: {} };
  }
  return { status: "sent", errors: {} };
}
