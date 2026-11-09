#!/usr/bin/env node
// Verifies that every Supabase setting in this repository points at the Freight Africa project only (D026).
// The unrelated project in the same organisation must never be touched.
import { existsSync, readFileSync } from "node:fs";

const REF = "czlowhaycaivpgimcefk";
const URL = `https://${REF}.supabase.co`;
const problems = [];
const notes = [];

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : null);

// 1. The project the CLI is linked to.
const linked = read("supabase/.temp/project-ref");
if (linked === null) {
  notes.push("Supabase CLI not linked yet (fine before BUILD.md step 0.6).");
} else if (linked.trim() !== REF) {
  problems.push(
    `The CLI is linked to "${linked.trim()}". Run: npx supabase link --project-ref ${REF}`,
  );
}

// 2. Environment files.
for (const file of [".env.local", ".env", ".env.development.local", ".env.production.local"]) {
  const text = read(file);
  if (text === null) continue;
  const match = text.match(/^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^"'\s]+)/m);
  if (match && match[1].replace(/\/+$/, "") !== URL) {
    problems.push(`${file}: NEXT_PUBLIC_SUPABASE_URL is "${match[1]}", expected ${URL}`);
  }
}

// 3. Variables in the current shell.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url && url.replace(/\/+$/, "") !== URL) {
  problems.push(`Shell variable NEXT_PUBLIC_SUPABASE_URL is "${url}", expected ${URL}`);
}
for (const key of ["SUPABASE_PROJECT_ID", "SUPABASE_PROJECT_REF", "PROJECT_REF"]) {
  const value = process.env[key];
  if (value && value !== REF) problems.push(`Shell variable ${key} is "${value}", expected ${REF}`);
}

// 4. The project-scoped MCP server.
const mcp = read(".mcp.json");
if (mcp !== null) {
  const refs = [...mcp.matchAll(/project_ref=([a-z0-9]+)/g)].map((m) => m[1]);
  if (refs.some((r) => r !== REF)) {
    problems.push(`.mcp.json refers to another project (${refs.join(", ")}). Only ${REF} is allowed.`);
  }
}

if (problems.length) {
  console.error("Supabase target check FAILED (SECURITY.md §1):");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
for (const n of notes) console.log(`note: ${n}`);
console.log(`OK: Supabase target is Freight Africa (${REF}, ${URL})`);
