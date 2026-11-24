"use server";

import { randomUUID } from "node:crypto";
import { accountHref } from "@/features/org/accounts";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { internalEmailFor } from "./phone-account";
import { pinIsWeak } from "./pin-rules";
import { finishSignIn, openSessionFor } from "./pin-session";

export type PhoneInviteResult = { status: "ok"; next: string } | { status: "weak" | "name" | "closed" | "exists" | "error" };

/**
 * A-07 by phone (D044): the invite link the owner shared from their own WhatsApp is the first proof.
 * The person confirms their name and sets a PIN; we create their account with that phone number (and an
 * internal address that is never shown or mailed), open their session on the server and accept the invite.
 */
export async function acceptPhoneInvite(token: string, name: string, pin: string): Promise<PhoneInviteResult> {
  const fullName = name.trim().replace(/\s+/g, " ");
  if (fullName.length < 2 || fullName.length > 80) return { status: "name" };
  if (pinIsWeak(pin)) return { status: "weak" };

  const admin = supabaseAdmin();
  const { data: rows, error: peekError } = await admin.rpc("peek_phone_invite", { p_token: token });
  const invite = rows?.[0];
  if (peekError || !invite?.phone) return { status: "closed" };
  const phone = invite.phone.replace(/^\+/, "");

  // Someone who already has an account signs in with their phone number and PIN, then opens the link.
  const { data: taken } = await admin.rpc("pin_sign_in_phone_taken", { p_phone: phone });
  if (taken === true) return { status: "exists" };

  const email = internalEmailFor(randomUUID());
  const { error: createError } = await admin.auth.admin.createUser({
    phone,
    phone_confirm: true,
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError) {
    console.error("creating a phone account failed", createError.code ?? createError.status);
    return { status: createError.status === 422 ? "exists" : "error" };
  }

  const session = await openSessionFor(email);
  if (!session) return { status: "error" };
  const supabase = await supabaseServer();
  await supabase.from("profiles").update({ full_name: fullName }).eq("id", session.userId);
  const { error: pinError } = await supabase.rpc("set_app_pin", { p_pin: pin });
  if (pinError) {
    console.error("set_app_pin for a phone invite failed", pinError.code);
    return { status: pinError.code === "22023" ? "weak" : "error" };
  }
  const { data: org, error: acceptError } = await supabase.rpc("accept_invite", { p_token: token });
  if (acceptError || !org) {
    console.error("accept_invite by phone failed", acceptError?.code);
    return { status: "error" };
  }
  await finishSignIn(session.userId, session.sessionId, null);
  const { data: accounts } = await supabase.rpc("my_accounts");
  const row = accounts?.find((account) => account.org_id === org);
  return { status: "ok", next: row ? accountHref(row) : "/app" };
}
