import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { TERMS_VERSION } from "@/features/onboarding/roles";
import { formatNigerianPhone } from "@/lib/phone";
import { supabaseServer } from "@/lib/supabase/server";
import { realEmail } from "@/features/auth/phone-account";
import { avatarSrc } from "@/features/settings/avatars";
import messages from "@/messages/en.json";
import { toAccounts, type Account } from "@/features/org/accounts";
import type { ShellConfig } from "./config";

/** Who is looking at the shell: what the top bar, sidebar and account menu show. */
export type Viewer = {
  firstName: string | null;
  fullName: string;
  /** The account the shell is acting for: the organisation, or the person until slice 4 adds organisations. */
  account: string;
  accountInitials: string;
  /** Under the person's name in the sidebar ("Owner · Okafor Foods Ltd"). */
  role: string;
  /** The role alone, for the sidebar footer ("Owner", "Admin", D043). */
  roleName: string;
  /** The chosen 3D face (D045), or null for initials. */
  avatar: string | null;
  /** Email or phone, for "Signed in as". */
  contact: string;
  unread: number;
  /** The active organisation, if the person has one yet (slice 4). */
  orgId: string | null;
  /** Every account for the switcher (A-09), the active one first. */
  accounts: Account[];
  /** A demo account (D039): the shell says so on every page. */
  isDemo: boolean;
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "FA";
  // The first letters of the first two words: "Okafor Foods Ltd" is OF, "Adaeze Okafor" is AO.
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * The signed-in person, once per request. Sends anyone signed out to sign-in, and anyone who hasn't
 * chosen what they're joining as to the role step (A-03), so every shell page is safe to render.
 */
export const getViewer = cache(async (config: ShellConfig): Promise<Viewer> => {
  const next = config.base;
  await connection();
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect(`/auth?next=${encodeURIComponent(next)}`);
  const { data: agreed } = await supabase.rpc("has_accepted_terms", { p_version: TERMS_VERSION });
  if (agreed !== true) redirect("/onboarding/role");

  const [{ data: profile }, { data: rows }, { data: isDemo }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_key").eq("id", claims.sub).maybeSingle(),
    supabase.rpc("my_accounts"),
    supabase.rpc("am_i_demo"),
  ]);
  const accounts = toAccounts(rows ?? []);
  const active = accounts.find((account) => account.active) ?? null;
  const email = realEmail(typeof claims.email === "string" ? claims.email : "");
  const phone = typeof claims.phone === "string" && claims.phone ? `+234 ${formatNigerianPhone(claims.phone)}` : "";
  const contact = email || phone;
  const fullName = profile?.full_name?.trim() || contact || messages.shell.roles.shipper;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null;
  // Until the person has an organisation, the account is their own name and the shell's role.
  const account = active?.name ?? fullName;
  const role = active ? `${active.label} · ${active.name}` : messages.shell.roles[config.role];
  // Fix 2b: the sidebar footer shows the role alone ("Owner"), D043 words.
  const roleName = active ? (active.label.split(" · ").pop() ?? active.label) : messages.shell.roles[config.role];
  return { firstName, fullName, account, accountInitials: initials(account), role, roleName, avatar: avatarSrc(profile?.avatar_key), contact, unread: 0, orgId: active?.orgId ?? null, accounts, isDemo: isDemo === true };
});

/** "Good morning" / "Good afternoon" / "Good evening", by the clock in Lagos (times are shown in Africa/Lagos). */
export function greetingFor(date: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(date));
  const g = messages.shell.greeting;
  return hour < 12 ? g.morning : hour < 17 ? g.afternoon : g.evening;
}
