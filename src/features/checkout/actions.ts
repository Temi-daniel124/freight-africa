"use server";

import { revalidatePath } from "next/cache";
import { assertUnlocked } from "@/features/auth/unlock";
import { processMoneyOut } from "@/features/money/money-out";
import { paymentProvider } from "@/lib/payments/provider";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

// D048 hosted checkout and D049 drafts. The database decides who may pay what (request_load_payment,
// request_batch_payment, save_as_draft …); money is confirmed only by the provider (webhook or the demo
// checkout below), never by the sender coming back.

export type CheckoutResult =
  | { status: "ok"; url: string }
  | { status: "noProvider" | "day" | "offer" | "error" };

type Supabase = Awaited<ReturnType<typeof supabaseServer>>;

async function provider(supabase: Supabase) {
  const { data: demo } = await supabase.rpc("am_i_demo");
  const p = paymentProvider(demo === true);
  return p && (p.kind !== "demo" || demo === true) ? p : null;
}

function failure(code?: string, message?: string): CheckoutResult {
  if (code === "22023" && message?.includes("pick-up day")) return { status: "day" };
  if (code === "22023" && message?.includes("offer")) return { status: "offer" };
  return { status: "error" };
}

/** A payment's hosted checkout: the one already opened for it, or a new one from the provider. */
async function checkoutFor(supabase: Supabase, paymentId: string, label: string): Promise<CheckoutResult> {
  const { data: payment } = await supabase
    .from("payments")
    .select("id, amount_kobo, provider_ref, checkout_url")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return { status: "error" };
  if (payment.provider_ref && payment.checkout_url) return { status: "ok", url: payment.checkout_url };
  const p = await provider(supabase);
  if (!p) return { status: "noProvider" };
  const c = await p.createCheckout({
    id: payment.id,
    amountKobo: Number(payment.amount_kobo),
    returnPath: `/app/pay/return?payment=${payment.id}`,
    label,
  });
  const { error } = await supabaseAdmin().rpc("attach_checkout", { p_payment: payment.id, p_provider: p.kind, p_ref: c.ref, p_url: c.url });
  if (error) {
    console.error("attach_checkout failed", error.code);
    return { status: "error" };
  }
  return { status: "ok", url: c.url };
}

/** P10 Continue to Bachs: re-quote a draft, open its payment and send the sender to the checkout. */
export async function startCheckout(loadId: string): Promise<CheckoutResult> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const { data: paymentId, error } = await supabase.rpc("request_load_payment", { p_load: loadId });
  if (error || !paymentId) return failure(error?.code, error?.message);
  revalidatePath("/app/ship", "layout");
  return checkoutFor(supabase, paymentId as string, "load");
}

/** P15c Pay for several: one checkout, one payment per draft. */
export async function startBatchCheckout(loadIds: string[]): Promise<CheckoutResult> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const { data: batchId, error } = await supabase.rpc("request_batch_payment", { p_loads: loadIds });
  if (error || !batchId) return failure(error?.code, error?.message);
  revalidatePath("/app/ship", "layout");
  const { data: batch } = await supabase
    .from("payment_batches")
    .select("id, amount_kobo, provider_ref, checkout_url")
    .eq("id", batchId as string)
    .maybeSingle();
  if (!batch) return { status: "error" };
  if (batch.provider_ref && batch.checkout_url) return { status: "ok", url: batch.checkout_url };
  const p = await provider(supabase);
  if (!p) return { status: "noProvider" };
  const c = await p.createCheckout({ id: batch.id, amountKobo: Number(batch.amount_kobo), returnPath: `/app/pay/return?batch=${batch.id}`, label: "batch" });
  const { error: attachError } = await supabaseAdmin().rpc("attach_batch_checkout", { p_batch: batch.id, p_provider: p.kind, p_ref: c.ref, p_url: c.url });
  if (attachError) return { status: "error" };
  return { status: "ok", url: c.url };
}

/** P10 / P10c Save as draft (D049): nothing is held, the price and the day can change. */
export async function saveAsDraft(loadId: string): Promise<{ status: "ok" | "error" }> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("save_as_draft", { p_load: loadId });
  revalidatePath("/app/ship", "layout");
  return { status: error ? "error" : "ok" };
}

export type CheckoutState = { state: "pending" | "paid" | "failed"; loadId: string | null };

/** P10b Confirming: polled until the provider has confirmed or failed the payment. */
export async function checkoutState(kind: "payment" | "batch", id: string): Promise<CheckoutState | null> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  if (kind === "batch") {
    const { data } = await supabase.from("payment_batches").select("status").eq("id", id).maybeSingle();
    if (!data) return null;
    return { state: data.status === "received" ? "paid" : data.status === "failed" ? "failed" : "pending", loadId: null };
  }
  const { data } = await supabase.from("payments").select("status, load_id").eq("id", id).maybeSingle();
  if (!data) return null;
  return { state: data.status === "received" ? "paid" : data.status === "failed" ? "failed" : "pending", loadId: data.load_id };
}

