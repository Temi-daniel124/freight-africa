import "server-only";
import { sendNotification, setVapidDetails } from "web-push";
import { isPushEndpoint } from "./push-endpoint";

// Web Push (TOOLING-POLICY: web-push) with VAPID keys from the environment. Without keys this
// deployment has no push: push rows fail and are retried, and the person still has the in-app copy.

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export function pushReady() {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Sends to one device. "gone" means the browser dropped the subscription, so it should be deleted. */
export async function sendPush(target: PushTarget, title: string, body: string, url = "/app"): Promise<"ok" | "gone"> {
  if (!isPushEndpoint(target.endpoint)) return "gone";
  setVapidDetails("mailto:support@freight-africa.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string, process.env.VAPID_PRIVATE_KEY as string);
  try {
    await sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, JSON.stringify({ title, body, url }), { TTL: 60 * 60 * 12 });
    return "ok";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    throw error;
  }
}
