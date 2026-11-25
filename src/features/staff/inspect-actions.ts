"use server";

import { revalidatePath } from "next/cache";
import { assertUnlocked } from "@/features/auth/unlock";
import { supabaseServer } from "@/lib/supabase/server";

/** X-30: the field agent's checklist and verdict (the database checks it's their task and aal2). */
export async function completeInspection(taskId: string, checks: Record<string, boolean>, pass: boolean, note: string): Promise<boolean> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("complete_inspection", { p_task: taskId, p_checks: checks, p_photos: [], p_pass: pass, p_note: note });
  revalidatePath("/admin/tasks");
  return !error;
}

/** Verification sends a field agent to look at a truck. */
export async function sendInspection(truckId: string, agentId: string): Promise<boolean> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("create_inspection", { p_truck: truckId, p_agent: agentId, p_due: new Date(Date.now() + 2 * 86400000).toISOString() });
  revalidatePath("/admin/verification");
  return !error;
}
