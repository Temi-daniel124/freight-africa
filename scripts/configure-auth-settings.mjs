#!/usr/bin/env node
// Sets Supabase Auth's addresses and code rules for the Freight Africa project only (D033).
//   node scripts/configure-auth-settings.mjs            shows the current settings, changes nothing
//   node scripts/configure-auth-settings.mjs --apply    saves the settings below, then reads them back
// Needs SUPABASE_ACCESS_TOKEN, from the shell or the git-ignored .env.local. The token is never printed.
import { existsSync, readFileSync } from "node:fs";

const REF = "czlowhaycaivpgimcefk";

function tokenFromEnvFile() {
  if (!existsSync(".env.local")) return undefined;
  const line = readFileSync(".env.local", "utf8").split(/\r?\n/).find((entry) => entry.startsWith("SUPABASE_ACCESS_TOKEN="));
  return line?.slice("SUPABASE_ACCESS_TOKEN=".length).trim().replace(/^["']|["']$/g, "") || undefined;
}

const token = process.env.SUPABASE_ACCESS_TOKEN || tokenFromEnvFile();
if (!token) {
  console.error("Set SUPABASE_ACCESS_TOKEN in this shell or in .env.local first.");
  process.exit(1);
}

// What we want. Rate limits are deliberately absent: they stay as they are unless tightened by hand.
const wanted = {
  site_url: "https://app.freight-africa.com",
  uri_allow_list: [
    "https://app.freight-africa.com/**",
    "https://admin.freight-africa.com/**",
    "https://freight-africa.com/**",
    "https://freight-africa-*-temmydaniel124-1242s-projects.vercel.app/**",
    "http://localhost:3000/**",
  ].join(","),
  mailer_otp_length: 6,
  mailer_otp_exp: 600, // seconds: codes last 10 minutes
  // Staff two-step sign-in with an authenticator app (SECURITY.md 3, slice 5). Users don't need it.
  mfa_totp_enroll_enabled: true,
  mfa_totp_verify_enabled: true,
};

// Settings that are safe to show. Nothing secret (SMTP password, provider secrets) is ever printed.
const shown = [
  ...Object.keys(wanted),
  "sms_otp_length",
  "sms_otp_exp",
  "rate_limit_email_sent",
  "rate_limit_sms_sent",
  "rate_limit_otp",
  "rate_limit_verify",
  "rate_limit_token_refresh",
  "rate_limit_anonymous_users",
  "security_captcha_enabled",
  "disable_signup",
];

const endpoint = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
if (!endpoint.includes(`/projects/${REF}/`)) process.exit(1); // guard against edits (D026)

async function call(method, body) {
  const res = await fetch(endpoint, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    console.error(`Supabase answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }
  return res.json();
}

const pick = (config) => Object.fromEntries(shown.map((key) => [key, config[key]]));

const before = pick(await call("GET"));
if (!process.argv.includes("--apply")) {
  console.log("Current settings (nothing changed; add --apply to save):");
  console.log(before);
  process.exit(0);
}

await call("PATCH", wanted);
const after = pick(await call("GET"));

console.log(`Supabase Auth settings for ${REF}:`);
for (const key of shown) {
  const changed = String(before[key]) !== String(after[key]);
  console.log(`${changed ? "CHANGED" : "same   "} ${key}: ${changed ? `${before[key]}  ->  ` : ""}${after[key]}`);
}
const wrong = Object.entries(wanted).filter(([key, value]) => String(after[key]) !== String(value));
if (wrong.length) {
  console.error("Not saved as asked:", wrong.map(([key]) => key).join(", "));
  process.exit(1);
}
console.log("OK: every setting reads back as asked.");
