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

function fromEnvFile(name, file = ".env.local") {
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8").split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
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
  // check:layout: the longest names we expect, so nothing overflows (founder fix 2i).
  { tag: "very-long-email-address-for-layout-checks", name: "Oluwaseyifunmi Chukwuemekaobi Adebanjo-Okonkwo", joining: "owner", role: "Truck owner, long names (layout checks)", tryIt: "npm run check:layout" },
  // D044: a driver invited by phone only (no email). Signs in with 0803 000 0101 and the demo PIN.
  { tag: "phone-driver", name: "Musa Bello", joining: null, phone: "2348030000101", role: "Driver invited by phone (no email)", tryIt: "Sign in with 0803 000 0101 and the PIN" },
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
      { tag: "phone-driver", transporter_role: "driver", is_driver: true },
    ],
  },
  {
    key: "nwosu-transport",
    kind: "transporter",
    name: "Emeka Nwosu Transport",
    tier: "new",
    members: [{ tag: "owner-driver", transporter_role: "owner", is_driver: true }],
  },
  {
    key: "long-name-haulage",
    kind: "transporter",
    name: "Chukwuemekaobi Okonkwo-Adeyemi Haulage and Logistics Nigeria Ltd",
    tier: "new",
    members: [{ tag: "very-long-email-address-for-layout-checks", transporter_role: "owner" }],
  },
];

// Demo trucks (founder, 27 Nov 2026): approved, active and available on every active corridor, with every
// required paper approved and in date for a year, so the demo sender sees real free-truck counts on the
// day chips. Plates as stored (no spaces); the driver is the business's driver member.
export const FLEET = {
  "musa-haulage": {
    driver: "driver",
    trucks: [
      { plate: "KJA482XA", type: "Flatbed, 30 tonnes", kg: 30000 },
      { plate: "APP640QR", type: "Flatbed, 30 tonnes", kg: 30000 },
      { plate: "KAN219BT", type: "Covered truck, 20 tonnes", kg: 20000 },
      { plate: "ABJ771KD", type: "Livestock truck", kg: 15000 },
      { plate: "LSR305GH", type: "Tipper", kg: 20000 },
      { plate: "EKY118TT", type: "Tanker", kg: 33000 },
    ],
  },
  "nwosu-transport": {
    driver: "owner-driver",
    trucks: [
      { plate: "ENU204KP", type: "Flatbed, 30 tonnes", kg: 30000 },
      { plate: "AAA118JD", type: "Covered truck, 20 tonnes", kg: 20000 },
      { plate: "LND552CX", type: "40 ft container", kg: 28000 },
    ],
  },
};

