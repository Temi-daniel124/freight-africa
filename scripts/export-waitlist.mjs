#!/usr/bin/env node
// Writes the waitlist to exports/waitlist-<date>.csv (git-ignored) for the founder (BUILD.md section 2A).
// Needs SUPABASE_SECRET_KEY, from the shell or .env.local. Reads only the Freight Africa project (D026).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const REF = "czlowhaycaivpgimcefk";
const BASE = `https://${REF}.supabase.co/rest/v1/waitlist_signups`;

const fromEnvFile = (key) => {
  if (!existsSync(".env.local")) return undefined;
  const line = readFileSync(".env.local", "utf8").split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim() || undefined;
};

const key = process.env.SUPABASE_SECRET_KEY || fromEnvFile("SUPABASE_SECRET_KEY");
if (!key) {
  console.error("Set SUPABASE_SECRET_KEY in the shell or .env.local first.");
  process.exit(1);
}

const columns = ["created_at", "name", "phone", "email", "role", "corridor_interest", "trucks_count", "source", "consent_at", "invited_at"];
const rows = [];
for (let offset = 0; ; offset += 1000) {
  const response = await fetch(`${BASE}?select=${columns.join(",")}&order=created_at.asc,id.asc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${offset}-${offset + 999}` },
  });
  if (!response.ok) {
    console.error(`Supabase answered ${response.status}: ${(await response.text()).slice(0, 300)}`);
    process.exit(1);
  }
  const page = await response.json();
  rows.push(...page);
  if (page.length < 1000) break;
}

// Quote every cell. Text a spreadsheet would run as a formula (=, @, tab, CR, or + and - not followed
// only by digits) gets a leading apostrophe; phone numbers like +2348031234567 are left as they are.
const cell = (value) => {
  let text = Array.isArray(value) ? value.join("; ") : value == null ? "" : String(value);
  if (/^[=@\t\r]/.test(text) || /^[+-](?!\d+$)/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => cell(row[column])).join(","))].join("\r\n");

mkdirSync("exports", { recursive: true });
const file = `exports/waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
writeFileSync(file, `﻿${csv}\r\n`);
console.log(`OK: ${rows.length} sign-ups written to ${file}`);
