import "server-only";
import { paymentProvider } from "@/lib/payments/provider";
import { supabaseAdmin } from "@/lib/supabase/admin";

// SYSTEM-LOGIC §7.5: queued payouts and refunds are sent by the job dispatcher every minute. Demo money
// (D039) goes through the demo provider at once; real money waits for Bachs and, for payouts, a bank
// account that is active and past its 24-hour wait. Each is recorded once (payout_paid, refund_paid).

type Sent = { payouts: number; refunds: number; skipped: number };

export async function processMoneyOut(limit = 20): Promise<Sent> {
  const admin = supabaseAdmin();
  const sent: Sent = { payouts: 0, refunds: 0, skipped: 0 };

  const { data: payouts } = await admin
    .from("payouts")
    .select("id, amount_kobo, bank_account_id, organizations!inner(is_demo)")
    .eq("status", "queued")
    // SYSTEM-LOGIC 7.5: a failed one waits for its next try (1, 5, 15, 60 minutes).
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at")
    .limit(limit);
  for (const payout of payouts ?? []) {
    const demo = (payout.organizations as unknown as { is_demo: boolean })
      .is_demo;
    const provider = paymentProvider(demo);
    // Demo money settles demo accounts only, never a real owner (review: previews share the database).
    if (!provider || (provider.kind === "demo" && !demo) || (!demo && !payout.bank_account_id)) {
      sent.skipped += 1;
      continue;
    }
    // Claim it first, so two runs at once never send it twice.
    const { data: claimed } = await admin.from("payouts").update({ status: "processing" }).eq("id", payout.id).eq("status", "queued").select("id");
    if (!claimed?.length) continue;
    let ref: string | null = null;
    try {
      ref = await provider.sendPayout({
        payoutId: payout.id,
        amountKobo: Number(payout.amount_kobo),
        bankAccountId: payout.bank_account_id,
      });
      const { error } = await admin.rpc("payout_paid", {
        p_payout: payout.id,
        p_provider_ref: ref,
      });
      if (error) throw new Error(error.code);
      sent.payouts += 1;
    } catch (error) {
      const why = error instanceof Error ? error.message : "unknown";
      console.error("payout failed", payout.id, why);
      // Back to the queue for its next try, or failed for finance after the last (money_out_failed).
      // Only when the bank didn't take it: if it did and only recording failed, a retry could pay twice,
      // so it stays "processing" for finance to check (reconciliation).
      if (ref === null) await admin.rpc("money_out_failed", { p_kind: "payout", p_id: payout.id, p_error: why });
    }
  }

  const { data: refunds } = await admin
    .from("refunds")
    .select("id, amount_kobo, organizations!inner(is_demo)")
    .eq("status", "queued")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at")
    .limit(limit);
  for (const refund of refunds ?? []) {
    const demo = (refund.organizations as unknown as { is_demo: boolean })
      .is_demo;
    const provider = paymentProvider(demo);
    if (!provider || (provider.kind === "demo" && !demo)) {
      sent.skipped += 1;
      continue;
    }
    const { data: claimedRefund } = await admin.from("refunds").update({ status: "processing" }).eq("id", refund.id).eq("status", "queued").select("id");
    if (!claimedRefund?.length) continue;
    let ref: string | null = null;
    try {
      ref = await provider.sendRefund({
        refundId: refund.id,
        amountKobo: Number(refund.amount_kobo),
      });
      const { error } = await admin.rpc("refund_paid", {
        p_refund: refund.id,
        p_provider_ref: ref,
      });
      if (error) throw new Error(error.code);
      sent.refunds += 1;
    } catch (error) {
      const why = error instanceof Error ? error.message : "unknown";
      console.error("refund failed", refund.id, why);
      if (ref === null) await admin.rpc("money_out_failed", { p_kind: "refund", p_id: refund.id, p_error: why });
    }
  }
  return sent;
}