async function seedFleet(orgId, fleet, ids) {
  const corridors = must(await db.from("corridors").select("id").eq("active", true), "listing corridors").map((row) => row.id);
  const types = new Map(must(await db.from("truck_types").select("id, name"), "listing truck types").map((row) => [row.name, row.id]));
  const papers = must(await db.from("document_types").select("id, has_expiry").eq("applies_to", "truck").eq("required", true), "listing required papers");
  const expires = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
  const now = new Date().toISOString();
  must(await db.from("organizations").update({ corridor_ids: corridors }).eq("id", orgId), "business corridors");
  for (const truck of fleet.trucks) {
    const typeId = types.get(truck.type);
    if (!typeId) throw new Error(`truck type "${truck.type}" is not in the catalogue`);
    const fields = {
      truck_type_id: typeId,
      capacity_kg: truck.kg,
      status: "active",
      availability: "available",
      unavailable_until: null,
      corridor_ids: corridors,
      default_driver_id: ids[fleet.driver],
      approved_at: now,
    };
    const { data: found } = await db.from("trucks").select("id").eq("org_id", orgId).eq("plate_number", truck.plate).maybeSingle();
    const truckId = found
      ? (must(await db.from("trucks").update(fields).eq("id", found.id), `updating ${truck.plate}`), found.id)
      : must(await db.from("trucks").insert({ org_id: orgId, plate_number: truck.plate, ...fields }).select("id").single(), `adding ${truck.plate}`).id;
    for (const paper of papers) {
      const doc = { status: "approved", expires_on: paper.has_expiry ? expires : null, reminded_days: [] };
      const { data: have } = await db.from("documents").select("id").eq("subject_kind", "truck").eq("subject_id", truckId).eq("doc_type_id", paper.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (have) must(await db.from("documents").update(doc).eq("id", have.id), `paper for ${truck.plate}`);
      else
        must(
          await db.from("documents").insert({ ...doc, doc_type_id: paper.id, subject_kind: "truck", subject_id: truckId, org_id: orgId, file_path: `demo/${truck.plate}/${paper.id}.jpg` }),
          `paper for ${truck.plate}`,
        );
    }
    console.log(`    ${truck.plate.padEnd(10)} ${truck.type}`);
  }
}


// Finished setup (closing brief §3): the demo accounts' Homes show the real Home (P07, D02, O10, OD01,
// DV10), not "Finish setting up". Identity approved, a payout account usable now, the drivers' licence,
// record and an installed app. Demo rows only; the setup card stays for real new people (P07b, D02c).
const DEMO_BANKS = { "musa-haulage": "0123456789", "nwosu-transport": "0234567891", "long-name-haulage": "0345678912" };
async function finishSetup(ids, orgIds) {
  const people = PEOPLE.filter((person) => !person.staff).map((person) => ids[person.tag]);
  must(await db.from("profiles").update({ kyc_status: "approved" }).in("id", people), "identity approved");
  for (const org of ORGS.filter((o) => o.kind === "transporter")) {
    const orgId = orgIds[org.key];
    const owner = org.members.find((member) => member.transporter_role === "owner");
    const { data: row } = await db.from("organizations").select("default_bank_account_id").eq("id", orgId).single();
    let bankId = row?.default_bank_account_id;
    if (!bankId) {
      bankId = must(await db.rpc("add_bank_account", { p_user: ids[owner.tag], p_org: orgId, p_bank_code: "058", p_bank_name: "GTBank", p_account_number: DEMO_BANKS[org.key], p_resolved_name: org.name, p_score: 100 }), `bank for ${org.name}`);
    }
    must(await db.from("bank_accounts").update({ status: "active", usable_from: new Date(Date.now() - 86_400_000).toISOString() }).eq("id", bankId), `bank usable for ${org.name}`);
    const licence = (await db.from("document_types").select("id").eq("code", "drivers_licence").single()).data;
    for (const member of org.members.filter((m) => m.is_driver)) {
      const user = ids[member.tag];
      must(await db.from("drivers").upsert({ user_id: user, org_id: orgId, licence_number: `LAG${String(user).replace(/\D/g, "").slice(0, 8).padEnd(8, "0")}`, licence_expires_on: new Date(Date.now() + 2 * 365 * 86_400_000).toISOString().slice(0, 10), status: "active" }, { onConflict: "user_id" }), `driver ${member.tag}`);
      const { data: doc } = await db.from("documents").select("id").eq("subject_kind", "driver").eq("subject_id", user).eq("doc_type_id", licence.id).limit(1).maybeSingle();
      const fields = { status: "approved", expires_on: new Date(Date.now() + 2 * 365 * 86_400_000).toISOString().slice(0, 10) };
      if (doc) must(await db.from("documents").update(fields).eq("id", doc.id), `licence for ${member.tag}`);
      else must(await db.from("documents").insert({ ...fields, doc_type_id: licence.id, subject_kind: "driver", subject_id: user, org_id: orgId, file_path: `demo/licence/${member.tag}.jpg` }), `licence for ${member.tag}`);
      const now = new Date().toISOString();
      must(await db.from("app_installs").upsert({ user_id: user, device_id: "00000000-0000-4000-8000-00000000d000", platform: "android", state: "installed", installed_at: now, last_seen_at: now }, { onConflict: "user_id,device_id" }), `install for ${member.tag}`);
    }
  }
}

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
  const everyone = await allUsers();
  const existing = new Map(everyone.map((user) => [user.email?.toLowerCase(), user]));
  const byPhone = new Map(everyone.filter((user) => user.phone).map((user) => [user.phone, user]));
  const ids = {};
  const orgIds = {};
  // The demo PIN lives only in the founder's git-ignored .env.founder.local (D044).
  const pin = process.env.DEMO_PIN || fromEnvFile("DEMO_PIN", ".env.founder.local");
  if (!pin) console.warn("  DEMO_PIN is not set in .env.founder.local: demo accounts get no PIN (they choose one at sign-in).");

  for (const person of PEOPLE) {
    // Phone-only people get an internal address that is never shown or mailed (D044).
    const address = person.phone ? `p-demo-${person.tag}@phone.freight-africa.com` : email(person.tag);
    let user = person.phone ? byPhone.get(person.phone) : existing.get(address);
    if (!user) {
      const fields = person.phone ? { phone: person.phone, phone_confirm: true } : {};
      user = must(await db.auth.admin.createUser({ email: address, email_confirm: true, ...fields, user_metadata: { full_name: person.name } }), `creating ${address}`).user;
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
    if (pin) must(await db.rpc("seed_demo_pin", { p_user: user.id, p_pin: pin }), `PIN for ${address}`);
    console.log(`  ${person.role.padEnd(32)} ${person.phone ? `0${person.phone.slice(3)}` : address}`);
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
    orgIds[org.key] = orgId;
    console.log(`  ${org.name}`);
    if (FLEET[org.key]) await seedFleet(orgId, FLEET[org.key], ids);
  }
  await finishSetup(ids, orgIds);
  console.log("  setup finished for every demo account");
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
  for (const org of ORGS) {
    console.log(`  ${org.name}`);
    for (const truck of FLEET[org.key]?.trucks ?? []) console.log(`    ${truck.plate.padEnd(10)} ${truck.type}`);
  }
} else if (mode === "apply") {
  console.log("Demo accounts:");
  await apply();
  console.log("Done.");
} else {
  console.log("Removing every demo account and business:");
  await remove();
  console.log("Done.");
}
