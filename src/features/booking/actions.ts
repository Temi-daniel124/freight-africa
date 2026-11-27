"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertUnlocked } from "@/features/auth/unlock";
import { processMoneyOut } from "@/features/money/money-out";
import { paymentProvider } from "@/lib/payments/provider";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

// Phase 3 sender and owner actions. The database decides who may do what (create_load, accept_load,
// cancel_load …); these only shape the input and talk to the PaymentProvider (D039).

import { bookingSchema, type BookingInput } from "./booking-schema";

export type { BookingInput, BookingItem } from "./booking-schema";

export type Quote = {
  freight: number;
  fee: number;
  feeBps: number;
  total: number;
  /** D047: the lowest offer, and -5% / -8% / -10% of our price (never under the lowest), in kobo. */
  minOffer: number;
  chips: number[];
  distanceKm: number;
  typicalHours: number;
  /** Shown only with real history behind them (5 or more trips in 90 days). */
  usual: { low: number; high: number } | null;
  acceptedFrom: number | null;
};

/** S-02 the price for a route and truck, with what the offer screen needs (null when the lane isn't covered). */
export async function quoteBooking(org: string, from: string, to: string, truckType: string, dropoffs = 1): Promise<Quote | null> {
  await assertUnlocked();
  const { data } = await (await supabaseServer()).rpc("quote_booking", { p_org: org, p_from: from, p_to: to, p_truck_type: truckType, p_dropoffs: dropoffs });
  const row = data?.[0];
  if (!row) return null;
  const total = Number(row.total_kobo);
  const min = Number(row.min_offer_kobo);
  // Whole thousands of naira, never under the lowest offer, never our price itself.
  const chips = [500, 800, 1000].map((bps) => Math.max(min, Math.floor((total * (10000 - bps)) / 10000 / 100000) * 100000));
  return {
    freight: Number(row.freight_kobo),
    fee: Number(row.fee_kobo),
    feeBps: Number(row.fee_bps),
    total,
    minOffer: min,
    chips,
    distanceKm: Number(row.distance_km),
    typicalHours: Number(row.typical_hours),
    usual: row.usual_low_kobo && row.usual_high_kobo ? { low: Number(row.usual_low_kobo), high: Number(row.usual_high_kobo) } : null,
    acceptedFrom: row.accepted_from_kobo ? Number(row.accepted_from_kobo) : null,
  };
}

export type DayFree = { day: string; truckType: string; free: number };

/** D055: free trucks of each type for the next days on this route. */
export async function availability(org: string, from: string, to: string, days = 7): Promise<DayFree[]> {
  await assertUnlocked();
  const { data } = await (await supabaseServer()).rpc("day_availability", { p_org: org, p_from: from, p_to: to, p_days: days });
  return (data ?? []).map((r) => ({ day: r.day, truckType: r.truck_type_id, free: Number(r.free) }));
}

export type CreateResult =
  | { status: "ok"; id: string }
  | { status: "invalid"; field: string }
  | { status: "route" | "error"; message?: string };

const phone = (raw?: string) => {
  const digits = (raw ?? "")
    .replace(/\D/g, "")
    .replace(/^234/, "")
    .replace(/^0/, "");
  return /^[789][01]\d{8}$/.test(digits) ? `+234${digits}` : undefined;
};

