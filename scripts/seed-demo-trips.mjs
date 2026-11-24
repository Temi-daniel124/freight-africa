#!/usr/bin/env node
// Phase 3 demo data (founder brief, section 5): the demo sender's loads in every state (posted, waiting
// for payment, an owner's counter, booked and paid, released, refunded) and the demo truck owner's six
// trucks across all states, one carrying livestock and one whose weight isn't known (D046).
// Runs as the demo people themselves (sessions made on the server, D044), so every rule in the database
// applies. Repeatable: does nothing if the demo sender already has loads. Prints no keys or PINs.
//   node --env-file=.env.local scripts/seed-demo-trips.mjs
import { createClient } from "@supabase/supabase-js";

const REF = "czlowhaycaivpgimcefk";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (
  !url ||
  !key ||
  !anonKey ||
  new URL(url).hostname !== `${REF}.supabase.co`
) {
  console.error("Needs the Freight Africa project keys in .env.local (D026).");
  process.exit(1);
}
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const must = (r, what) => {
  if (r.error) throw new Error(`${what} failed: ${r.error.message}`);
  return r.data;
};
const inbox = (tag) => `temmydaniel124+fa-${tag}@gmail.com`;

async function as(tag) {
  const link = must(
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: inbox(tag),
    }),
    `link for ${tag}`,
  );
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  must(
    await client.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "email",
    }),
    `session for ${tag}`,
  );
  return client;
}

const id = async (table, col, value) =>
  must(
    await admin.from(table).select("id").eq(col, value).single(),
    `${table} ${value}`,
  ).id;

const shipperOrg = await id("organizations", "name", "Adebayo Foods Ltd");
const ownerOrg = await id("organizations", "name", "Musa Haulage Ltd");
// Each scenario runs once: it is skipped when a load with its description and state already exists.
const exists = async (description, statuses) =>
  must(
    await admin
      .from("loads")
      .select("id")
      .eq("shipper_org_id", shipperOrg)
      .eq("goods_description", description)
      .in("status", statuses)
      .limit(1),
    "existing",
  ).length > 0;

const city = {};
for (const slug of [
  "lagos",
  "kano",
  "abuja",
  "aba",
  "onitsha",
  "port-harcourt",
])
  city[slug] = await id("cities", "slug", slug);
const type = {};
for (const code of [
  "flatbed_30t",
  "covered_20t",
  "tipper",
  "tanker",
  "livestock",
])
  type[code] = await id("truck_types", "code", code);
const goods = {};
for (const code of ["rice_bags", "grain_bags", "livestock", "yams_tubers"])
  goods[code] = await id("goods_categories", "code", code);
const cement = must(
  await admin
    .from("goods_categories")
    .select("id")
    .eq("parent_id", await id("goods_categories", "code", "building"))
    .limit(1)
    .single(),
  "building goods",
).id;

// The owner's six trucks (D046 needs capacities): four ready, one paused, one waiting for review.
const people = must(
  await admin
    .from("profiles")
    .select("id, email")
    .in("email", [inbox("driver"), inbox("owner")]),
  "people",
);
const sani = people.find((p) => p.email === inbox("driver"))?.id;
must(
  await admin
    .from("drivers")
    .update({ status: "active", paused: false })
    .eq("user_id", sani),
  "Sani active",
);
const trucks = [
  ["KJA482XA", "flatbed_30t", 30000, "active"],
  ["KAN219BT", "covered_20t", 20000, "active"],
  ["ABJ771KD", "livestock", 15000, "active"],
  ["LSR305GH", "tipper", 20000, "active"],
  ["EKY118TT", "tanker", 33000, "paused"],
  ["APP640QR", "flatbed_30t", 30000, "pending_review"],
];
const truckId = {};
for (const [plate, code, kg, status] of trucks) {
  const row = must(
    await admin
      .from("trucks")
      .upsert(
        {
          org_id: ownerOrg,
          plate_number: plate,
          truck_type_id: type[code],
          capacity_kg: kg,
          status,
          approved_at:
            status === "pending_review" ? null : new Date().toISOString(),
          default_driver_id: sani,
          availability: status === "paused" ? "unavailable" : "available",
        },
        { onConflict: "plate_number" },
      )
      .select("id")
      .single(),
    `truck ${plate}`,
  );
  truckId[plate] = row.id;
}

