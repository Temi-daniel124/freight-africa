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
    .order("created_at")
    .limit(limit);
  for (const payout of payouts ?? []) {
    const demo = (payout.organizations as unknown as { is_demo: boolean })
      .is_demo;
    const provider = paymentProvider(demo);
    if (!provider || (!demo && !payout.bank_account_id)) {
      sent.skipped += 1;
      continue;
    }
    try {
      const ref = await provider.sendPayout({
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
      console.error(
        "payout failed",
        payout.id,
        error instanceof Error ? error.message : "unknown",
      );
    }
  }

  const { data: refunds } = await admin
    .from("refunds")
    .select("id, amount_kobo, organizations!inner(is_demo)")
    .eq("status", "queued")
    .order("created_at")
    .limit(limit);
  for (const refund of refunds ?? []) {
    const demo = (refund.organizations as unknown as { is_demo: boolean })
      .is_demo;
    const provider = paymentProvider(demo);
    if (!provider) {
      sent.skipped += 1;
      continue;
    }
    try {
      const ref = await provider.sendRefund({
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
      console.error(
        "refund failed",
        refund.id,
        error instanceof Error ? error.message : "unknown",
      );
    }
  }
  return sent;
}
