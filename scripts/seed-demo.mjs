#!/usr/bin/env node
// Demo accounts for every role (founder, 24 Nov 2026; D039), on the Freight Africa project only.
//   node scripts/seed-demo.mjs            shows what would be created (no changes)
//   node scripts/seed-demo.mjs --apply    creates or refreshes the demo people and businesses (repeatable)
//   node scripts/seed-demo.mjs --remove   deletes every demo business and person (the cleanup before launch)
//
// Every account is a Gmail plus address of the founder's inbox, confirmed, with no password: sign-in is
// by email code only, and the codes land in the founder's inbox. Every row made here is marked is_demo.
// As each phase adds tables (trucks, loads, bookings, trips), its demo rows are added in DATA below, so
// no screen is empty. Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from the shell or the
// git-ignored .env.local. Prints names and emails only, never a key.
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const REF = "czlowhaycaivpgimcefk";
const TERMS_VERSION = "2026-11-15"; // src/features/onboarding/roles.ts
const INBOX = { user: "temmydaniel124", domain: "gmail.com" };
const email = (tag) => `${INBOX.user}+fa-${tag}@${INBOX.domain}`;

function fromEnvFile(name) {
  if (!existsSync(".env.local")) return undefined;
  const line = readFileSync(".env.local", "utf8").split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") || undefined;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fromEnvFile("NEXT_PUBLIC_SUPABASE_URL");
const key = process.env.SUPABASE_SECRET_KEY || fromEnvFile("SUPABASE_SECRET_KEY");
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are needed (shell or .env.local).");
  process.exit(1);
}
if (new URL(url).hostname !== `${REF}.supabase.co`) {
  console.error(`Refusing: the URL is not the Freight Africa project (${REF}). D026.`);
  process.exit(1);
}

const mode = process.argv.includes("--remove") ? "remove" : process.argv.includes("--apply") ? "apply" : "dry";
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// ---------------------------------------------------------------------------------------------------
// The demo cast (ROLES-AND-PERMISSIONS.md §2–§7). One account per role and sub-role.
// ---------------------------------------------------------------------------------------------------

export const PEOPLE = [
  { tag: "shipper", name: "Chiamaka Okafor", joining: "shipper", role: "Sender, business owner", tryIt: "Home, Book a truck, Payments, Team (invite someone)" },
  { tag: "shipper-team", name: "Tunde Bello", joining: "shipper", role: "Sender, team member (booker)", tryIt: "Books trucks for Adebayo Foods; can't manage the team" },
  { tag: "owner", name: "Ibrahim Musa", joining: "owner", role: "Truck owner (transporter owner)", tryIt: "Home, Loads, Trucks, Drivers, Earnings, Team" },
  { tag: "owner-driver", name: "Emeka Nwosu", joining: "owner", role: "Truck owner who switched on I drive my own truck", tryIt: "The owner screens plus the Drive tab" },
  { tag: "driver", name: "Sani Abubakar", joining: null, role: "Driver (works for Musa Haulage)", tryIt: "Trip, Next, History, Me: no money anywhere" },
  { tag: "agent", name: "Funke Adeyemi", joining: null, role: "Agent", tryIt: "People, Invite, Earnings" },
  { tag: "verification", name: "Kemi Balogun", staff: "verification", role: "Staff: verification", tryIt: "admin.freight-africa.com: two-step setup, then the verification queue" },
  { tag: "operations", name: "Yusuf Danjuma", staff: "operations", role: "Staff: operations", tryIt: "admin.freight-africa.com: live map, trips, loads" },
  { tag: "finance", name: "Ngozi Eze", staff: "finance", role: "Staff: finance", tryIt: "admin.freight-africa.com: escrow, payouts, refunds" },
  { tag: "support", name: "Bisi Ojo", staff: "support", role: "Staff: support", tryIt: "admin.freight-africa.com: users and support" },
];

export const ORGS = [
  {
    key: "adebayo-foods",
    kind: "shipper",
    name: "Adebayo Foods Ltd",
    cac: "RC1234567",
    members: [
      { tag: "shipper", shipper_role: "owner" },
      { tag: "shipper-team", shipper_role: "booker" },
    ],
  },
  {
    key: "musa-haulage",
    kind: "transporter",
    name: "Musa Haulage Ltd",
    cac: "RC7654321",
    tier: "established",
    members: [
      { tag: "owner", transporter_role: "owner" },
      { tag: "driver", transporter_role: "driver", is_driver: true },
    ],
  },
  {
    key: "nwosu-transport",
    kind: "transporter",
    name: "Emeka Nwosu Transport",
    tier: "new",
    members: [{ tag: "owner-driver", transporter_role: "owner", is_driver: true }],
  },
];

