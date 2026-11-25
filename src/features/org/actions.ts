"use server";

import { assertUnlocked } from "@/features/auth/unlock";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { APP_ORIGIN } from "@/lib/hosts";
import { requestOrigin } from "@/lib/ip-key";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { accountHref } from "./accounts";
import { parseContact } from "./contact";

// Slice 4 server actions. Every rule (who may invite, change or remove whom; who may accept) is enforced
// by the database functions; these only read the form, call them and say what happened in plain words.

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

const errors = messages.org.errors;
/** A plain sentence for a database error code (AGENT.md 6: one sentence, details stay on the server). */
function sentence(code: string | undefined) {
  return (code && code in errors ? errors[code as keyof typeof errors] : errors.default) as string;
}

export type ActionState = { status: "idle" | "error" | "fresh"; message?: string };
export type InviteState = ActionState & { link?: string; who?: string; role?: string; attempt?: number; contactError?: boolean };

/** A-09: switch to another of the person's accounts, then open its shell. */
export async function switchAccount(formData: FormData) {
  await assertUnlocked();
  const org = text(formData, "org");
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("set_active_org", { p_org: org });
  if (error) redirect("/app");
  const { data } = await supabase.rpc("my_accounts");
  const row = data?.find((account) => account.org_id === org);
  redirect(row ? accountHref(row) : "/app");
}

/** A-07: accept a team or driver invite, then land in that organisation's shell. */
export async function acceptInvite(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertUnlocked();
  const token = text(formData, "token");
  const supabase = await supabaseServer();
  const { data: org, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error || !org) {
    // 42501 here means the invite went to another phone or email.
    return { status: "error", message: error?.code === "42501" ? messages.org.invite.wrongPerson : sentence(error?.code) };
  }
  const { data } = await supabase.rpc("my_accounts");
  const row = data?.find((account) => account.org_id === org);
  redirect(row ? accountHref(row) : "/app");
}

/** S-20: create an invite and hand back the link to send (notify() sends it for us from slice 8). */
export async function createInvite(state: InviteState, formData: FormData): Promise<InviteState> {
  await assertUnlocked();
  const attempt = (state.attempt ?? 0) + 1;
  const org = text(formData, "org");
  const role = text(formData, "role");
  const contact = parseContact(text(formData, "contact"));
  if (!contact) return { status: "error", contactError: true, message: messages.org.team.contactError, attempt };
  const supabase = await supabaseServer();
  const { data: token, error } = await supabase.rpc("create_invite", {
    p_org: org,
    p_role: role,
    p_phone: "phone" in contact ? contact.phone : undefined,
    p_email: "email" in contact ? contact.email : undefined,
  });
  if (error || !token) return { status: "error", message: sentence(error?.code), attempt };
  const origin = process.env.VERCEL_ENV === "production" ? APP_ORIGIN : await requestOrigin();
  revalidatePath("/app", "layout");
  return {
    status: "idle",
    link: `${origin}/invite/${token}`,
    who: "phone" in contact ? contact.phone : contact.email,
    role: messages.org.roles[role as keyof typeof messages.org.roles] ?? role,
    attempt,
  };
}

export async function revokeInvite(formData: FormData) {
  await assertUnlocked();
  const supabase = await supabaseServer();
  await supabase.rpc("revoke_invite", { p_invite: text(formData, "invite") });
  revalidatePath("/app", "layout");
}

export async function changeMemberRole(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("change_member_role", { p_org: text(formData, "org"), p_user: text(formData, "user"), p_role: text(formData, "role") });
  // D044: a role change needs a fresh check; the sheet asks for it, then sends the form again.
  if (error?.code === "28000") return { status: "fresh" };
  if (error) return { status: "error", message: sentence(error.code) };
  revalidatePath("/app", "layout");
  return { status: "idle" };
}

export async function removeMember(_state: ActionState, formData: FormData): Promise<ActionState> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("remove_member", { p_org: text(formData, "org"), p_user: text(formData, "user") });
  if (error) return { status: "error", message: sentence(error.code) };
  revalidatePath("/app", "layout");
  return { status: "idle" };
}
