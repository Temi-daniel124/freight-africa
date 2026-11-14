"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { resendEmailSender } from "@/lib/email/sender";
import { serverEnv } from "@/lib/env.server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { waitlistConfirmationEmail } from "./confirmation-email";
import { checkTrucks, waitlistSchema, type WaitlistField } from "./schema";
import type { WaitlistState, WaitlistValues } from "./state";

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

export async function joinWaitlist(previous: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const values: WaitlistValues = {
    name: text(formData, "name"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    role: text(formData, "role"),
    corridors: formData.getAll("corridors").filter((value): value is string => typeof value === "string"),
    trucks: text(formData, "trucks"),
    consent: text(formData, "consent") === "on",
    source: text(formData, "source"),
  };
  const attempt = previous.attempt + 1;

  // Honeypot: people never see this field; bots that fill it get a polite, empty success.
  if (text(formData, "website")) {
    return { status: "joined", errors: {}, values, firstName: values.name.split(/\s+/)[0], attempt };
  }

  const parsed = waitlistSchema.safeParse({
    ...values,
    consent: values.consent ? "on" : undefined,
    source: values.source || undefined,
  });
  if (!parsed.success) {
    const errors: WaitlistState["errors"] = {};
    for (const issue of parsed.error.issues) errors[issue.message as WaitlistField] = true;
    if (checkTrucks(values.role, values.trucks) === "invalid") errors.trucks = true;
    return { status: "invalid", errors, values, attempt };
  }
  const data = parsed.data;

  // The IP address is only used for rate limiting, as a keyed hash (privacy notice).
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const ipKey = createHmac("sha256", serverEnv().CODE_HMAC_SECRET).update(`rate-limit:${ip}`).digest("hex");

  const { data: outcome, error } = await supabaseAdmin().rpc("join_waitlist", {
    p_name: data.name,
    p_phone: data.phone,
    p_email: data.email,
    p_role: data.role,
    p_corridors: data.corridors,
    p_trucks: data.trucks,
    p_source: data.source,
    p_ip_key: ipKey,
  });

  if (error || (outcome !== "joined" && outcome !== "duplicate" && outcome !== "rate_limited")) {
    // No personal data in logs (AGENT.md section 6).
    console.error("join_waitlist failed", error?.code ?? "unexpected result");
    return { status: "error", errors: {}, values, attempt };
  }

  if (outcome === "rate_limited") return { status: "rate_limited", errors: {}, values, attempt };

  // Accepted trade-offs (independent review, Nov 2026), both bounded by the rate limit above:
  // "already on the list" reveals that a number is registered, and the confirmation email goes to an
  // address we haven't verified.

  const firstName = data.name.split(/\s+/)[0];
  if (outcome === "joined" && data.email) {
    const email = data.email;
    after(async () => {
      try {
        await resendEmailSender().send(waitlistConfirmationEmail(email, data.name, data.phone));
      } catch (sendError) {
        console.error("waitlist confirmation email failed", sendError instanceof Error ? sendError.message : "unknown");
      }
    });
  }

  return {
    status: outcome,
    errors: {},
    values,
    firstName,
    phone: data.phone,
    email: outcome === "joined" ? (data.email ?? undefined) : undefined,
    attempt,
  };
}
