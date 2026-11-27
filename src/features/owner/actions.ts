"use server";

import { revalidatePath } from "next/cache";
import { assertUnlocked } from "@/features/auth/unlock";
import { supabaseServer } from "@/lib/supabase/server";

// Owner actions (slice 6). The database decides who may do what.

export async function changeTripDriver(tripId: string, driverId: string, reason: string): Promise<{ status: "ok" | "late" | "error" }> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("change_trip_driver", { p_trip: tripId, p_driver: driverId, p_reason: reason || undefined });
  revalidatePath(`/app/haul/trips/${tripId}`);
  if (!error) return { status: "ok" };
  return { status: error.code === "22023" && error.message.includes("loaded") ? "late" : "error" };
}

export async function replyToDriver(messageId: string, reply: string): Promise<{ status: "ok" | "error" }> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("reply_driver_message", { p_id: messageId, p_reply: reply });
  revalidatePath("/app/haul/messages");
  return { status: error ? "error" : "ok" };
}

export async function markDriverMessageRead(messageId: string) {
  await assertUnlocked();
  await (await supabaseServer()).rpc("read_driver_message", { p_id: messageId });
}

/** DV32b: a driver messages their own business (send_driver_message checks it's their business). */
export async function sendDriverMessage(input: { org: string; reason: "repair" | "day_off" | "papers" | "other"; body: string; voicePath?: string; voiceSeconds?: number }): Promise<{ status: "ok" | "limit" | "error" }> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("send_driver_message", {
    p_org: input.org,
    p_reason: input.reason,
    p_body: input.body || undefined,
    p_voice_path: input.voicePath,
    p_voice_seconds: input.voiceSeconds,
  });
  if (!error) return { status: "ok" };
  return { status: error.message.includes("too many") ? "limit" : "error" };
}