const sender = await as("shipper");
const owner = await as("owner");
const day = (d, h = 8) => {
  const x = new Date(Date.now() + d * 86400000);
  x.setUTCHours(h - 1, 0, 0, 0);
  return x.toISOString();
};
async function post(spec) {
  return must(
    await sender.rpc("create_load", {
      p_org: shipperOrg,
      p_goods: spec.goods,
      p_description: spec.description ?? "",
      p_truck_type: spec.type,
      p_weight_kg: spec.kg ?? null,
      p_quantity: spec.qty ?? null,
      p_quantity_unit: spec.unit ?? null,
      p_declared_value_kobo: spec.value ?? 500000000,
      p_pickup_from: day(spec.day ?? 1),
      p_pickup_until: day(spec.day ?? 1, 18),
      p_stops: [
        { city: spec.from, address: spec.pickup },
        {
          city: spec.to,
          address: spec.dropoff,
          name: spec.receiver ?? "Musa Danladi",
          phone: "+2348031234567",
        },
      ],
    }),
    `load ${spec.description}`,
  );
}
async function pay(loadId) {
  const paymentId = must(
    await sender.rpc("request_load_payment", { p_load: loadId }),
    "request payment",
  );
  const ref = `demo-${paymentId}`;
  must(
    await admin.rpc("attach_collection", {
      p_payment: paymentId,
      p_provider: "demo",
      p_ref: ref,
      p_account: "9912345678",
      p_bank: "Demo Bank (no real money)",
    }),
    "attach",
  );
  const payment = must(
    await admin
      .from("payments")
      .select("amount_kobo")
      .eq("id", paymentId)
      .single(),
    "payment",
  );
  must(
    await admin.rpc("confirm_payment", {
      p_provider_ref: ref,
      p_event_id: `seed:${paymentId}`,
      p_amount_kobo: payment.amount_kobo,
    }),
    "confirm",
  );
}
const at = (tripId, lat, lng) =>
  admin
    .from("trips")
    .update({
      last_location: `SRID=4326;POINT(${lng} ${lat})`,
      last_ping_at: new Date(Date.now() - 6 * 60000).toISOString(),
    })
    .eq("id", tripId);

// 1. Posted, not paid.
if (!(await exists("Bags of rice", ["draft"])))
  await post({
    goods: goods.rice_bags,
    description: "Bags of rice",
    type: type.flatbed_30t,
    kg: 24000,
    from: city.lagos,
    to: city.kano,
    pickup: "Apapa port, Lagos",
    dropoff: "Dawanau market, Kano",
    day: 3,
  });
