"use server";

import { revalidatePath } from "next/cache";
import { assertUnlocked } from "@/features/auth/unlock";
import { supabaseServer } from "@/lib/supabase/server";

// Truck detail: the database checks owners and admins (manage_trucks, assign).

export async function pauseTruck(
  truckId: string,
  paused: boolean,
): Promise<boolean> {
  await assertUnlocked();
  const { error } = await (
    await supabaseServer()
  ).rpc(
    "set_truck_paused" as never,
    { p_truck: truckId, p_paused: paused } as never,
  );
  revalidatePath("/app/haul", "layout");
  return !error;
}

export async function assignDriver(
  truckId: string,
  driverId: string,
): Promise<boolean> {
  await assertUnlocked();
  const { error } = await (
    await supabaseServer()
  ).rpc(
    "assign_truck_driver" as never,
    { p_truck: truckId, p_driver: driverId } as never,
  );
  revalidatePath("/app/haul", "layout");
  return !error;
}