// ---------------------------------------------------------------------------------------------------

async function allUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listing users failed: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 200) return users;
  }
}

function must(result, what) {
  if (result.error) throw new Error(`${what} failed: ${result.error.message}`);
  return result.data;
}

async function apply() {
  const existing = new Map((await allUsers()).map((user) => [user.email?.toLowerCase(), user]));
  const ids = {};

  for (const person of PEOPLE) {
    const address = email(person.tag);
    let user = existing.get(address);
    if (!user) {
      user = must(await db.auth.admin.createUser({ email: address, email_confirm: true, user_metadata: { full_name: person.name } }), `creating ${address}`).user;
    }
    ids[person.tag] = user.id;
    must(await db.from("profiles").update({ full_name: person.name, is_demo: true, joining_as: person.joining ?? null }).eq("id", user.id), `marking ${address}`);
    // The role step's agreements (F-10), so the app treats them as people who've chosen a role.
    const { data: given } = await db.from("consents").select("kind").eq("user_id", user.id).eq("version", TERMS_VERSION);
    if (!given?.length) {
      must(
        await db.from("consents").insert(
          ["terms", "privacy", "whatsapp", "marketing"].map((kind) => ({ user_id: user.id, kind, version: TERMS_VERSION, granted: kind !== "marketing", user_agent: "seed-demo" })),
        ),
        `consents for ${address}`,
      );
    }
    if (person.staff) {
      must(await db.from("staff_members").upsert({ user_id: user.id, role: person.staff }, { onConflict: "user_id" }), `staff role for ${address}`);
    }
    console.log(`  ${person.role.padEnd(32)} ${address}`);
  }

  for (const org of ORGS) {
    const owner = org.members.find((member) => member.shipper_role === "owner" || member.transporter_role === "owner");
    const { data: found } = await db.from("organizations").select("id").eq("name", org.name).eq("is_demo", true).maybeSingle();
    let orgId = found?.id;
    if (!orgId) {
      orgId = must(
        await db.from("organizations").insert({ kind: org.kind, name: org.name, cac_number: org.cac ?? null, tier: org.tier ?? null, created_by: ids[owner.tag], is_demo: true }).select("id").single(),
        `creating ${org.name}`,
      ).id;
    }
    for (const member of org.members) {
      must(
        await db.from("organization_members").upsert(
          {
            org_id: orgId,
            user_id: ids[member.tag],
            shipper_role: member.shipper_role ?? null,
            transporter_role: member.transporter_role ?? null,
            is_driver: member.is_driver ?? false,
            invited_by: member === owner ? null : ids[owner.tag],
          },
          { onConflict: "org_id,user_id" },
        ),
        `adding ${member.tag} to ${org.name}`,
      );
      must(await db.from("profiles").update({ last_active_org_id: orgId }).eq("id", ids[member.tag]), `active account for ${member.tag}`);
    }
    console.log(`  ${org.name}`);
  }
}

async function remove() {
  // Businesses first: removing a person first would leave a business without an owner, which the
  // database refuses. Their members, invites and (later) trucks, loads and trips go with them.
  const orgs = must(await db.from("organizations").delete().eq("is_demo", true).select("name"), "removing demo businesses");
  for (const org of orgs) console.log(`  removed ${org.name}`);
  const people = must(await db.from("profiles").select("id, email").eq("is_demo", true), "listing demo people");
  for (const person of people) {
    must(await db.auth.admin.deleteUser(person.id), `removing ${person.email}`);
    console.log(`  removed ${person.email}`);
  }
}

if (mode === "dry") {
  console.log("Would create (run with --apply):");
  for (const person of PEOPLE) console.log(`  ${person.role.padEnd(32)} ${email(person.tag)}`);
  for (const org of ORGS) console.log(`  ${org.name}`);
} else if (mode === "apply") {
  console.log("Demo accounts:");
  await apply();
  console.log("Done.");
} else {
  console.log("Removing every demo account and business:");
  await remove();
  console.log("Done.");
}
