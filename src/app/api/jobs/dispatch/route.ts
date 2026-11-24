import { timingSafeEqual } from "node:crypto";
import { resendEmailSender } from "@/lib/email/sender";
import { serverEnv } from "@/lib/env.server";
import { dispatchNotifications, type Claimed } from "@/lib/jobs/dispatch";
import { processMoneyOut } from "@/features/money/money-out";
import { supabaseAdmin } from "@/lib/supabase/admin";

// POST /api/jobs/dispatch: called every minute by pg_cron through pg_net with JOBS_SECRET
// (ARCHITECTURE.md §2). Anyone else gets 401. The secret-key client is needed because the queue
// functions are service-role only.

function authorised(request: Request) {
  const secret = serverEnv().JOBS_SECRET;
  const given = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const wanted = Buffer.from(secret ?? "");
  // Compared in bytes, so a header with non-ASCII characters is a plain 401, not an error.
  if (!secret || given.length !== wanted.length) return false;
  return timingSafeEqual(given, wanted);
}

export async function POST(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });
  const admin = supabaseAdmin();
  let email: ((to: string, subject: string, text: string, id: string) => Promise<string | undefined>) | undefined;
  try {
    const sender = resendEmailSender();
    email = async (to, subject, text, id) => {
      await sender.send({ to, subject, text, html: `<p>${text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)}</p>`, idempotencyKey: `notification:${id}` });
      return undefined;
    };
  } catch {
    email = undefined; // Email isn't set up here: email rows fail and are retried, never dropped.
  }
  const counts = await dispatchNotifications({
    claim: async (limit) => {
      const { data, error } = await admin.rpc("claim_notifications", { p_limit: limit });
      if (error) throw new Error(`claim failed: ${error.code}`);
      return (data ?? []) as Claimed[];
    },
    template: async (code, channel, language) => {
      const { data } = await admin
        .from("message_templates")
        .select("subject, body")
        .eq("code", code)
        .eq("channel", channel)
        .eq("language", language as "en")
        .maybeSingle();
      return data;
    },
    // If the result can't be recorded, try once more, then stop the run: the row stays claimed and is
    // not re-sent past five attempts (claim_notifications), and the email's idempotency key stops a repeat.
    finish: async (id, outcome) => {
      const report = () => admin.rpc("finish_notification", { p_id: id, p_result: outcome.result, p_provider_message_id: outcome.providerId, p_error: outcome.error });
      const { error } = await report();
      if (error && (await report()).error) throw new Error(`finish failed: ${error.code}`);
    },
    email,
  });
  // SYSTEM-LOGIC §7.5: queued payouts and refunds go out on the same minute tick.
  const money = await processMoneyOut().catch(() => null);
  return Response.json({ ...counts, money });
}
