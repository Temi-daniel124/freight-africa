"use server";

import { assertUnlocked } from "@/features/auth/unlock";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

/** T-13: the owner or a manager pauses a driver or lets them drive again (the database checks who may). */
export async function pauseDriver(driver: string, paused: boolean): Promise<void> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("set_driver_paused", { p_driver: driver, p_paused: paused });
  if (error) console.error("set_driver_paused failed", error.code);
  revalidatePath("/app/haul/drivers");
}
