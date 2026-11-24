# SYSTEM-LOGIC.md, Freight Africa

**Annex to `docs/DATA-MODEL.md`, same authority (3 of 14).** Defers to `docs/DECISIONS.md` and `docs/PRODUCT.md`. Defines how the platform behaves: state machines,
calculations, timers, money postings, codes, tracking, matching, notifications and background jobs.
Tables are in `DATA-MODEL.md`. All numbers in *italics* are defaults stored in `settings` (§11) and
editable in the Admin console.

---

## 1. The life of a booking (overview)

```
Shipper books ─► Load draft ─► awaiting_payment ─► funded ─► matched ─► Trip runs ─► closed
                     │               │                │
                     └ cancel        └ 24h expiry     └ no truck in 24h → shipper chooses
```

A **load** is what the shipper books and pays for. A **trip** is one truck carrying it. Normally one
load has one trip; a breakdown creates a second trip for the same load (§14).

## 2. Trip state machine

| From | To | Trigger | Who | Side effects |
| --- | --- | --- | --- | --- |
| (none) | `assigned` | Offer accepted and load funded | System | Truck `on_trip`; driver, owner, shipper notified |
| `assigned` | `to_pickup` | Driver taps **Go to pickup** | Driver | Trip mode starts; tracking expected from now |
| `to_pickup` | `at_pickup` | Driver's phone enters the pickup geofence, or driver taps **I've arrived** while inside it | System or driver | Loading code sent to pickup contact; waiting clock starts |
| `at_pickup` | `loading` | Driver taps **Start loading** | Driver | |
| `loading` | `loaded` | Loading code verified **and** at least *3* loading photos **and** seal number if the goods need one | Driver (code from pickup contact) | **Advance released** (§7.2) |
| `loaded` | `in_transit` | Driver taps **Start trip** | Driver | ETA computed; receiver's tracking link sent |
| `in_transit` | `in_transit` | Each multi-stop drop-off completed except the last | System | Next stop becomes active |
| `in_transit` | `arrived` | Driver's phone enters the final drop-off geofence | System | Receiver notified; waiting clock starts; auto-release timer set (*24h*) |
| `arrived` | `delivered` | Delivery code verified with a delivery photo, no problem reported | Driver (code from receiver) | **Balance released** (§7.3) |
| `arrived` | `delivered_with_exception` | Delivery code verified and a problem reported | Driver or receiver | Dispute opened; only the claimed amount held (§13) |
| `arrived` | `delivered` | Auto-release timer passes with ≥1 delivery photo in the geofence, no code, no problem | System | Balance released; shipper told why |
| `delivered`, `delivered_with_exception` | `closed` | Balance paid and no open dispute | System | Track record refreshed; ratings stay open *7 days* |
| `in_transit` | `transloading` | Driver reports breakdown and staff confirm | Staff | §14 |
| `assigned`, `to_pickup`, `at_pickup`, `loading` | `cancelled` | Shipper, owner or staff cancels | Any | §4.4 rules |

Rules:
- Any transition not in this table is rejected by `record_event()`.
- Drivers can't go backwards. Staff can apply `staff_override` with a reason (audited).
- After `loaded`, a trip can't be cancelled; it ends delivered, transloaded or by staff decision.

### Trip event types

`trip_assigned`, `driver_acknowledged`, `driver_unable`, `driver_changed`, `to_pickup_started`, `arrived_pickup`, `loading_started`,
`loading_photo_added`, `seal_recorded`, `loading_code_sent`, `loading_code_failed`,
`loading_confirmed`, `advance_released`, `trip_started`, `eta_updated`, `stop_approaching`,
`delivery_code_sent`, `arrived_stop`, `delivery_photo_added`, `delivery_code_failed`,
`delivery_confirmed`, `exception_reported`, `auto_release`, `balance_released`, `waiting_started`,
`waiting_charge_raised`, `tracking_gap_15`, `tracking_gap_30`, `tracking_gap_60`,
`tracking_resumed`, `route_deviation`, `long_stop`, `risky_hours_warning`, `sos_raised`,
`sos_resolved`, `callback_requested`, `driving_lock_dismissed`, `breakdown_reported`, `transload_assigned`, `cancelled`, `closed`, `rating_given`,
`staff_note`, `staff_override`.

## 3. Quotes, offers and matching

### 3.1 Instant quote

