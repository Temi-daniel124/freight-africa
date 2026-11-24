#!/usr/bin/env node
// Connects pg_cron to the job dispatcher (ARCHITECTURE.md §2) for the Freight Africa project only.
//   node scripts/configure-jobs-vault.mjs          checks that JOBS_SECRET opens production's dispatcher
//   node scripts/configure-jobs-vault.mjs --apply  then stores the URL and secret in Supabase Vault
// Reads JOBS_SECRET and SUPABASE_ACCESS_TOKEN from the shell or the git-ignored .env.local.
// Prints status codes and yes/no only: never a secret.
import { existsSync, readFileSync } from "node:fs";

const REF = "czlowhaycaivpgimcefk";
const DISPATCH_URL = "https://app.freight-africa.com/api/jobs/dispatch";

function fromEnvFile(name) {
  if (!existsSync(".env.local")) return undefined;
  const line = readFileSync(".env.local", "utf8").split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") || undefined;
}

const secret = process.env.JOBS_SECRET || fromEnvFile("JOBS_SECRET");
const token = process.env.SUPABASE_ACCESS_TOKEN || fromEnvFile("SUPABASE_ACCESS_TOKEN");
if (!secret || !token) {
  console.error("JOBS_SECRET and SUPABASE_ACCESS_TOKEN are needed (shell or .env.local).");
  process.exit(1);
}

// 1. The secret must be the one production expects, or every call would be refused.
const probe = await fetch(DISPATCH_URL, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
console.log(`dispatcher answered ${probe.status} with this secret`);
if (probe.status !== 200) {
  console.error("The local JOBS_SECRET does not match production's. Nothing stored.");
  process.exit(1);
}
if (!process.argv.includes("--apply")) process.exit(0);

// 2. Store both values in Vault (replacing earlier ones). Values go in the request body over HTTPS only.
const endpoint = `https://api.supabase.com/v1/projects/${REF}/database/query`;
if (!endpoint.includes(`/projects/${REF}/`)) process.exit(1); // guard against edits (D026)
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const query = `
  do $$
  declare
    v_id uuid;
  begin
    select id into v_id from vault.secrets where name = 'jobs_dispatch_url';
    if v_id is null then perform vault.create_secret(${quote(DISPATCH_URL)}, 'jobs_dispatch_url', 'Job dispatcher URL (pg_cron + pg_net)');
    else perform vault.update_secret(v_id, ${quote(DISPATCH_URL)}); end if;
    select id into v_id from vault.secrets where name = 'jobs_secret';
    if v_id is null then perform vault.create_secret(${quote(secret)}, 'jobs_secret', 'JOBS_SECRET for /api/jobs/dispatch');
    else perform vault.update_secret(v_id, ${quote(secret)}); end if;
  end $$;
  select count(*)::int as stored from vault.secrets where name in ('jobs_dispatch_url', 'jobs_secret');
`;
const res = await fetch(endpoint, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
if (!res.ok) {
  console.error(`Vault update failed: ${res.status}`);
  process.exit(1);
}
const rows = await res.json();
console.log(`Vault holds ${rows?.[rows.length - 1]?.stored ?? "?"} of 2 dispatcher secrets`);
