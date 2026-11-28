// The job dispatcher's notification step (ARCHITECTURE.md §2, §3.4). pg_cron calls /api/jobs/dispatch
// every minute; this claims queued notifications once each, sends them, and reports every result back.
// Providers are passed in, so the tests run it without sending anything.

export type Claimed = {
  id: string;
  event: string;
  channel: "whatsapp" | "sms" | "email" | "push" | "in_app";
  template_code: string;
  language: string;
  payload: unknown;
  to_phone: string | null;
  to_email: string | null;
  attempts: number;
};

export type Template = { subject: string | null; body: string };
export type Result = { result: "sent" | "failed" | "skipped"; providerId?: string; error?: string };

export type DispatchDeps = {
  claim: (limit: number) => Promise<Claimed[]>;
  template: (code: string, channel: Claimed["channel"], language: string) => Promise<Template | null>;
  finish: (id: string, outcome: Result) => Promise<void>;
  /** The email sender, when this deployment has one. Its last argument is the notification id, used as
   *  the provider's idempotency key so a retry never sends twice. */
  email?: (to: string, subject: string, text: string, id: string) => Promise<string | undefined>;
  /** SMS (the demo provider until an SMS account exists, D039). Returns the provider's message id. */
  sms?: (to: string, text: string, id: string) => Promise<string>;
  /** Push to every device the notification's person turned on; the number of devices reached (0: none). */
  push?: (id: string, title: string, body: string) => Promise<number>;
};

/** Fills {{name}} from the payload; unknown names stay empty (never "undefined"). */
export function render(body: string, payload: unknown) {
  const values = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return body.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, name: string) => {
    const value = values[name];
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
  });
}

// Errors go back to the database as a short reason; nothing that could hold personal data.
const reason = (error: unknown) => (error instanceof Error ? error.message : "send failed").slice(0, 200);

export async function dispatchNotifications(deps: DispatchDeps, limit = 25) {
  const claimed = await deps.claim(limit);
  const counts = { claimed: claimed.length, sent: 0, failed: 0, skipped: 0 };
  for (const row of claimed) {
    let outcome: Result;
    try {
      const template = await deps.template(row.template_code, row.channel, row.language);
      // A missing template or an email sender that isn't set up here is a fault to fix, not a reason to
      // drop the message: it fails and is retried (then marked failed for staff to see), never skipped.
      if (!template) outcome = { result: "failed", error: "no template for this channel" };
      else if (row.channel === "email") {
        if (!deps.email) outcome = { result: "failed", error: "email is not set up on this deployment" };
        else if (!row.to_email) outcome = { result: "skipped", error: "no email address" };
        else {
          const providerId = await deps.email(row.to_email, render(template.subject ?? "Freight Africa", row.payload), render(template.body, row.payload), row.id);
          outcome = { result: "sent", providerId };
        }
      } else if (row.channel === "sms") {
        if (!deps.sms) outcome = { result: "failed", error: "sms is not set up on this deployment" };
        else if (!row.to_phone) outcome = { result: "skipped", error: "no phone number" };
        else outcome = { result: "sent", providerId: await deps.sms(row.to_phone, render(template.body, row.payload), row.id) };
      } else if (row.channel === "push") {
        if (!deps.push) outcome = { result: "failed", error: "push is not set up on this deployment" };
        else {
          const reached = await deps.push(row.id, render(template.subject ?? "Freight Africa", row.payload), render(template.body, row.payload));
          // No device turned on is not a fault: the in-app copy is there.
          outcome = reached > 0 ? { result: "sent" } : { result: "skipped", error: "push not turned on" };
        }
      } else if (row.channel === "whatsapp") outcome = { result: "skipped", error: "WhatsApp is off" };
      else outcome = { result: "skipped", error: `${row.channel} is delivered in the app` };
    } catch (error) {
      outcome = { result: "failed", error: reason(error) };
    }
    await deps.finish(row.id, outcome);
    counts[outcome.result] += 1;
  }
  return counts;
}
