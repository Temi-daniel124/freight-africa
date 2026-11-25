# Phase 3 (Booking and money): built, awaiting the founder's review, 25 Nov 2026

Checked by Claude Code against `BUILD.md` §3 Phase 3 and the founder brief of 24 Nov 2026 (section 5).
Payments run through the demo provider until Bachs (D039); every ledger posting is real, balanced and
idempotent.

| Item | Result | Evidence |
| --- | --- | --- |
| Post a load: six fields plus D046 (tonnes, Not sure with a rough amount, livestock head count) | Built | `create_load`; Book a truck screen with live price and the truck load preview (#66, #67) |
| Quotes and counter-offers within the settings' limits | Built | `quote_load` (D009 fees, first load free), `counter_load` (once, up to +20%, rounded before checking), `accept_counter` (top-up payment), expired or closed offers refused (#66, #67, migration 20261125130000) |
| Booking | Built | `accept_load` (truck must carry the weight, D046; demo and real kept apart, D039) |
| Payment into escrow through PaymentProvider | Built (demo) | `request_load_payment`, `attach_collection`, `confirm_payment` (idempotent per provider event); demo bank transfer with "I've paid (demo)"; Bachs ready behind the interface when its keys arrive |
| Release at loading and at delivery | Built | Advance at loading (by tier), balance after delivery and the problem window; revenue exactly fee + commission, anything left refunded to the sender |
| Refunds | Built | Cancellations per SYSTEM-LOGIC §4.4, surplus and late payments refunded, staff refunds only after a trip closes, two people above the threshold |
| Receipts | Built | Printable receipt page |
| Sender Payments page | Built | Payments and refunds with receipts |
| Owner Earnings page | Built | Payouts by trip; trip money only to owners and admins (`trip_money`); drivers never (D003, column grants and pgTAP) |
| Finance staff views | Built | Escrow balances, payouts, refunds with second-person approval (#70, #71) |
| D037 approvals for money settings | In place since Phase 1 | Two super admins (or the sole-admin code) for every money setting; the four new Phase 3 settings are money settings |
| pgTAP for every money path | Done | `190_phase3_money` (31): double pay counted once and the second payment refunded, refund larger than held refused, release before loading and before delivery refused, capacity rule, counter cap, driver sees no money; `200_trip_map`, `210_truck_actions`, `220_fresh_check` |
| Independent review of money, auth and RLS | Done | Every PR: findings fixed before merge (see PR descriptions and commits marked "review") |
| Demo data | Done | `npm run demo:trips`: loads in every state; six trucks across all states, one with cattle, one with the weight not known |

## Not built yet

- Payout and refund failure retries (1, 5, 15, 60 minutes) and the finance task on failure; today a failed send stays queued and is retried on the next minute.
- The no-truck-after-24-hours decision (raise the price, keep waiting, refund) and the automatic refund at `pickup_until`.
- Batch payment for several loads.
- The 06:00 daily reconciliation run.
- Loading and delivery through Phase 4's codes (the demo trip buttons stand in).