```
extra_km    = max(0, pickup_distance_from_city_centre − city_radius_km)
            + max(0, dropoff_distance_from_city_centre − city_radius_km)
stops_extra = (number_of_dropoffs − 1) × extra_stop_kobo + detour_km × per_km_kobo
freight     = round_to_1000( max(min_kobo, base_kobo + extra_km × per_km_kobo + stops_extra)
                             × multiplier_bps / 10000 )
fee_bps     = shipper fee tier for (loads funded this calendar month + 1)    (D009)
fee         = round_to_100(freight × fee_bps / 10000), or 0 if first-trip promotion applies
total       = freight + fee
```

- Lane price row: `lane_prices` for (from city, to city, truck type), direction matters.
- *city_radius_km = 30*, *extra_stop_kobo = ₦10,000*.
- **Suggested truck type:** the smallest active truck type whose `capacity_kg_default` ≥ weight and
  whose default goods include the category. The shipper can pick a larger one; the price updates.
- If no lane price exists (pickup or drop-off off the four corridors), show "We don't cover this
  route yet" with a waitlist button. No quote.
- Quotes are recomputed at payment creation; if the lane price changed, the new price is shown
  before payment.

### 3.2 Which owners see a funded load (load board filter)

A truck fits a load when all are true:

1. Truck `status = active` and `availability = available`, or it becomes free before `pickup_until`.
2. Truck type = load truck type, or a larger type that carries the category (owner gets the same
   freight).
3. Goods category is in the truck type's defaults and not in `truck_goods_exclusions`.
4. All blocking documents for truck and assigned driver are approved and valid until
   `pickup_until + typical_hours`.
5. Declared value ≤ the org's value limit: *new ₦3m*, *established uninsured ₦10m*, gold or
   insured: no limit (D019).
6. If `requires_insured`, `organizations.insured_until` ≥ expected delivery date.
7. The truck runs the corridor (`corridor_ids`) or its last known location is within *50 km* of
   pickup.
8. Org is `active` and not suspended.

**Gold head start:** for the first *10 minutes* after funding, only Gold owners see the load.

**Sort:** pickup soonest first, then distance from the truck's last known location to pickup.

**What owners see before accepting:** route, pickup window, goods category, weight, quantity, truck
type, freight (what they will earn before commission), their payout after commission, shipper's
rating and trip count. Never: shipper contact details, exact addresses (only area), declared value
(only "under ₦3m", "₦3m to ₦10m", "over ₦10m").

### 3.3 Accept