/** S-02 Post a booking: route, day, items, truck, contacts and, optionally, the sender's own price. */
export async function createLoad(input: BookingInput): Promise<CreateResult> {
  await assertUnlocked();
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid", field: String(parsed.error.issues[0]?.path[0] ?? "form") };
  const v = parsed.data;
  const supabase = await supabaseServer();
  const args = {
    p_org: v.org,
    p_truck_type: v.truckType,
    p_pickup_from: v.pickupFrom,
    p_pickup_until: v.pickupUntil,
    p_stops: v.stops.map((s) => ({ city: s.city, address: s.address, name: s.name || null, phone: phone(s.phone) ?? null })),
    p_items: v.items.map((i) => ({
      goods: i.goods,
      description: i.description,
      quantity: i.amount,
      unit: i.kind === "tonnes" ? "tonnes" : i.unit,
      unit_weight_kg: i.kind === "count" ? (i.unitWeightKg ?? null) : null,
      value_kobo: i.valueNaira * 100,
    })),
    p_notes: v.note || null,
    p_offer_total_kobo: v.offerNaira ? v.offerNaira * 100 : null,
  };
  const { data, error } = await supabase.rpc("create_load", args as unknown as Parameters<typeof supabase.rpc<"create_load">>[1]);
  if (error || !data) {
    if (error?.code === "P0002") return { status: "route" };
    console.error("create_load failed", error?.code);
    return { status: "error", message: error?.code === "22023" ? error.message : undefined };
  }
  revalidatePath("/app/ship", "layout");
  return { status: "ok", id: data as string };
}

/** S-05 Pay: a one-time account from the PaymentProvider (demo until Bachs, D039). */
export async function startPayment(
  loadId: string,
): Promise<{ status: "ok" } | { status: "error" | "noProvider" }> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const { data: paymentId, error } = await supabase.rpc(
    "request_load_payment",
    { p_load: loadId },
  );
  if (error || !paymentId) {
    console.error("request_load_payment failed", error?.code);
    return { status: "error" };
  }
  const { data: payment } = await supabase
    .from("payments")
    .select("id, amount_kobo, expires_at, provider_ref")
    .eq("id", paymentId as string)
    .maybeSingle();
  if (!payment) return { status: "error" };
  if (!payment.provider_ref) {
    const { data: demo } = await supabase.rpc("am_i_demo");
    const provider = paymentProvider(demo === true);
    // A real business never gets a demo account number (review).
    if (!provider || (provider.kind === "demo" && demo !== true)) return { status: "noProvider" };
    const collection = await provider.createCollection({
      paymentId: payment.id,
      amountKobo: Number(payment.amount_kobo),
      expiresAt: payment.expires_at,
    });
    const { error: attachError } = await supabaseAdmin().rpc(
      "attach_collection",
      {
        p_payment: payment.id,
        p_provider: provider.kind,
        p_ref: collection.ref,
        p_account: collection.accountNumber,
        p_bank: collection.bank,
      },
    );
    if (attachError) return { status: "error" };
  }
  revalidatePath(`/app/ship/trips/${loadId}`);
  return { status: "ok" };
}

/** D039 demo payer: "I've paid" confirms the simulated bank transfer (never for real accounts). */
export async function confirmDemoPayment(
  paymentId: string,
): Promise<{ status: "ok" | "error" }> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const [{ data: demo }, { data: payment }] = await Promise.all([
    supabase.rpc("am_i_demo"),
    supabase
      .from("payments")
      .select("id, load_id, amount_kobo, received_kobo, provider, provider_ref")
      .eq("id", paymentId)
      .maybeSingle(),
  ]);
  if (
    demo !== true ||
    !payment ||
    payment.provider !== "demo" ||
    !payment.provider_ref
  )
    return { status: "error" };
  const due = Number(payment.amount_kobo) - Number(payment.received_kobo);
  if (due <= 0) return { status: "ok" };
  const { error } = await supabaseAdmin().rpc("confirm_payment", {
    p_provider_ref: payment.provider_ref,
    p_event_id: `demo:${payment.id}:${payment.received_kobo}`,
    p_amount_kobo: due,
  });
  if (error) {
    console.error("confirm_payment (demo) failed", error.code);
    return { status: "error" };
  }
  await processMoneyOut();
  revalidatePath("/app/ship", "layout");
  return { status: "ok" };
}