/**
 * The demo checkout's two buttons (D039, D048). Only for a demo account's own demo payment: the sender
 * must be able to read it, and it must have been made by the demo provider. The amount is the
 * payment's own, so nothing the browser sends decides how much money arrives.
 */
export async function finishDemoCheckout(ref: string, outcome: "pay" | "fail"): Promise<{ status: "ok" | "error" }> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const p = await provider(supabase);
  if (!p || p.kind !== "demo" || !ref.startsWith("demo-co-")) return { status: "error" };
  const [{ data: payment }, { data: batch }] = await Promise.all([
    supabase.from("payments").select("id, amount_kobo, received_kobo, provider").eq("provider_ref", ref).maybeSingle(),
    supabase.from("payment_batches").select("id, amount_kobo, received_kobo, provider").eq("provider_ref", ref).maybeSingle(),
  ]);
  const row = payment ?? batch;
  if (!row || row.provider !== "demo") return { status: "error" };
  const admin = supabaseAdmin();
  if (outcome === "fail") {
    const { error } = await admin.rpc("fail_payment", { p_provider_ref: ref });
    return { status: error ? "error" : "ok" };
  }
  const due = Number(row.amount_kobo) - Number(row.received_kobo);
  if (due <= 0) return { status: "ok" };
  const event = `demo:${row.id}:${row.received_kobo}`;
  const { error } = batch
    ? await admin.rpc("confirm_batch_payment", { p_provider_ref: ref, p_event_id: event, p_amount_kobo: due })
    : await admin.rpc("confirm_payment", { p_provider_ref: ref, p_event_id: event, p_amount_kobo: due });
  if (error) {
    console.error("demo confirm failed", error.code);
    return { status: "error" };
  }
  await processMoneyOut();
  revalidatePath("/app/ship", "layout");
  return { status: "ok" };
}

// ---- Replies and the 24-hour choice (P11b, P11d, P11c) -------------------------------------------

/** P11b Accept and pay the difference: the top-up goes through the hosted checkout too. */
export async function acceptReply(offerId: string): Promise<CheckoutResult> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const { data: paymentId, error } = await supabase.rpc("accept_counter", { p_offer: offerId });
  if (error || !paymentId) return failure(error?.code, error?.message);
  return checkoutFor(supabase, paymentId as string, "top_up");
}

export async function declineReply(offerId: string, loadId: string) {
  await assertUnlocked();
  await (await supabaseServer()).rpc("decline_counter", { p_offer: offerId });
  revalidatePath(`/app/ship/trips/${loadId}`);
}

/** P11d Offer again (once per owner): what it would cost, and sending it. */
export async function reofferQuote(counterId: string, totalKobo: number): Promise<number | null> {
  await assertUnlocked();
  const { data, error } = await (await supabaseServer()).rpc("reoffer_quote", { p_counter: counterId, p_total_kobo: totalKobo });
  return error ? null : Number(data);
}

export async function sendReoffer(counterId: string, totalKobo: number, loadId: string): Promise<{ status: "ok" | "error" }> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("reoffer_counter", { p_counter: counterId, p_total_kobo: totalKobo });
  revalidatePath(`/app/ship/trips/${loadId}`);
  return { status: error ? "error" : "ok" };
}

/** P11c Raise by 5% or 10%: pay the difference on the hosted checkout; the load takes the new price once paid. */
export async function raisePrice(loadId: string, totalKobo: number): Promise<CheckoutResult> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const { data: paymentId, error } = await supabase.rpc("raise_load_price", { p_load: loadId, p_total_kobo: totalKobo });
  if (error || !paymentId) return failure(error?.code, error?.message);
  return checkoutFor(supabase, paymentId as string, "raise");
}

/** P11 Change pick-up day / P12b Finish: a new day for a draft or a paid booking still waiting for a truck. */
export async function changeDay(loadId: string, fromIso: string, untilIso: string): Promise<{ status: "ok" | "error" }> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("change_load_day", { p_load: loadId, p_pickup_from: fromIso, p_pickup_until: untilIso });
  revalidatePath("/app/ship", "layout");
  return { status: error ? "error" : "ok" };
}

export async function keepWaiting(loadId: string): Promise<{ status: "ok" | "error" }> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("keep_waiting", { p_load: loadId });
  revalidatePath(`/app/ship/trips/${loadId}`);
  return { status: error ? "error" : "ok" };
}