Owner picks the truck and driver (defaults to the truck's default driver) and taps **Accept for
₦X**. `accept_offer()` locks the load; the first valid accept wins; others see "This load was just
taken" and the board refreshes.

### 3.4 Counter once

- One counter per owner per load, up to *+20%* of the listed freight. No lower counters.
- The shipper gets the counter by WhatsApp and in the app: "Owner [name, tier, rating] will take it
  for ₦X (+₦Y). Pay ₦Y to accept."
- Counter expires in *2 hours* or when any other owner accepts at the listed price.
- Shipper accepts → a top-up payment for (Y + fee on Y). When it is received, `accept_offer()` runs
  with the counter amount. If another owner accepted at the listed price first, the top-up is
  refunded automatically.

### 3.5 Load alerts

On funding, notify owners with a fitting available truck, highest tier and rating first, nearest
first, at most *30* organisations, by WhatsApp and push. Gold head start applies.

### 3.6 Return loads

For a trip in transit, loads whose pickup is within *50 km* of the trip's final drop-off and whose
`pickup_from` ≥ the trip's ETA are shown on the owner's trip page and in the driver's **Next load**
tab (driver sees it but only the owner or manager can accept).

## 4. Loads, payments and cancellations

### 4.1 Load states

| From | To | Trigger |
| --- | --- | --- |
| `draft` | `awaiting_payment` | Shipper taps **Pay ₦X**; payment created with a one-time account number valid *24h* |
| `awaiting_payment` | `funded` | Bachs webhook confirms full amount (`fund_load()`) |
| `awaiting_payment` | `expired` | 24h pass unpaid. Load returns to `draft` on **Pay again** |
| `funded` | `matched` | `accept_offer()` |
| `funded` | `refunded` | Shipper cancels, or chooses refund at the no-truck decision, or `pickup_until` passes with no match |
| `matched` | `cancelled` | Trip cancelled per §4.4 |

### 4.2 No truck after 24 hours

At `funded_at + 24h` without a match, the shipper gets three choices (WhatsApp buttons and in app):
**Raise the price** (suggests +5% and +10%; pays the difference; load re-alerted), **Keep waiting**,
**Get a full refund**. No choice in another *24h* → keep waiting until `pickup_until`, then a full
automatic refund.

### 4.3 Wrong amount paid

- Less than the total: payment stays `pending`; the shipper sees "₦Z still to pay" with the same
  account number if Bachs keeps it open; otherwise the partial amount is refunded and a new payment
  is created.
- More than the total: the load is funded and the excess refunded immediately.
- Payment received after the load was cancelled or expired: full automatic refund.

### 4.4 Cancellation rules

| When | Who cancels | Shipper gets back | Owner gets | Other effects |
| --- | --- | --- | --- | --- |
| Before payment | Shipper | Nothing was paid | – | – |
| Funded, no truck yet | Shipper | Everything (freight + fee) | – | – |
| Truck assigned, not yet at pickup | Shipper | Everything | – | Owner notified; truck freed |
| Truck at pickup or loading | Shipper | Total − service fee − cancellation fee | Cancellation fee (*₦25,000*, D019) | Fee kept as revenue |
| After loaded | Nobody | – | – | Staff handle as return trip or dispute |
| Any time before loaded | Owner | – | – | Strike; load goes back to `funded` and re-alerted first to nearby trucks |
| Any time | Staff | Per decision, with reason | Per decision | Audited; second approval for refunds |

### 4.5 Batch payment

A shipper selects several draft loads → **Pay for selected**. One payment, one account number.
When received, each load is funded in the order listed. If the amount is short, loads are funded in
order until the money runs out; the rest stay `awaiting_payment` with the remaining amount shown.

## 5. Loading and delivery codes

### 5.1 Code rules

- 6 digits from a cryptographic random generator; reject obvious patterns (all same, ascending).
- Stored only as `HMAC-SHA256(server_secret, stop_id || code)` in `load_stops.code_hash`.
- One code per stop. Works once.
- **Loading code** is sent when the trip enters `at_pickup`, to the pickup contact (or shipper). The
  shipper's owner/admin/booker can also see it in the app and tap **Resend**.
- **Delivery code** is sent when the trip's ETA to that stop is ≤ *60 minutes* or the truck is
  within *30 km*, whichever comes first, to the receiver and to the shipper. The shipper's
  owner/admin/booker can also see it in the app and tap **Resend code**.
- Message wording to the receiver: "Check your goods first. Give this code to the driver only when
  you are happy with them. Giving the code confirms you received the goods."

### 5.2 Verifying a code (`verify_code()`)

Accepted only if all are true:
1. Stop not locked and attempts < *5*.
2. The driver's submitted location is within `geofence_radius_m` + min(accuracy, *100 m*) of the
   stop, and that location is ≤ *5 minutes* old.
3. For delivery: at least *1* delivery photo taken inside the geofence.
4. HMAC matches.

A wrong code increments attempts and logs `*_code_failed` (with location). At 5 failures the stop
locks, operations is alerted and calls the contact; staff can issue a new code (audited).

A correct code entered **outside** the geofence is refused and raises a `code_outside_geofence`
fraud flag.

**Staff confirmation.** When a contact can't use WhatsApp or the code is locked, operations may
confirm a stop on the contact's behalf only after calling them on the number the shipper gave and
recording the call (`contact_logs`). The driver must still be inside the geofence with photos. The
event is `staff_override` with the call log attached, and it is audited.

### 5.3 No signal at the stop

The driver app accepts a code entry offline and stores it with the phone's location and time. When
the phone reconnects, the server verifies it against the location recorded at entry time. Money is
released only after server verification. The driver sees "Saved. Will confirm when you have signal."

### 5.4 Receiver tracking link

- URL `/track/{token}`; token is 32 random bytes, base64url; only its hash is stored.
- Shows ETA, progress, truck type and plate, driver first name and photo, shipper display name, and
  **Report a problem**. Never shows prices, declared value, addresses beyond the drop-off area, or
  phone numbers.
- Expires *72h* after the stop completes. `noindex`, not in the sitemap, rate-limited by token and
  IP.
- **Report a problem** asks for the delivery code (proof of being the receiver), then the problem
  type, how many items are affected out of the total, and photos.

## 6. Tracking

### 6.1 Trip mode (driver phone)

- Starts at **Go to pickup**, ends at trip `delivered` or `cancelled`.
- Requests Screen Wake Lock; if refused, shows "Keep this screen open during the trip."
- `watchPosition` with high accuracy. Saves a point every *60 s* when moving, every *180 s* when
  speed < 5 km/h.
- Points go to IndexedDB, then upload in batches every *2 minutes* or immediately on reconnect, and
  with every event.
- Shows a charging reminder when the battery API reports not charging and below *50%*.
- If the page becomes hidden, it records a `visibility_hidden` marker; on return, it shows "Welcome
  back. Tracking is on again."

### 6.2 Server tracking states

| Last location (any source) | `tracking_state` | Action |
| --- | --- | --- |
| ≤ 5 min ago | `live` | – |
| > *15 min* | `delayed` | Push and WhatsApp to driver: "Tap to resume your trip" |
| > *30 min* | `lost` | Operations task: call the driver. Shipper's map shows "No signal since 14:10" |
| > *60 min* | `escalated` | Operations calls the owner; flagged on the live map |

Tracker pings (§6.4) count as locations. Recovery logs `tracking_resumed`. More than *3* `lost`
gaps on one trip adds a `tracking_off` strike to the owner unless staff waive it.

### 6.3 ETA, deviation, stops, risky hours

- Route and ETA from OpenRouteService (or self-hosted OSRM) at `trip_started`, then every *15
  minutes* from the latest point. If the routing service fails, use remaining straight-line distance
  ÷ *45 km/h*.
- **Route deviation:** more than *5 km* from the planned route for more than *10 minutes* → flag to
  operations and a driver prompt "Are you on a different road?" with a reason picker.
- **Long stop:** stationary over *90 minutes* outside stops and approved parks → operations task.
- **Risky hours:** entering a `corridor_segments` stretch outside its safe hours → warning to the
  driver with the nearest approved park, and a log to operations.

### 6.4 GPS trackers (Traccar)

Owner enters the tracker's unique ID on the truck page. Traccar forwards positions by webhook to
`/api/tracker` (signed). Positions are stored as `source = 'tracker'` against the truck's active
trip. Staff can require a connected tracker for loads with declared value above *₦20m*.

## 7. Money

### 7.1 Ledger postings

All postings are double-entry in kobo. `provider_cash` is the money held at Bachs.

| Event | Debit | Credit |
| --- | --- | --- |
| Load funded | provider_cash: total | escrow(load): total |
| Advance released | escrow: advance | owner_payable(org): advance |
| Balance released | escrow: remaining − held | owner_payable: freight − advance − commission − held; platform_revenue: fee + commission |
| Payout paid (any) | owner_payable or agent_payable | provider_cash |
| Agent share | platform_revenue: share | agent_payable(agent): share |
| Dispute hold | escrow: held | dispute_reserve(load): held |
| Dispute upheld (amount A) | dispute_reserve: A | shipper_refundable: A |
| Dispute rejected / remainder | dispute_reserve: rest | owner_payable: rest |
| Refund paid | shipper_refundable | provider_cash |
| Cancellation with fee | escrow: total | shipper_refundable: refund; owner_payable: cancel fee; platform_revenue: service fee |
| Processing charge from Bachs | processing_cost | provider_cash |
| Promotion (fee waived or commission waived) | promo_expense: amount | platform_revenue: amount (for reporting gross) |
| Upheld claim after balance already paid | owner_receivable(org): A | shipper_refundable: A (Freight Africa pays the refund only if staff approve; recovered from the owner's next payouts) |

### 7.2 Advance

`advance_kobo = freight × advance_bps / 10000` with *3000 / 4000 / 5000* bps for new / established /
gold. Payout kind `advance`, idempotency key `payout:{trip}:advance`.

### 7.3 Balance

`balance = freight − advance − commission − held_dispute`. Commission is
`freight × commission_bps / 10000` (*500*, gold *400*), or 0 during the owner's first *3* trips
(promotion).

### 7.4 Worked example (default rates)

Freight ₦1,000,000, shipper fee 3% (₦30,000), established owner (40% advance), commission 5%.

| Step | Escrow after |
| --- | --- |
| Shipper pays ₦1,030,000 | ₦1,030,000 |
| Advance ₦400,000 to owner | ₦630,000 |
| Balance ₦550,000 to owner, ₦80,000 to platform revenue | ₦0 |

### 7.5 Payout processing

- Payouts are queued by the functions above and sent by a worker every *1 minute*.
- Bank account must be `active` and past `usable_from`.
- Above *₦5m* a payout waits in `awaiting_approval` for a finance staff member.
- Failure: retry at 1, 5, 15, 60 minutes; then `failed` and a finance task. The owner sees "Payout
  delayed, we're on it" with the reason in plain words.
- One refund per payment (Bachs rule): during a trip, refundable amounts accumulate in
  `shipper_refundable` and are refunded once at close, except a full cancellation refund, which goes
  out immediately.

### 7.6 Daily reconciliation

At *06:00* Lagos time, compare yesterday's provider collections, payouts, refunds and charges with
the ledger. Any difference creates a reconciliation item for finance. Escrow balances of closed loads
must be ₦0.

## 8. Track record, tiers and strikes

- **Clean trip:** closed, no upheld claim, no strike from that trip.
- **Tiers** (recomputed at every close and nightly): `new` < *5* clean trips; `established` 5 to 24;
  `gold` ≥ *25* clean trips, rating ≥ *4.3*, and no strike in the last *90 days*.
- **Strikes** expire after *90 days*. Reasons: no-show, owner cancellation, upheld claim, tracking
  off (§6.2), conduct.
- *3* active strikes → organisation `suspended` pending staff review; trucks hidden from the load
  board; trips in progress continue.
- **Ratings:** both sides rate 1 to 5 with tags within *7 days* of delivery. Averages are shown
  after *3* ratings.
- Shipper ratings are shown to owners on the load board.

## 9. Notification matrix

Channels: **W** WhatsApp (SMS automatically if WhatsApp fails), **E** email, **P** push, **I** in-app.
"Shipper" means the shipper members with notifications on for that event (owner, admin, booker by
default).

| Event | Shipper | Owner | Driver | Pickup contact | Receiver | Agent | Staff |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Payment details created | E I | | | | | | |
| Load funded | W E I | | | | | | |
| New fitting load | | W P I | | | | | |
| Counter offer received | W P I | | | | | | |
| Truck assigned | W E I | W P I | W P I | W | | | |
| Driver on the way to pickup | I | I | | W | | | |
| Truck at pickup + loading code | W I | I | P I | **W (code)** | | | |
| Loaded, advance paid | W I | W P I | I | | | | |
| Trip started + tracking link | W I | I | | | **W E (link)** | | |
| Delivery code (≈1h out) | **W I (code)** | | | | **W E (code)** | | |
| Arrived at drop-off | W I | I | | | W | | |
| Delivered, balance paid | W E I | W P I | P I | | W | W I (if share) | |
| Problem reported | W E I | W P I | I | | W | | I (operations) |
| Tracking delayed (15 min) | | | **W P** | | | | |
| Tracking lost (30 min) | I | W I | W P | | | | I (task) |
| SOS | | W | | | | | **I + sound, W to on-call** |
| No truck after 24h | W E I | | | | | | |
| Document expiring (30/7/1 days) | | W E I | W I (own licence) | | | | |
| Payout failed | | W I | | | | | I (finance) |
| Bank account changed | | **W E** (security) | | | | | I |
| Waiting charge raised | W E I | I | | | | | |
| Dispute decided | W E I | W E I | | | | | |
| Verification approved / declined | | W E I | W I | | | | |
| Agent: referral signed up / first trip | | | | | | W I | |

Safety, money and code messages cannot be switched off. Message templates are English only at
launch (D017); the `language` column is kept for later.

## 10. Fraud and security rules

| Rule | Action |
| --- | --- |
| Bank account added or changed | Usable after *24h*; WhatsApp and email alert to the org owner's verified phone and email; queued payouts wait |
| Bank account name match < *80* | Staff review before use |
| Same phone number used as driver and receiver, or driver and pickup contact, on one trip | Block the booking or assignment with a message |
| Code entered outside the geofence | Refused + `code_outside_geofence` flag |
| Speed between two points > *150 km/h* or jumps over *50 km* in 1 minute | `location_spoof_suspected` flag |
| One device used by more than *3* accounts | `shared_device` flag |
| New owner (first *3* trips) | Trips highlighted to operations; value limit applies |
| Payout above *₦5m*, any manual refund, any fee or money setting change, any ledger adjustment, dispute decision above *₦1m*, any staff role change | Second staff approval (`approvals`); the requester can't approve their own item |
| Staff sign-in | Two-step sign-in required; sessions *12h* |
| Rate limits | Sign-in codes 5 per hour per number; code verification 5 per stop; tracking page 60 requests per minute per token |
| Files | Private buckets; signed URLs valid *10 minutes*; images re-encoded on upload; PDFs only for documents; max *10 MB* |

## 11. Settings (defaults)

| Key | Default |
| --- | --- |
| `city_radius_km` | 30 |
| `extra_stop_kobo` | 1,000,000 (₦10,000) |
| `max_dropoffs` | 4 |
| `payment_expiry_hours` | 24 |
| `no_truck_decision_hours` | 24 |
| `gold_head_start_minutes` | 10 |
| `load_alert_max_orgs` | 30 |
| `counter_max_bps` | 2000 |
| `counter_expiry_hours` | 2 |
| `return_load_radius_km` | 50 |
| `geofence_radius_m` | 250 |
| `code_max_attempts` | 5 |
| `delivery_code_eta_minutes` | 60 |
| `delivery_code_distance_km` | 30 |
| `min_loading_photos` | 3 |
| `auto_release_hours` | 24 |
| `free_waiting_hours` | 4 |
| `waiting_per_hour_kobo` | 500,000 (₦5,000), per truck type override in `fee_rules` |
| `cancellation_fee_kobo` | 2,500,000 (₦25,000) |
| `advance_bps` | new 3000, established 4000, gold 5000 |
| `value_limit_kobo` | new 300,000,000 (₦3m); established uninsured 1,000,000,000 (₦10m) |
| `tracker_required_above_kobo` | 2,000,000,000 (₦20m) |
| `ping_interval_moving_s` / `_stationary_s` | 60 / 180 |
| `tracking_gap_minutes` | 15 / 30 / 60 |
| `deviation_km` / `deviation_minutes` | 5 / 10 |
| `long_stop_minutes` | 90 |
| `payout_two_person_kobo` | 500,000,000 (₦5m) |
| `tier_established_trips` / `tier_gold_trips` / `tier_gold_rating` | 5 / 25 / 4.3 |
| `strike_expiry_days` / `strikes_to_suspend` | 90 / 3 |
| `rating_window_days` | 7 |
| `tracking_link_expiry_hours` | 72 |
| `agent_share_bps` / `agent_share_months` | 100 / 6 |
| `agents_enabled` | true |
| `agent_reminders_per_day` / `agent_reminders_per_step` | 1 / 3 |
| `agent_booking_expiry_days` | 7 |
| `sms_fallback_enabled` | true |
| `card_payments_enabled` | false |
| `languages_enabled` | en |
| `chat_open_after_delivery_hours` | 48 |
| `driving_lock_speed_kmh` / `driving_lock_seconds` | 10 / 30 |
| `driving_lock_passenger_minutes` | 30 |
| `hold_push_until_still_minutes` | 2 |
| `driver_confirm_reminder_hours` | 2 |
| `dispute_window_hours` | 48 (D037) |
| `dispute_hold_bps` | 1000 (10% of the unpaid balance when no count is given; D037) |
| `dispute_two_person_kobo` | 100,000,000 (₦1m; D037) |

Settings that change who gets paid, how much or when are money settings and need a second super admin
(D037): every `_kobo` and `_bps` key, `card_payments_enabled`, `auto_release_hours`, `free_waiting_hours`,
the three tier values, `agent_share_months` and the dispute settings.

## 12. Background jobs

| Schedule | Job |
| --- | --- |
| Every minute | Tracking states (§6.2); payout queue; SOS escalation (unacknowledged after *2 min* → the super admin on call in `on_call_shifts`, by WhatsApp; if no one is on call, every super admin) |
| On each ping batch | Geofence entries (arrivals), delivery-code timing, deviation, long stops, risky hours, ETA refresh if due |
| Every 5 minutes | Expire payments, counters, invites; retry failed notifications |
| Hourly | Auto-release; no-truck decisions; waiting charges; unpaid charges older than *72h* → block shipper bookings; document expiry status |
| Daily 02:00 | Database backup to off-provider storage (D015) |
| Daily 06:00 | Reconciliation (§7.6); document expiry reminders; strike expiry; referral windows ended; track records; tiers |
| 1st of month 00:05 | Reset monthly trip counters used for fee tiers (counts are computed, this only clears caches) |
| Weekly, Monday 03:00 | Export waitlist, organisations, trucks and closed trips to the company Google Drive (D015) |

## 13. Disputes

1. **Opened by:** receiver at delivery (with code), driver at delivery ("receiver noted a problem"),
   shipper up to *48 hours* after delivery, owner (for overcharge or conduct), or staff.
2. **Amount held at delivery:** if the report gives a count (12 of 600 bags), hold
   `declared_value × affected ÷ total`, capped at the unpaid balance. Without a count, hold *10%* of
   the unpaid balance. The shipper can change the claimed amount with evidence within *48 hours*.
3. **Opened after the balance was paid:** nothing is held; an upheld claim is recovered from the
   owner (`owner_receivable`), first from their next payouts.
4. **Evidence:** loading photos, seal number, delivery photos, GPS path, chat, and anything either
   side adds. Both sides have *48 hours* to respond.
5. **Decision:** operations or support staff decide within *72 hours* of evidence closing: upheld
   in full, upheld in part (amount), rejected or withdrawn. The note is shown to both sides.
6. **Effects:** upheld → refund to shipper at close, strike to owner. Rejected → hold released to
   owner. Repeated rejected claims (*3* in *90 days*) flag the shipper.
7. **Livestock and produce:** the category's `loss_allowance_bps` is subtracted before any claim.

## 14. Breakdown and transload

1. Driver taps **Report a problem → Truck broke down**, adds a photo and whether it can be fixed in
   under *4 hours*.
2. If yes: trip continues; waiting is not charged; ETA paused.
3. If no: operations sets the trip to `transloading`, finds a nearby verified truck (manual matching
   with a load-board alert limited to *30 km*), and creates a child trip from the breakdown location
   to the remaining stops.
4. **Money:** the original owner earns `freight × distance_done ÷ total_distance`. The new owner
   earns the rest. Commission applies to each share. If the original advance exceeds the original
   share, the difference becomes `owner_receivable`. The shipper pays nothing more.
5. The new trip has its own loading code (the original driver or the shipper's contact confirms the
   transfer) and the original delivery codes.

## 15. Waiting time

- The waiting clock starts on arrival at pickup or a drop-off and stops at loading confirmed or code
  verified.
- After *4 free hours*, each started hour adds the waiting rate for the truck type to a `charges`
  row for the shipper.
- The shipper gets a payment request. The owner is paid when the charge is paid.
- Unpaid after *72 hours*: the shipper can't book new loads until it is paid. Staff can waive.

## 16. Agents

- An invite link `/invite/{code}` sets `referred_by_agent_id` on the organisation created from it.
- Referral lasts *6 months* from the organisation's creation. Existing organisations can't be
  referred.
- On each clean trip close for a referred organisation (as shipper or owner), the agent earns
  `freight × 1%`, posted from platform revenue and paid to the agent's bank account with the trip's
  balance payout. If both the shipper and the owner were referred by agents, each agent earns.
- An agent can book for a shipper they referred: the booking is created as a draft for that shipper,
  who approves and pays it in their own app.
- Shares are voided for trips with an upheld claim. Staff can revoke a referral for abuse.
- **No self-referral.** A referral is refused if the new organisation's owner shares a phone number,
  email, device, bank account or NIN with the agent.
- **Already on the platform.** Inviting a phone number or email that already belongs to an
  organisation is allowed but marked "Not counted"; no referral is created.
- **Shares before setup.** Shares earned before the agent's identity and bank account are approved are
  kept as `pending` and paid once both are approved.
- **Reminders.** An agent can send at most *1* reminder per person per day and *3* per sign-up step.
- **Bookings for senders.** A draft prepared by an agent expires if the sender hasn't paid within *7
  days*. The agent never pays for a sender.
- **Programme paused.** When `agents_enabled = false`, no new referrals are created; active referrals
  stop earning from trips funded after the switch; earned shares are still paid.

## 17. Offline behaviour

| Who | Works offline | Needs connection |
| --- | --- | --- |
| Driver | Trip screen, photos, events, code entry (verified later), location points | Money release, new loads, chat sending (queued) |
| Owner | Last loaded lists and trips (read only) | Accepting loads, payouts, edits |
| Shipper | Last loaded trips (read only) | Booking, paying |
| Receiver | Last loaded tracking page | Reporting a problem |

Every queued action carries the phone's timestamp and is replayed in order on reconnect. The server
rejects a replayed action if the trip has moved on, and the app explains what happened.

## 18. Phone number visibility (D018)

**The window.** Numbers are visible only while the trip is confirmed and live: from `assigned`
(shipper has paid and an owner has accepted) to `delivered`, `delivered_with_exception` or
`cancelled`. Outside the window, every number shows as "Hidden after the trip ended" (or "Shown once
a truck is confirmed" before it).

| Viewer | Sees the number of | From | Until |
| --- | --- | --- | --- |
| Shipper owner, admin, booker | The driver and the truck owner | `assigned` | `delivered` or `cancelled` |
| Truck owner, manager | The shipper member who booked | `assigned` | `delivered` or `cancelled` |
| Driver | The shipper member who booked | `assigned` | `delivered` or `cancelled` |
| Driver | The pickup contact | `assigned` | `loaded` |
| Driver | The receiver of the next drop-off | `in_transit` toward that stop | That stop completed |
| Pickup contact, receiver | Nobody's number | – | – |
| Agent | No numbers of trip parties | – | – |
| Driver ↔ their own owner and managers | Each other | Always (same business) | Always |
| Staff | Everyone | Always | Always |

**Receivers and pickup contacts** tap **Ask the driver to call me** on their page. The driver gets a
push and WhatsApp message "Amina (receiver) asked you to call", with a **Call** button in the app.
This logs `callback_requested`. Limited to 3 requests an hour per stop.

**How numbers are served.**
- `profiles.phone` is readable only by its owner and staff (RLS).
- `trip_contacts(trip_id)` checks the viewer's role on the trip and the trip status on every call,
  and returns only the numbers this table allows right now. The client never stores them beyond the
  screen.
- Numbers never appear in notifications, emails, receipts, statements or exports sent to other
  parties.
- **Call** opens the phone dialler (`tel:`). **WhatsApp** opens a chat with that number (`wa.me`).
  Neither costs Freight Africa anything.

**Changes during a trip.**
- Driver changed: the old driver loses access immediately; the new driver gains it.
- Transload: both drivers see each other's number and the pickup contact's while the goods move
  between trucks.
- Trip cancelled: numbers hidden at once.

**After delivery.** Trip chat stays open for *48 hours*, or as long as a problem is open. After
that, follow-up goes through support. Staff can call anyone.

**Accepted risk.** A number seen during a trip can be saved, and parties may deal directly next time.
The defence is value, not secrecy: protected payment, instant payout, return loads and track record
only exist on the platform.

## 19. Owner-drivers: driving lock and safety

- **Driving lock.** For a user with `is_driver = true` on an active trip in `to_pickup` or
  `in_transit`, when the phone's speed has been above *10 km/h* for *30 seconds*, every screen except
  the Drive tab and SOS is covered (ux-owner.md Part 13 OD-01). **I'm a passenger** lifts it for *30
  minutes* and logs `driving_lock_dismissed`.
- **Held notifications.** Pushes marked `deliver_when_stopped` (new loads, return loads, offers,
  advance amounts, problems, papers, payouts) wait until the phone has been still for *2 minutes*.
  Trip reminders, resume-tracking, call-back requests, cancellations, balance paid and security alerts
  are never held. WhatsApp messages are not held (the platform can't hold them on the phone), so
  their wording is short.
- **Accepting while on a trip.** An owner-driver can accept a return load only while the truck is
  stopped; the accept button is disabled while moving.
- **SOS for owner-drivers.** There's no separate owner to alert, so operations is the first
  responder, and the user's emergency contact (`profiles.emergency_contact_*`), if set, gets a
  WhatsApp message with the location.
- **Licence expiry.** An expired licence blocks choosing **Me** as driver on new loads. A trip
  already in progress can continue only if operations allows it (logged as `staff_override`).

## 20. Driver confirmation of a trip

- When an owner or manager assigns an employed driver (not themselves), the trip shows on the
  driver's Trip tab as a new trip to confirm (ux-driver.md D-01). **I'll do this trip** logs
  `driver_acknowledged`; **I can't do this trip** logs `driver_unable` with a reason and notifies the
  owner and managers by WhatsApp and push to choose another driver.
- If the driver hasn't confirmed *2 hours* after assignment, or hasn't pressed **Go to pickup** by the
  start of the loading window, the owner is notified.
- Owner-drivers assigning themselves skip confirmation.
