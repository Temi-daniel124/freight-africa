"use server";

import { revalidatePath } from "next/cache";
import { assertUnlocked } from "@/features/auth/unlock";
import { supabaseServer } from "@/lib/supabase/server";

// P16d saved places and receivers, P16g business profile, P16f notifications. The database decides who
// may change what (save_place, save_receiver, delete_saved, update_business_profile).

type Result = { status: "ok" | "invalid" | "error" };

const phone = (raw?: string) => {
  const digits = (raw ?? "").replace(/\D/g, "").replace(/^234/, "").replace(/^0/, "");
  return /^[789][01]\d{8}$/.test(digits) ? `+234${digits}` : null;
};

export async function savePlace(input: { org: string; id?: string; label: string; city: string; address: string; landmark?: string; contactName?: string; contactPhone?: string }): Promise<Result> {
  await assertUnlocked();
  if (input.label.trim().length < 1 || input.address.trim().length < 3 || !input.city) return { status: "invalid" };
  const contact = input.contactPhone?.trim() ? phone(input.contactPhone) : null;
  if (input.contactPhone?.trim() && !contact) return { status: "invalid" };
  const { error } = await (await supabaseServer()).rpc("save_place", {
    p_org: input.org,
    p_id: input.id ?? undefined,
    p_label: input.label,
    p_city: input.city,
    p_address: input.address,
    p_landmark: input.landmark || undefined,
    p_contact_name: input.contactName || undefined,
    p_contact_phone: contact ?? undefined,
  } as never);
  revalidatePath("/app/ship/places");
  return { status: error ? (error.code === "22023" || error.code === "23514" ? "invalid" : "error") : "ok" };
}

export async function saveReceiver(input: { org: string; id?: string; name: string; phone: string; email?: string }): Promise<Result> {
  await assertUnlocked();
  const p = phone(input.phone);
  if (!input.name.trim() || !p) return { status: "invalid" };
  const { error } = await (await supabaseServer()).rpc("save_receiver", { p_org: input.org, p_id: input.id ?? undefined, p_name: input.name, p_phone: p, p_email: input.email || undefined } as never);
  revalidatePath("/app/ship/places");
  return { status: error ? (error.code === "23514" || error.code === "23505" ? "invalid" : "error") : "ok" };
}

export async function deleteSaved(kind: "place" | "receiver", id: string): Promise<Result> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("delete_saved", { p_kind: kind, p_id: id });
  revalidatePath("/app/ship/places");
  return { status: error ? "error" : "ok" };
}

export async function updateBusiness(input: { org: string; name: string; cac: string; address: string; email: string }): Promise<Result> {
  await assertUnlocked();
  const cac = input.cac.replace(/\s+/g, "");
  if (!input.name.trim() || (cac && !/^[A-Za-z]{0,4}[0-9]{1,12}$/.test(cac))) return { status: "invalid" };
  if (input.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) return { status: "invalid" };
  const { error } = await (await supabaseServer()).rpc("update_business_profile", {
    p_org: input.org,
    p_name: input.name,
    p_cac_number: cac,
    p_receipt_address: input.address,
    p_receipt_email: input.email,
  });
  revalidatePath("/app/ship", "layout");
  return { status: error ? (error.code === "23514" ? "invalid" : "error") : "ok" };
}

export async function setNotification(event: string, channel: "email" | "push", enabled: boolean): Promise<Result> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("set_notification_preference", { p_event: event, p_channel: channel, p_enabled: enabled });
  return { status: error ? "error" : "ok" };
}
