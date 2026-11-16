import { z } from "zod";
import { signInOptions } from "@/features/auth/options";
import { whatsAppCodeMessenger } from "@/lib/notify/whatsapp";
import { verifyStandardWebhook } from "@/lib/webhooks/standard";

// Supabase Auth "Send SMS" hook: Supabase creates the phone code and calls this route, which delivers it
// on WhatsApp (A-01). Switched off until the founder's WhatsApp number exists (AUTH_WHATSAPP=on).
const payloadSchema = z.object({
  user: z.object({ phone: z.string().regex(/^\+?234[789][01]\d{8}$/) }),
  sms: z.object({ otp: z.string().regex(/^\d{6,10}$/) }),
});

const refuse = (status: number, message: string) => Response.json({ error: { http_code: status, message } }, { status });

export async function POST(request: Request) {
  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!signInOptions().whatsapp || !secret) return refuse(503, "WhatsApp codes are switched off");

  // The signature covers the exact bytes sent, so read the raw text before parsing.
  const rawBody = await request.text();
  const signed = verifyStandardWebhook(
    rawBody,
    {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    },
    secret,
  );
  if (!signed) return refuse(401, "Bad signature");

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return refuse(400, "Bad request");
  }
  const payload = payloadSchema.safeParse(json);
  if (!payload.success) return refuse(400, "Bad request");

  try {
    const phone = payload.data.user.phone;
    await whatsAppCodeMessenger().sendCode(phone.startsWith("+") ? phone : `+${phone}`, payload.data.sms.otp);
  } catch (error) {
    console.error("whatsapp code delivery failed", error instanceof Error ? error.message : "unknown");
    return refuse(502, "Could not deliver the code");
  }
  return Response.json({});
}
