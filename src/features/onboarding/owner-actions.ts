"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { nameMatchScore } from "@/lib/payments/name-match";
import { paymentProvider } from "@/lib/payments/provider";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

// The transporter setup (ux-owner.md T-ON-02 and T-ON-04). Rights are checked again in the database.

export type AboutState = {
  status: "idle" | "invalid" | "error";
  errors: { name?: boolean; companyName?: boolean; cac?: boolean; base?: boolean; routes?: boolean };
};

const aboutSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    as: z.enum(["myself", "company"]),
    companyName: z.string().trim().max(120),
    cac: z.string().trim().toUpperCase().regex(/^([A-Z]{0,4}[0-9]{1,12})?$/),
    drives: z.enum(["yes", "no"]),
    base: z.uuid(),
    routes: z.array(z.uuid()).min(1),
  })
  .refine((v) => v.as === "myself" || v.companyName.length >= 2, { path: ["companyName"] });

/** The transporter business this person owns, if any. */
async function myTransporter(supabase: Awaited<ReturnType<typeof supabaseServer>>) {
  const { data } = await supabase.rpc("my_accounts");
  return (data ?? []).find((row) => row.kind === "transporter" && row.role === "owner") ?? null;
}

export async function saveAbout(_previous: AboutState, formData: FormData): Promise<AboutState> {
  const parsed = aboutSchema.safeParse({
    name: formData.get("name") ?? "",
    as: formData.get("as") === "company" ? "company" : "myself",
    companyName: formData.get("companyName") ?? "",
    cac: String(formData.get("cac") ?? "").replace(/\s+/g, ""),
    drives: formData.get("drives") === "yes" ? "yes" : "no",
    base: formData.get("base") ?? "",
    routes: formData.getAll("routes").map(String),
  });
  if (!parsed.success) {
    const paths = new Set(parsed.error.issues.map((issue) => issue.path[0]));
    return { status: "invalid", errors: { name: paths.has("name"), companyName: paths.has("companyName"), cac: paths.has("cac"), base: paths.has("base"), routes: paths.has("routes") } };
  }
  const v = parsed.data;
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/auth?next=/onboarding/owner");
  await supabase.from("profiles").update({ full_name: v.name }).eq("id", claims.claims.sub);
  let orgId = (await myTransporter(supabase))?.org_id ?? null;
  if (!orgId) {
    const { data, error } = await supabase.rpc("create_organization", {
      p_kind: "transporter",
      p_name: v.as === "company" ? v.companyName : v.name,
      p_cac_number: v.as === "company" && v.cac ? v.cac : undefined,
      p_is_driver: v.drives === "yes",
    });
    if (error || !data) {
      console.error("create_organization failed", error?.code);
      return { status: "error", errors: {} };
    }
    orgId = data;
  }
  const { error } = await supabase.rpc("save_transporter_profile", { p_org: orgId, p_home_city: v.base, p_corridors: v.routes, p_drives: v.drives === "yes" });
  if (error) {
    console.error("save_transporter_profile failed", error.code);
    return { status: "error", errors: {} };
  }
  redirect("/onboarding/identity/owner");
}

// ---------------------------------------------------------------------------------------------------
// T-ON-04: the account name always comes from the bank (through the payment provider), never from
// what the person typed; the match is scored against their name, their verified ID name and the
// business name.
// ---------------------------------------------------------------------------------------------------

/** matches is null when the person has no checked ID yet: nothing to compare with, so staff look. */
export type Lookup = { status: "found"; name: string; matches: boolean | null } | { status: "notFound" | "error" | "unavailable" };

async function lookupContext() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;
  const [{ data: isDemo }, { data: profile }, { data: check }, org] = await Promise.all([
    supabase.rpc("am_i_demo"),
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.from("verification_sessions").select("name_on_id").eq("user_id", userId).eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    myTransporter(supabase),
  ]);
  // Only a name our identity check verified counts (review fix): names people type could be anyone's.
  const references = [check?.name_on_id].filter((n): n is string => !!n);
  return { userId, org, references, demoName: profile?.full_name ?? org?.name ?? "", provider: paymentProvider(isDemo === true) };
}

const accountNumber = z.string().regex(/^[0-9]{10}$/);

async function resolve(ctx: NonNullable<Awaited<ReturnType<typeof lookupContext>>>, bankCode: string, number: string) {
  if (!ctx.provider) return { status: "unavailable" as const };
  const banks = await ctx.provider.banks();
  const bank = banks.find((b) => b.code === bankCode);
  if (!bank || !accountNumber.safeParse(number).success) return { status: "notFound" as const };
  const name = await ctx.provider.resolveAccount({ bankCode, accountNumber: number, demoName: ctx.demoName });
  if (!name) return { status: "notFound" as const };
  return { status: "found" as const, bank, name, score: nameMatchScore(name, ctx.references) };
}

/** Called as the tenth digit is typed: shows the account name and whether it matches. */
export async function lookUpAccount(bankCode: string, number: string): Promise<Lookup> {
  const ctx = await lookupContext();
  if (!ctx?.org) return { status: "error" };
  // Owners only, 20 lookups an hour: the answer is a stranger's name (review fix).
  const { data: allowed } = await (await supabaseServer()).rpc("note_bank_lookup");
  if (allowed !== true) return { status: "error" };
  try {
    const found = await resolve(ctx, bankCode, number);
    return found.status === "found" ? { status: "found", name: found.name, matches: ctx.references.length ? found.score >= 80 : null } : { status: found.status };
  } catch (error) {
    console.error("account lookup failed", error instanceof Error ? error.message : "unknown");
    return { status: "error" };
  }
}

export type BankState = { status: "idle" | "invalid" | "notFound" | "error" | "unavailable"; errors: { bank?: boolean; number?: boolean } };

export async function saveBankAccount(_previous: BankState, formData: FormData): Promise<BankState> {
  const bankCode = String(formData.get("bank") ?? "");
  const number = String(formData.get("number") ?? "").replace(/\D/g, "");
  const errors = { bank: !bankCode, number: !accountNumber.safeParse(number).success };
  if (errors.bank || errors.number) return { status: "invalid", errors };
  const ctx = await lookupContext();
  if (!ctx) redirect("/auth?next=/onboarding/owner?step=bank");
  if (!ctx.org) redirect("/onboarding/owner?step=about");
  // Setup adds the first account only. Changing it is a sensitive action that needs a fresh sign-in
  // code (SECURITY.md §3), so it lives in Settings, not here.
  const { data: org } = await (await supabaseServer()).from("organizations").select("default_bank_account_id").eq("id", ctx.org.org_id).maybeSingle();
  if (org?.default_bank_account_id) redirect("/app/haul");
  const found = await resolve(ctx, bankCode, number);
  if (found.status !== "found") return { status: found.status, errors: {} };
  // Only the server may add an account, with the name the bank gave (add_bank_account is service-role only).
  const { error } = await supabaseAdmin().rpc("add_bank_account", {
    p_user: ctx.userId,
    p_org: ctx.org.org_id,
    p_bank_code: found.bank.code,
    p_bank_name: found.bank.name,
    p_account_number: number,
    p_resolved_name: found.name,
    p_score: found.score,
  });
  if (error) {
    console.error("add_bank_account failed", error.code);
    return { status: "error", errors: {} };
  }
  redirect("/app/haul");
}
