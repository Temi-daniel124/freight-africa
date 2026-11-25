"use server";

import { revalidatePath } from "next/cache";
import { assertUnlocked } from "@/features/auth/unlock";
import { supabaseServer } from "@/lib/supabase/server";

export async function saveTracker(truckId: string, device: string): Promise<{ status: "ok" | "invalid" | "taken" | "error" }> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("set_truck_tracker", { p_truck: truckId, p_device: device });
  revalidatePath(`/app/haul/trucks/${truckId}`);
  if (!error) return { status: "ok" };
  return { status: error.code === "22023" ? "invalid" : error.code === "23505" ? "taken" : "error" };
}

export async function trackerSignal(truckId: string): Promise<{ at: string; lat: number; lng: number } | null> {
  await assertUnlocked();
  const { data } = await (await supabaseServer()).rpc("truck_signal", { p_truck: truckId });
  const row = (data as unknown as { at: string | null; lat: number | null; lng: number | null }[] | null)?.[0];
  return row?.at && row.lat !== null && row.lng !== null ? { at: row.at, lat: row.lat, lng: row.lng } : null;
}