// 2. Waiting for payment.
if (!(await exists("Bags of maize", ["awaiting_payment"]))) {
  const waiting = await post({
    goods: goods.grain_bags,
    description: "Bags of maize",
    type: type.covered_20t,
    kg: 18000,
    from: city.kano,
    to: city.lagos,
    pickup: "Dawanau market, Kano",
    dropoff: "Mile 12 market, Lagos",
    day: 2,
  });
  const wp = must(
    await sender.rpc("request_load_payment", { p_load: waiting }),
    "request",
  );
  must(
    await admin.rpc("attach_collection", {
      p_payment: wp,
      p_provider: "demo",
      p_ref: `demo-${wp}`,
      p_account: "9912345678",
      p_bank: "Demo Bank (no real money)",
    }),
    "attach",
  );
}
// 3. Paid, with an owner's counter waiting for the sender's answer.
if (!(await exists("Cement", ["funded", "matched"]))) {
  const countered = await post({
    goods: cement,
    description: "Cement",
    type: type.flatbed_30t,
    kg: 28000,
    from: city.lagos,
    to: city.abuja,
    pickup: "Ikeja, Lagos",
    dropoff: "Kubwa, Abuja",
    day: 2,
  });
  await pay(countered);
  const cload = must(
    await admin
      .from("loads")
      .select("freight_kobo")
      .eq("id", countered)
      .single(),
    "freight",
  );
  must(
    await owner.rpc("counter_load", {
      p_load: countered,
      p_truck: truckId.KJA482XA,
      p_amount_kobo: Math.round(Number(cload.freight_kobo) * 1.1),
      p_driver: sani,
    }),
    "counter",
  );
}
// 4. Booked and paid: a truck assigned (weight known, 80% full).
if (!(await exists("Bags of rice", ["matched"]))) {
  const booked = await post({
    goods: goods.rice_bags,
    description: "Bags of rice",
    type: type.flatbed_30t,
    kg: 24000,
    from: city.lagos,
    to: city.kano,
    pickup: "Apapa port, Lagos",
    dropoff: "Dawanau market, Kano",
    day: 1,
  });
  await pay(booked);
  const tripBooked = must(
    await owner.rpc("accept_load", {
      p_load: booked,
      p_truck: truckId.KJA482XA,
      p_driver: sani,
    }),
    "accept booked",
  );
  await at(tripBooked, 6.6018, 3.3515);
}
// 5. Livestock on the road (loaded): "Cattle · 40 head".
if (!(await exists("Cattle", ["matched"]))) {
  const cattle = await post({
    goods: goods.livestock,
    description: "Cattle",
    type: type.livestock,
    qty: 40,
    unit: "head",
    from: city.kano,
    to: city.lagos,
    pickup: "Kano cattle market",
    dropoff: "Agege abattoir, Lagos",
    day: 1,
  });
  await pay(cattle);
  const tripCattle = must(
    await owner.rpc("accept_load", {
      p_load: cattle,
      p_truck: truckId.ABJ771KD,
    }),
    "accept cattle",
  );
  must(
    await owner.rpc("staff_trip_step", {
      p_trip: tripCattle,
      p_step: "loaded",
    }),
    "cattle loaded",
  );
  await admin
    .from("trips")
    .update({ status: "in_transit" })
    .eq("id", tripCattle);
  await at(tripCattle, 9.6139, 6.5569);
}
// 6. Weight not known (D046): "Bags of rice, about 600 bags", loaded.
if (!(await exists("Rice, weight not known", ["matched"]))) {
  const bags = await post({
    goods: goods.rice_bags,
    description: "Rice, weight not known",
    type: type.covered_20t,
    qty: 600,
    unit: "bags",
    from: city.aba,
    to: city.lagos,
    pickup: "Ariaria market, Aba",
    dropoff: "Oyingbo market, Lagos",
    day: 1,
  });
  await pay(bags);
  const tripBags = must(
    await owner.rpc("accept_load", { p_load: bags, p_truck: truckId.KAN219BT }),
    "accept bags",
  );
  must(
    await owner.rpc("staff_trip_step", { p_trip: tripBags, p_step: "loaded" }),
    "bags loaded",
  );
  await admin.from("trips").update({ status: "in_transit" }).eq("id", tripBags);
  await at(tripBags, 6.3389, 5.6037);
}
// 7. Released: delivered and the balance paid.
if (!(await exists("Yams", ["matched"]))) {
  const done = await post({
    goods: goods.yams_tubers,
    description: "Yams",
    type: type.tipper,
    kg: 15000,
    from: city.aba,
    to: city.lagos,
    pickup: "Ariaria market, Aba",
    dropoff: "Mile 12 market, Lagos",
    day: 1,
  });
  await pay(done);
  const tripDone = must(
    await owner.rpc("accept_load", { p_load: done, p_truck: truckId.LSR305GH }),
    "accept done",
  );
  for (const step of ["loaded", "delivered", "release"])
    must(
      await owner.rpc("staff_trip_step", { p_trip: tripDone, p_step: step }),
      `done ${step}`,
    );
}
// 8. Refunded: paid, then cancelled before a truck.
if (!(await exists("Bags of sorghum", ["refunded"]))) {
  const refunded = await post({
    goods: goods.grain_bags,
    description: "Bags of sorghum",
    type: type.covered_20t,
    kg: 16000,
    from: city.lagos,
    to: city.abuja,
    pickup: "Mile 12 market, Lagos",
    dropoff: "Dei-Dei market, Abuja",
    day: 4,
  });
  await pay(refunded);
  must(
    await sender.rpc("cancel_load", {
      p_load: refunded,
      p_reason: "Plans changed",
    }),
    "cancel",
  );
}

// Demo money goes out at once (payouts and refunds), as the dispatcher would.
for (const p of must(
  await admin
    .from("payouts")
    .select("id")
    .eq("status", "queued")
    .eq("org_id", ownerOrg),
  "payouts",
))
  must(
    await admin.rpc("payout_paid", {
      p_payout: p.id,
      p_provider_ref: `demo-payout-${p.id}`,
    }),
    "payout",
  );
for (const r of must(
  await admin
    .from("refunds")
    .select("id")
    .eq("status", "queued")
    .eq("shipper_org_id", shipperOrg),
  "refunds",
))
  must(
    await admin.rpc("refund_paid", {
      p_refund: r.id,
      p_provider_ref: `demo-refund-${r.id}`,
    }),
    "refund",
  );
console.log("  Demo loads, trips and trucks are ready.");