export async function cancelLoad(
  loadId: string,
  reason: string,
): Promise<{ status: string }> {
  await assertUnlocked();
  const { data, error } = await (
    await supabaseServer()
  ).rpc("cancel_load", {
    p_load: loadId,
    p_reason: reason.slice(0, 300) || undefined,
  });
  if (error)
    return { status: error.code === "22023" ? "afterLoading" : "error" };
  await processMoneyOut();
  revalidatePath("/app/ship", "layout");
  return { status: String(data) };
}

export async function acceptCounter(
  offerId: string,
  loadId: string,
): Promise<{ status: string }> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const { data: paymentId, error } = await supabase.rpc("accept_counter", {
    p_offer: offerId,
  });
  if (error || !paymentId) return { status: "error" };
  const { data: demo } = await supabase.rpc("am_i_demo");
  const provider = paymentProvider(demo === true);
  const { data: payment } = await supabase
    .from("payments")
    .select("id, amount_kobo, expires_at")
    .eq("id", paymentId as string)
    .maybeSingle();
  if (!provider || (provider.kind === "demo" && demo !== true) || !payment) return { status: "noProvider" };
  {
    const c = await provider.createCollection({
      paymentId: payment.id,
      amountKobo: Number(payment.amount_kobo),
      expiresAt: payment.expires_at,
    });
    const { error: attachError } = await supabaseAdmin().rpc("attach_collection", {
      p_payment: payment.id,
      p_provider: provider.kind,
      p_ref: c.ref,
      p_account: c.accountNumber,
      p_bank: c.bank,
    });
    if (attachError) return { status: "error" };
  }
  revalidatePath(`/app/ship/trips/${loadId}`);
  return { status: "ok" };
}

export async function declineCounter(offerId: string, loadId: string) {
  await assertUnlocked();
  await (await supabaseServer()).rpc("decline_counter", { p_offer: offerId });
  revalidatePath(`/app/ship/trips/${loadId}`);
}

/** T-05 Accept for ₦X, or T-06 Offer a different price (once, up to +20%). */
export async function takeLoad(
  loadId: string,
  truckId: string,
  driverId: string | null,
  counterNaira?: number,
): Promise<{ status: string; tripId?: string }> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  if (counterNaira) {
    const { error } = await supabase.rpc("counter_load", {
      p_load: loadId,
      p_truck: truckId,
      p_amount_kobo: Math.round(counterNaira * 100),
      p_driver: driverId ?? undefined,
    });
    revalidatePath("/app/haul", "layout");
    return {
      status: error
        ? error.code === "40001"
          ? "taken"
          : error.code === "22023"
            ? "range"
            : "error"
        : "countered",
    };
  }
  const { data, error } = await supabase.rpc("accept_load", {
    p_load: loadId,
    p_truck: truckId,
    p_driver: driverId ?? undefined,
  });
  revalidatePath("/app/haul", "layout");
  if (error)
    return {
      status:
        error.code === "40001"
          ? "taken"
          : error.code === "22023"
            ? error.message.includes("heavier")
              ? "heavy"
              : "truck"
            : "error",
    };
  return { status: "ok", tripId: data as string };
}

/** Demo and operations staff (until Phase 4's codes): loaded, delivered, release the balance. */
export async function tripStep(
  tripId: string,
  step: "loaded" | "delivered" | "release",
  weightTonnes?: number,
  quantity?: number,
) {
  await assertUnlocked();
  const { error } = await (
    await supabaseServer()
  ).rpc("staff_trip_step", {
    p_trip: tripId,
    p_step: step,
    p_weight_kg: weightTonnes ? Math.round(weightTonnes * 1000) : undefined,
    p_quantity: quantity ?? undefined,
  });
  if (error) return { status: "error" as const };
  await processMoneyOut();
  revalidatePath("/app", "layout");
  return { status: "ok" as const };
}

export async function goToTrip(formData: FormData) {
  const ref = String(formData.get("ref") ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  redirect(`/app/ship/track?ref=${encodeURIComponent(ref)}`);
}
