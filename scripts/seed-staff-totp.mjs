#!/usr/bin/env node
// Demo staff authenticators (closing brief §2: the staff console compared signed in, with its real states).
// For each demo staff account (seed-demo.mjs: verification, operations, finance, support) that has no
// verified authenticator yet, enrol one, confirm it with a code, mark the staff code agreed, and write the
// secret to the git-ignored .env.founder.local as DEMO_TOTP_<TAG>. Nothing is emailed; no secret is printed.
// Freight Africa project only (D026). Usage: node scripts/seed-staff-totp.mjs
import { createClient } from "@supabase/supabase-js";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { totp } from "./totp.mjs";

const REF = "czlowhaycaivpgimcefk";
const STAFF = ["verification", "operations", "finance", "support"];
const env = (name, file = ".env.local") => {
  if (process.env[name]) return process.env[name];
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") || undefined;
};
const url = env("NEXT_PUBLIC_SUPABASE_URL");
const secret = env("SUPABASE_SECRET_KEY");
const anon = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ?? env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!url || !secret || !anon) throw new Error("Supabase URL and keys are needed in .env.local.");
if (new URL(url).hostname !== `${REF}.supabase.co`) throw new Error(`Refusing: not the Freight Africa project (${REF}). D026.`);

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
for (const tag of STAFF) {
  const key = `DEMO_TOTP_${tag.toUpperCase()}`;
  const email = `temmydaniel124+fa-${tag}@gmail.com`;
  if (env(key, ".env.founder.local")) {
    console.log(`  ${tag}: already set`);
    continue;
  }
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`${tag}: ${error.message}`);
  const me = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: otpError } = await me.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (otpError) throw new Error(`${tag}: ${otpError.message}`);
  const { data: factors } = await me.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) if (f.factor_type === "totp") await me.auth.mfa.unenroll({ factorId: f.id });
  const { data: factor, error: enrollError } = await me.auth.mfa.enroll({ factorType: "totp", friendlyName: "Demo authenticator" });
  if (enrollError) throw new Error(`${tag}: ${enrollError.message}`);
  const { data: challenge } = await me.auth.mfa.challenge({ factorId: factor.id });
  const { error: verifyError } = await me.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: totp(factor.totp.secret) });
  if (verifyError) throw new Error(`${tag}: ${verifyError.message}`);
  await admin.from("staff_members").update({ staff_code_accepted_at: new Date().toISOString() }).eq("user_id", link.user.id);
  appendFileSync(".env.founder.local", `\n${key}=${factor.totp.secret}\n`);
  await me.auth.signOut();
  console.log(`  ${tag}: authenticator enrolled`);
}
