"use server";

import { revalidatePath } from "next/cache";
import { assertUnlocked } from "@/features/auth/unlock";
import { processMoneyOut } from "@/features/money/money-out";
import { supabaseServer } from "@/lib/supabase/server";

// X03b Take action and Add note. The database checks the staff role, two-step sign-in and the reason,
// and writes the audit log; this only passes them on.

export async function staffTripAction(tripId: string, step: "loaded" | "delivered" | "release", reason: string, weightTonnes?: number, quantity?: number): Promise<{ status: "ok" | "reason" | "wait" | "error" }> {
  await assertUnlocked();
  if (reason.trim().length < 5) return { status: "reason" };
  const { error } = await (await supabaseServer()).rpc("staff_trip_action", {
    p_trip: tripId,
    p_step: step,
    p_reason: reason.trim(),
    p_weight_kg: weightTonnes ? Math.round(weightTonnes * 1000) : undefined,
    p_quantity: quantity || undefined,
  });
  if (error) return { status: error.message.includes("problem window") ? "wait" : "error" };
  await processMoneyOut();
  revalidatePath("/admin/trips");
  return { status: "ok" };
}

export async function staffTripNote(tripId: string, note: string): Promise<{ status: "ok" | "error" }> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("staff_trip_note", { p_trip: tripId, p_note: note.trim() });
  if (error) return { status: "error" };
  revalidatePath("/admin/trips");
  return { status: "ok" };
}
