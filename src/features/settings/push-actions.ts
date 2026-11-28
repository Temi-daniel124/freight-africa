"use server";

import { assertUnlocked } from "@/features/auth/unlock";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

// Turning on push on this device (N-02). The browser's subscription is stored for the signed-in person
// only; the table has no insert right for people, so the server writes it with the service key.

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function savePushSubscription(sub: Sub, userAgent: string): Promise<boolean> {
  await assertUnlocked();
  const { data } = await (await supabaseServer()).auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string") return false;
  if (!/^https:\/\//.test(sub?.endpoint ?? "") || sub.endpoint.length > 1000 || !sub.keys?.p256dh || !sub.keys?.auth || sub.keys.p256dh.length > 200 || sub.keys.auth.length > 100) return false;
  const { error } = await supabaseAdmin()
    .from("push_subscriptions")
    .upsert({ user_id: userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_agent: userAgent.slice(0, 512) }, { onConflict: "endpoint" });
  return !error;
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await assertUnlocked();
  const { data } = await (await supabaseServer()).auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string") return;
  await supabaseAdmin().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
}
