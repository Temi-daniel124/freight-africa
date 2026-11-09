# DATA-MODEL.md, Freight Africa

**Authority level: 3 of 14.** Defers to `docs/DECISIONS.md` and `docs/PRODUCT.md`. Its behaviour annex is `docs/SYSTEM-LOGIC.md`, which has the same authority. Postgres on Supabase. This file defines every
table, enum, relationship, access rule (RLS) and the transactions that must be atomic. Behaviour
(state transitions, timings, calculations) is in `SYSTEM-LOGIC.md`.

## 0. Conventions

- Primary keys: `id uuid default gen_random_uuid()`.
- Every table has `created_at timestamptz default now()`; mutable tables also `updated_at` (trigger).
- **Money is `bigint` in kobo** (₦1 = 100 kobo). Never floats. Currency column only where noted
  (`'NGN'` default) so other currencies can be added later.
- **Rates are `int` in basis points** (3% = 300).
- Phone numbers stored in E.164 (`+2348031234567`), validated on write.
- Soft delete only where noted (`deleted_at`). Money, ledger, trip events, audit and documents are
  never deleted.
- Location columns use PostGIS `geography(Point, 4326)`; geofences `geography(Polygon)` or a centre +
  `radius_m`.
- Secrets and sensitive values (bank account numbers, full NIN) are encrypted at rest with
  `pgsodium`/Vault; only `last4` is stored in clear.
- `snake_case` for everything. Enum values lowercase.
- All writes that move money, change trip state, or use a code go through Postgres functions
  (`security definer`) called from server code, never direct table writes from the client.

## 1. Enums

```sql
create type org_kind          as enum ('shipper','transporter');
create type shipper_role      as enum ('owner','admin','booker','finance','viewer');
create type transporter_role  as enum ('owner','manager','driver');
create type staff_role        as enum ('super_admin','operations','verification','finance','support','field_agent');
create type account_status    as enum ('active','pending','suspended','banned');
create type kyc_status        as enum ('not_started','in_progress','approved','declined','needs_review','expired');
create type owner_tier        as enum ('new','established','gold');
create type truck_status      as enum ('draft','pending_review','active','paused','suspended','retired');
create type availability      as enum ('available','on_trip','unavailable');
create type doc_status        as enum ('pending','approved','rejected','expired');
create type load_status       as enum ('draft','awaiting_payment','funded','matched','cancelled','expired','refunded');
create type offer_kind        as enum ('accept','counter');
create type offer_status      as enum ('pending','awaiting_top_up','accepted','declined','expired','withdrawn');
create type trip_status       as enum ('assigned','to_pickup','at_pickup','loading','loaded','in_transit',
                                       'arrived','delivered','delivered_with_exception','closed',
                                       'cancelled','transloading');
create type stop_kind         as enum ('pickup','dropoff');
create type stop_status       as enum ('pending','approaching','arrived','completed','completed_with_exception');
create type tracking_state    as enum ('live','delayed','lost','escalated','ended');
create type ping_source       as enum ('app','tracker','event');
create type payment_status    as enum ('pending','received','partially_refunded','refunded','expired','failed');
create type payment_purpose   as enum ('load','top_up','waiting_charge','cancellation_fee');
create type payout_kind       as enum ('advance','balance','cancellation_fee','waiting_charge','agent_share','transload_share');
create type payout_status     as enum ('queued','awaiting_approval','processing','paid','failed','held','reversed');
create type ledger_account_kind as enum ('provider_cash','escrow','owner_payable','agent_payable','shipper_refundable',
                                         'platform_revenue','processing_cost','promo_expense','dispute_reserve',
                                         'owner_receivable');
create type dispute_type      as enum ('shortage','damage','wrong_goods','not_delivered','late','overcharge','conduct','other');
create type dispute_status    as enum ('open','awaiting_evidence','in_review','decided','closed');
create type dispute_outcome   as enum ('upheld_full','upheld_partial','rejected','withdrawn');
create type notify_channel    as enum ('whatsapp','sms','email','push','in_app');
create type notify_status     as enum ('queued','sent','delivered','read','failed','skipped');
create type flag_severity     as enum ('low','medium','high','critical');
create type language_code     as enum ('en','pcm','ha','yo','ig');
```

## 2. People and organisations

### profiles
One row per Supabase auth user.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | = `auth.users.id` |
| full_name | text | From Google or from the ID scan after KYC (ID value wins) |
| phone | text unique | E.164, verified |
| email | text unique | verified |
| language | language_code | default `en` |
| avatar_path | text | Storage path; for drivers, the KYC selfie crop after approval |
| date_of_birth | date | From ID scan |
| nin_last4 | text | |
| nin_enc | bytea | Encrypted full NIN, owners only |
| kyc_status | kyc_status | default `not_started` |
| status | account_status | default `active` |
| last_active_org_id | uuid | For the account switcher |
| emergency_contact_name / emergency_contact_phone | text | Owner-drivers and drivers; told when SOS is pressed |
| night_look | text | `auto`, `on`, `off` |
| deleted_at | timestamptz | Soft delete (data kept per retention policy) |

### staff_members
| Column | Type | Notes |
| --- | --- | --- |
| user_id | uuid PK → profiles | |
| role | staff_role | |
| corridor_ids | uuid[] | Field agents and operations can be scoped to corridors; null = all |
| mfa_required | bool | always true; enforced at sign-in |
| active | bool | |

### organizations
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| kind | org_kind | |
| name | text | Business name, or the person's name for individuals |
| cac_number | text | Optional |
| logo_path | text | |
| status | account_status | |
| tier | owner_tier | Transporters only; maintained by `refresh_track_record()` |
| insured_until | date | Transporters; set when an insurance certificate is approved |
| home_city_id | uuid → cities | |
| referred_by_agent_id | uuid → agents | Set once at sign-up from invite link |
| referral_ends_at | timestamptz | `created_at + settings.agent_share_months` |
| default_bank_account_id | uuid → bank_accounts | Transporters (and agents via their own org) |
| blocked_reason | text | e.g. unpaid waiting charge |

### organization_members
| Column | Type | Notes |
| --- | --- | --- |
| org_id | uuid → organizations | PK with user_id |
| user_id | uuid → profiles | |
| shipper_role | shipper_role | null if transporter org |
| transporter_role | transporter_role | null if shipper org |
| is_driver | bool | true for drivers and owner-drivers |
| invited_by | uuid → profiles | |
| status | account_status | `pending` until invite accepted |

Constraint: exactly one of `shipper_role` / `transporter_role` matches `organizations.kind`. Each org
has at least one `owner`.

### drivers
Extra data for members with `is_driver = true`.

| Column | Type | Notes |
| --- | --- | --- |
| user_id | uuid PK → profiles | |
| org_id | uuid → organizations | |
| licence_number | text | Read from licence photo |
| licence_expires_on | date | |
| default_truck_id | uuid → trucks | |
| status | account_status | `pending` until KYC and licence approved |

### agents
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid unique → profiles | |
| invite_code | text unique | 8 chars, no ambiguous letters |
| share_bps | int | default from `settings.agent_share_bps` (100) |
| status | account_status | |
| payout_org_id | uuid → organizations | A personal transporter-kind org created silently to hold the bank account |
| city_id | uuid → cities | |
| corridor_ids | uuid[] | Routes they work on |
| work_type | text | `truck_park`, `market`, `transport_company`, `own_network`, `other` |
| work_place | text | Park or market name |
| agreement_version | text | Agent agreement version accepted |
| reminder_counts | jsonb | Per person and step, for the reminder limits |

### invites
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| kind | text | `team_member`, `driver`, `agent_referral`, `staff` (staff invites expire in 48 hours) |
| org_id | uuid | Inviting org (team/driver) |
| agent_id | uuid | For referrals |
| phone / email | text | Who was invited |
| role_payload | jsonb | Sub-role to grant |
| token_hash | text | Link token, hashed |
| expires_at | timestamptz | 7 days |
| accepted_by | uuid → profiles | |
| accepted_at | timestamptz | |

### verification_sessions
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid → profiles | |
| provider | text | `didit` or `smile_id` |
| provider_session_id | text | |
| checks | text[] | e.g. `{id_document,passive_liveness,face_match,nin}` |
| status | kyc_status | |
| decision_reason | text | From provider |
| extracted | jsonb | Name, DOB, document number last4, expiry; no images |
| cost_usd_cents | int | For spend tracking |
| reviewed_by | uuid → staff | When staff override |
| completed_at | timestamptz | |

### bank_accounts
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| org_id | uuid → organizations | |
| bank_code | text | From Bachs bank list |
| bank_name | text | |
| account_number_enc | bytea | |
| account_last4 | text | |
| resolved_name | text | From account-name lookup |
| name_match_score | int | 0 to 100 vs KYC name; below 80 → staff review |
| status | text | `pending_hold`, `active`, `needs_review`, `disabled` |
| usable_from | timestamptz | `created_at + 24h` (D-rule, SYSTEM-LOGIC §10) |

### consents
| user_id | kind (`terms`,`privacy`,`whatsapp`,`location`,`marketing`) | version | granted bool | at | ip | user_agent |

## 3. Catalogue and geography

### cities
| id | name | state | location geography | is_corridor_hub bool | slug |

### corridors
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| slug | text unique | `lagos-kano` (direction-free; route pages use direction) |
| name | text | "Lagos ⇄ Kano" |
| city_a_id / city_b_id | uuid → cities | |
| via | text[] | Display only |
| distance_km | int | |
| typical_hours | int | |
| active | bool | |

### corridor_segments
Risky stretches: `corridor_id`, `path geography(LineString)`, `risk_level` (1 to 3), `safe_from`
time, `safe_until` time, `note`.

### approved_parks
`id`, `corridor_id`, `name`, `location`, `facilities text[]`, `active`.

### truck_types
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| code | text unique | `flatbed_30t`, `covered_20t`, `livestock`, `container_40ft`, `tipper`, `tanker` |
| name | text | Plain name shown to users |
| picture_path | text | Illustration used in chips |
| capacity_kg_default | int | |
| capacity_kg_min / max | int | |
| sort_order | int | |
| active | bool | |

### goods_categories
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| code | text unique | |
| name | text | "Bags of grain", "Cement", "Cartons and boxes" |
| icon_path | text | |
| parent_id | uuid | Groups for the chip picker |
| is_banned | bool | |
| specialist_only | bool | Fuel, chemicals |
| required_doc_type_ids | uuid[] | e.g. vet certificate |
| loss_allowance_bps | int | Normal loss allowed (livestock, produce) |
| needs_seal | bool | Ask for a seal number at loading |
| handling_note | text | Shown to driver |
| active | bool | |

### truck_type_goods
`truck_type_id`, `goods_category_id`. Default goods a truck type can carry.

### document_types
| code | name | applies_to (`truck`,`driver`,`org`,`load`) | required bool | has_expiry bool | blocks_when_expired bool |

Seed: vehicle licence, road-worthiness certificate, third-party motor insurance, goods-in-transit
certificate (optional, gives badge), driver's licence, vet health certificate (load), CAC certificate
(optional).

## 4. Trucks and documents

### trucks
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| org_id | uuid → organizations | |
| plate_number | text unique | Normalised, uppercase, no spaces |
| truck_type_id | uuid → truck_types | |
| capacity_kg | int | |
| make / model / year | text / text / int | Optional |
| photo_paths | text[] | Back (plate), side, front |
| status | truck_status | |
| availability | availability | |
| unavailable_until | date | |
| tracker_device_id | text | Traccar unique ID |
| last_known_location | geography | From latest ping |
| last_known_at | timestamptz | |
| corridor_ids | uuid[] | Corridors this truck runs |

### truck_goods_exclusions
`truck_id`, `goods_category_id`. Owner's unticked categories.

### documents
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| doc_type_id | uuid → document_types | |
| subject_kind | text | `truck`, `driver`, `org`, `load` |
| subject_id | uuid | |
| file_path | text | Private storage bucket |
| ocr | jsonb | Raw text read on the phone |
| expires_on | date | Confirmed by user |
| status | doc_status | |
| reviewed_by | uuid | |
| review_note | text | Shown to user if rejected |

## 5. Places and contacts

### saved_places
| id | org_id | label | address_text | location geography | landmark | default_contact_name | default_contact_phone | use_count |

### saved_receivers
| id | org_id | name | phone | email | whatsapp_ok bool | use_count |

## 6. Pricing

### lane_prices
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| corridor_id | uuid | |
| from_city_id / to_city_id | uuid | Direction matters (backhaul is cheaper) |
| truck_type_id | uuid | |
| base_kobo | bigint | Price for the standard lane distance |
| per_km_kobo | bigint | For pickup/drop-off outside the city centre radius |
| min_kobo | bigint | |
| multiplier_bps | int | 10000 = normal; staff raise in busy periods |
| valid_from / valid_until | timestamptz | |

### fee_rules
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| kind | text | `shipper_fee`, `commission`, `cancellation_fee`, `waiting_per_hour` |
| condition | jsonb | e.g. `{"monthly_trips_from":6,"monthly_trips_to":15}` or `{"tier":"gold"}` or `{"truck_type":"…"}` |
| rate_bps | int | For percentages |
| amount_kobo | bigint | For fixed amounts |
| corridor_id | uuid | Optional lane override (D009 competitive rule) |
| effective_from / until | timestamptz | |
| approved_by | uuid | Second staff approval (F-68) |

### promotions
| id | code | kind (`first_trip_no_fee`,`first_n_trips_no_commission`) | n int | active | budget_kobo | spent_kobo |

### promotion_uses
| promotion_id | org_id | trip_id | amount_kobo |

## 7. Loads, offers, trips

### loads
The shipper's booking. Becomes visible to owners when funded.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| ref | text unique | Human reference `FA-7K3Q9` |
| shipper_org_id | uuid | |
| created_by | uuid → profiles | |
| booked_by_agent_id | uuid | F-78 |
| corridor_id | uuid | Derived from pickup and final drop-off |
| goods_category_id | uuid | |
| goods_description | text | Optional, short |
| weight_kg | int | |
| quantity | text | "600 bags" |
| declared_value_kobo | bigint | |
| truck_type_id | uuid | Suggested, editable |
| requires_insured | bool | |
| pickup_from / pickup_until | timestamptz | Loading window |
| freight_kobo | bigint | Price offered to owners |
| fee_bps | int | Snapshot of shipper fee rate |
| fee_kobo | bigint | |
| promo_id | uuid | |
| total_kobo | bigint | freight + fee − promo |
| status | load_status | |
| funded_at | timestamptz | |
| matched_at | timestamptz | |
| no_truck_decision_due_at | timestamptz | funded_at + 24h |
| cancelled_reason | text | |
| notes_for_driver | text | |

### load_stops
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| load_id | uuid | |
| seq | int | 0 = pickup, 1..4 drop-offs |
| kind | stop_kind | |
| address_text | text | |
| location | geography | |
| geofence_radius_m | int | default `settings.geofence_radius_m` (250 → about 500 m across) |
| contact_name | text | Pickup contact or receiver |
| contact_phone | text | |
| contact_email | text | |
| contact_is_shipper | bool | "I'll be there myself" |
| code_hash | text | HMAC of loading/delivery code |
| code_sent_at | timestamptz | |
| code_attempts | int | Locks at 5 |
| code_locked | bool | |
| tracking_token_hash | text | Every stop: pickup contact link (R-03) and receiver link (R-01) |
| tracking_token_expires_at | timestamptz | delivered + 72h |
| status | stop_status | |
| arrived_at / completed_at | timestamptz | |
| waiting_started_at | timestamptz | |

### load_documents
`load_id`, `document_id`. Required documents for the goods (vet certificate).

### offers
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| load_id | uuid | |
| transporter_org_id | uuid | |
| truck_id / driver_id | uuid | Chosen at accept |
| kind | offer_kind | |
| amount_kobo | bigint | = load freight for `accept`; higher for `counter` |
| status | offer_status | |
| expires_at | timestamptz | Counter: 2h for shipper to respond |
| top_up_payment_id | uuid | When shipper accepts a counter |

Unique: one `counter` per (load, transporter_org).

### trips
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| ref | text unique | Same as load ref with `-T1`, `-T2` for transloads |
| load_id | uuid | |
| transporter_org_id | uuid | |
| truck_id | uuid | |
| driver_id | uuid → profiles | |
| freight_kobo | bigint | Agreed (load freight or accepted counter) |
| commission_bps | int | Snapshot |
| commission_kobo | bigint | |
| advance_bps | int | Snapshot by tier |
| advance_kobo | bigint | |
| promo_id | uuid | Owner promotion |
| status | trip_status | |
| tracking_state | tracking_state | |
| last_ping_at | timestamptz | |
| eta_at | timestamptz | |
| route_distance_km | int | |
| auto_release_at | timestamptz | arrived_at + 24h |
| parent_trip_id | uuid | For transloads |
| status_changed_at | timestamptz | |
| closed_at | timestamptz | |

### trip_events (append-only)
| Column | Type | Notes |
| --- | --- | --- |
| id | bigint identity PK | |
| trip_id | uuid | |
| type | text | See SYSTEM-LOGIC §2 event list |
| actor_user_id | uuid | null for system |
| actor_kind | text | `driver`,`owner`,`shipper`,`receiver`,`pickup_contact`,`staff`,`system` |
| location | geography | Phone location at the moment |
| media_ids | uuid[] | |
| payload | jsonb | e.g. seal number, reason |
| client_recorded_at | timestamptz | Phone time (offline) |
| created_at | timestamptz | Server time |

Trigger blocks update and delete.

### location_pings (partitioned monthly)
| trip_id | truck_id | recorded_at | received_at | location | accuracy_m | speed_kmh | heading | battery_pct | charging bool | source ping_source |

Index `(trip_id, recorded_at)`. Retained 12 months, then aggregated to a simplified path.

### media
| id | trip_id | stage (`loading`,`delivery`,`exception`,`breakdown`,`chat`,`dispute`) | path | sha256 | taken_at | location | uploaded_by |

### ratings
| trip_id | from_org_id | to_org_id | stars smallint 1..5 | tags text[] | comment | created_at | unique(trip_id, from_org_id) |

## 8. Money

### payments (money in)
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| purpose | payment_purpose | |
| shipper_org_id | uuid | |
| load_id | uuid | null for a batch parent |
| batch_id | uuid → payment_batches | |
| amount_kobo | bigint | |
| provider | text | `bachs` |
| provider_ref | text unique | |
| virtual_account_number | text | Shown to the shipper |
| virtual_account_bank | text | |
| expires_at | timestamptz | 24h |
| status | payment_status | |
| received_kobo | bigint | Under- or over-payment handled per SYSTEM-LOGIC §4.3 |
| received_at | timestamptz | |

### payment_batches
`id`, `shipper_org_id`, `load_ids uuid[]`, `amount_kobo`, `payment_id`, `status`.

### ledger_accounts
`id`, `kind ledger_account_kind`, `org_id` (nullable), `load_id` (nullable), `currency`. One escrow
account per load; one payable account per transporter org, agent, shipper; single platform accounts.

### ledger_transactions
| id | kind (`fund_load`,`advance`,`balance`,`commission`,`fee`,`refund`,`cancellation`,`waiting`,`agent_share`,`promo`,`processing`,`adjustment`) | load_id | trip_id | idempotency_key unique | memo | created_by | approved_by | created_at |

### ledger_entries
| id | transaction_id | account_id | debit_kobo | credit_kobo |

Constraint (deferred trigger): each transaction's debits equal its credits. Constraint: escrow
account balance for a load never goes below zero.

### payouts (money out)
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| kind | payout_kind | |
| org_id | uuid | Recipient (transporter org or agent payout org) |
| trip_id | uuid | |
| bank_account_id | uuid | Must be `active` and past `usable_from` |
| amount_kobo | bigint | |
| ledger_transaction_id | uuid | |
| status | payout_status | |
| provider_ref | text | |
| idempotency_key | text unique | `payout:{trip_id}:{kind}` |
| attempts | int | |
| last_error | text | |
| approved_by | uuid | When above `settings.payout_two_person_kobo` |
| paid_at | timestamptz | |

### refunds
| id | payment_id | amount_kobo | reason | ledger_transaction_id | status | provider_ref | approved_by |

### charges (money owed by a shipper after funding)
| id | shipper_org_id | trip_id | kind (`waiting`,`cancellation`,`counter_top_up`) | amount_kobo | payment_id | due_at | status (`open`,`paid`,`waived`) |

### reconciliation_runs
| id | run_date | provider_total_in | ledger_total_in | provider_total_out | ledger_total_out | differences jsonb | status | reviewed_by |

## 9. Problems, trust, agents

### disputes
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| trip_id | uuid | |
| stop_id | uuid | |
| opened_by_kind | text | `receiver`,`shipper`,`owner`,`staff` |
| opened_by_user_id | uuid | null for receiver |
| type | dispute_type | |
| description | text | |
| claimed_kobo | bigint | |
| held_kobo | bigint | min(claimed, unpaid balance) |
| status | dispute_status | |
| outcome | dispute_outcome | |
| decided_kobo | bigint | |
| decided_by | uuid | |
| decision_note | text | Shown to both sides |
| evidence_due_at | timestamptz | |

### dispute_messages
`dispute_id`, `author_user_id`, `author_kind`, `body`, `media_ids`, `created_at`.

### track_records
| org_id PK | clean_trips int | total_trips | upheld_claims | strikes_90d | rating_avg numeric(2,1) | rating_count | tier owner_tier | updated_at |

### strikes
| id | org_id | trip_id | reason (`no_show`,`late_cancel`,`upheld_claim`,`tracking_off`,`conduct`) | expires_at (90 days) | issued_by |

### referrals
| id | agent_id | org_id | kind (`owner`,`shipper`) | starts_at | ends_at | status (`active`,`ended`,`revoked`) |

### agent_earnings
| id | agent_id | referral_id | trip_id | amount_kobo | payout_id | status (`pending`,`paid`,`void`) |

### fraud_flags
| id | kind | severity flag_severity | subject_kind | subject_id | trip_id | details jsonb | status (`open`,`dismissed`,`actioned`) | handled_by |

### sos_alerts
| id | trip_id | user_id | location | status (`open`,`acknowledged`,`resolved`) | acknowledged_by | resolved_note |

## 10. Communication

### conversations
`id`, `trip_id` (unique), `created_at`. Participants derived from the trip (shipper members, owner
members, driver, staff).

### messages
| id | conversation_id | sender_user_id | sender_kind | body | media_id | voice_path | voice_seconds | created_at | deleted_at |

### message_reads
`message_id`, `user_id`, `read_at`.

### notifications
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| event | text | Notification code from SYSTEM-LOGIC §9 |
| user_id | uuid | null for receiver/pickup contact |
| to_phone / to_email | text | |
| channel | notify_channel | |
| template_code | text | |
| language | language_code | |
| payload | jsonb | |
| status | notify_status | |
| provider_message_id | text | |
| error | text | |
| fallback_of | uuid | SMS row points to the failed WhatsApp row |
| deliver_when_stopped | bool | Push held until the driver's phone is still (SYSTEM-LOGIC §19) |
| trip_id / load_id | uuid | |

### message_templates
| code | channel | language | body | meta_template_name | meta_category (`utility`,`authentication`) | meta_status | variables text[] |

### push_subscriptions
`user_id`, `endpoint`, `p256dh`, `auth`, `user_agent`, `created_at`, `last_ok_at`.

### notification_preferences
`user_id`, `event`, `channel`, `enabled`. Safety and money events cannot be disabled.

### support_threads
| id | channel (`whatsapp`,`email`,`in_app`) | user_id | phone/email | trip_id | status (`open`,`waiting_user`,`closed`) | assigned_to | last_message_at |

### support_messages
`thread_id`, `direction` (`in`,`out`), `author_staff_id`, `body`, `media_path`, `provider_message_id`.

## 11. Website and system

### content_pages
| id | kind (`route`,`city`,`help`,`blog`,`legal`,`marketing`) | slug | language | title | description | body_md | corridor_id | city_id | published bool | published_at | updated_by |

### waitlist_signups
`id`, `name`, `phone`, `email`, `role` (`shipper`,`owner`,`agent`), `corridor_interest`, `source`,
`created_at`, `invited_at`.

### settings
`key text PK`, `value jsonb`, `updated_by`, `updated_at`. All configurable numbers live here (list
in SYSTEM-LOGIC §11).

### approvals
| id | kind (`payout`,`refund`,`fee_change`,`setting_change`,`ledger_adjustment`,`dispute_decision`,`staff_role`) | subject_id | payload jsonb | requested_by | approved_by | status (`pending`,`approved`,`rejected`) | note | decided_at |

Constraint: `approved_by ≠ requested_by`. The action runs only when status becomes `approved`.

### staff_notes
| id | subject_kind | subject_id | author_staff_id | body | created_at |

### contact_logs
"Mark called" records: `id`, `trip_id`, `stop_id`, `staff_id`, `called_phone`, `outcome`
(`reached`,`no_answer`,`wrong_number`), `note`, `created_at`.

### field_tasks
| id | kind (`truck_inspection`,`owner_visit`,`park_survey`) | subject_id | assigned_to | due_at | status (`open`,`done`,`cancelled`) | result jsonb | photos text[] |

### on_call_shifts
| id | staff_id | role staff_role | starts_at | ends_at | is_escalation_contact bool | swapped_from uuid |

SOS escalation (SYSTEM-LOGIC §12) goes to the staff member whose shift covers the current time.

### assignments
| subject_kind (`trip`,`load`,`verification`,`dispute`,`support_thread`,`payout`,`flag`,`field_task`) | subject_id | staff_id | taken_at | released_at |

One open assignment per subject; feeds My work (ux-admin.md X-26).

### playbooks
| id | code | title | role staff_role | steps jsonb | contacts jsonb | version | published_at |

### playbook_runs
| id | playbook_id | subject_kind | subject_id | staff_id | ticked_steps jsonb | started_at | finished_at |

### saved_views
| id | staff_id | page | name | filters jsonb | shared bool |

### staff_preferences
| staff_id | quiet_from time | quiet_until time | push_kinds text[] |

### devices
| id | user_id | device_hash | user_agent | first_seen_at | last_seen_at | is_installed_pwa bool |

Used for sign-in history, "sign out of this device" and the `shared_device` fraud rule.

### content_feedback
`content_page_id`, `helpful bool`, `created_at` (help article "Did this help?").

### audit_log (append-only)
| id bigint | actor_user_id | actor_role | action | table_name | row_id | old jsonb | new jsonb | ip | user_agent | created_at |

Every staff write and every read of sensitive data (bank details, NIN, KYC results) is logged.

## 12. Access rules (RLS)

Helper functions (security definer, stable):

- `is_staff(role staff_role default null)`
- `is_member(org uuid)`; `member_role(org uuid)`
- `is_trip_party(trip uuid)`: shipper member of the load's org, member of the trip's transporter org,
  or the trip's driver.

| Table | Read | Write |
| --- | --- | --- |
| profiles | Self; staff; limited public fields (first name, avatar) for trip parties. **Phone and email never readable by other users**; trip parties get numbers only through `trip_contacts()` (SYSTEM-LOGIC §18) | Self (name, avatar); staff |
| organizations | Members; staff; public card (name, tier, rating, verified, insured) to trip parties | Org owner/admin; staff |
| organization_members | Members of same org; staff | Org owner/admin/manager (cannot remove last owner) |
| verification_sessions | Self; verification/super_admin staff | Server only |
| bank_accounts | Transporter owner/manager and finance staff; last4 only to others in org | Owner only (server function) |
| trucks, documents | Transporter members; verification/operations staff; trip parties see plate, type, photo | Owner/manager; drivers cannot edit |
| loads, load_stops | Shipper members; transporter members once the load is funded and fits them (via `load_board` view, no contact details); trip parties after match; staff | Shipper owner/admin/booker (draft only); server functions after funding |
| offers | Shipper members of the load; the offering transporter; staff | Server functions |
| trips | Trip parties; staff (operations scoped by corridor) | Server functions only |
| trip_events, media | Trip parties (drivers see their own trip only); staff | Insert via server functions; never update or delete |
| location_pings | Trip parties while trip active and for 72h after; staff | Driver of the trip (insert only, via edge function); tracker webhook |
| payments, charges, refunds | Shipper owner/admin/finance; finance staff | Server only |
| payouts | Transporter owner/manager; finance staff | Server only |
| ledger_* | Finance and super_admin staff only | Server functions only |
| disputes, dispute_messages | Trip parties except drivers; operations and support staff | Parties add messages; staff decide |
| messages | Conversation participants; staff | Participants |
| agents, referrals, agent_earnings | The agent; staff | Server |
| notifications | Recipient user; staff | Server |
| content_pages | Public when published | Staff with `content` permission (super_admin, operations) |
| settings, fee_rules, lane_prices, catalogue tables | Public read for active catalogue and lane price ranges; staff | Super admin (fees need second approval) |
| approvals, staff_notes, contact_logs, field_tasks, on_call_shifts, assignments, playbooks, playbook_runs, saved_views, staff_preferences | Staff (by role, per ux-admin.md) | Staff via server functions; on-call shifts and playbooks edited by super admin |
| devices | Self (own devices); staff | Server |
| audit_log | Super admin only | Trigger only |

Receivers and pickup contacts never touch tables directly. The `/track/[token]` page calls an edge
function that resolves the token hash and returns only: ETA, stop status, truck plate and type,
driver first name and photo, shipper display name, and (after the code is sent) a "code sent to your
WhatsApp" notice. The code itself is never returned by any API.

## 13. Atomic transactions (Postgres functions)

Each runs in one transaction with row locks. Each takes an idempotency key.

| Function | Locks | Does |
| --- | --- | --- |
| `fund_load(payment_id)` | payment row, load row | Marks payment received, posts `fund_load` ledger txn (debit escrow… see SYSTEM-LOGIC §7), sets load `funded`, starts no-truck timer, triggers load alerts |
| `accept_offer(load_id, org_id, truck_id, driver_id)` | load row `for update` | Fails if load not `funded` or already matched; checks truck fit, availability, documents, value limit; creates offer `accepted` and trip `assigned`; sets load `matched`; sets truck `on_trip` |
| `submit_counter(load_id, org_id, amount)` | load row | One per org; ≤ +20%; offer `pending` |
| `accept_counter(offer_id)` | load row, offer row | Creates top-up payment; offer `awaiting_top_up`; on top-up funded → same as `accept_offer` |
| `record_event(trip_id, type, …)` | trip row | Validates transition (SYSTEM-LOGIC §2), inserts event, updates trip status |
| `verify_code(stop_id, code, driver_location)` | stop row, trip row | Checks lock, attempts, geofence (driver location within radius and ping ≤ 5 min old), HMAC match; on success completes stop and, for pickup, calls `release_advance`; for last drop-off, calls `release_balance` |
| `release_advance(trip_id)` | trip row, escrow account | Ledger txn + payout `queued` (idempotent per trip) |
| `release_balance(trip_id)` | trip row, escrow account | Computes balance − held dispute amounts; ledger txns for commission, fee recognition, balance, agent share; payouts queued |
| `open_dispute(trip_id, …)` | trip row | Holds `min(claimed, remaining balance)` in `dispute_reserve` |
| `decide_dispute(dispute_id, outcome, amount)` | dispute, trip | Posts refund to shipper or releases hold to owner; records strike if upheld |
| `cancel_load(load_id, actor, reason)` | load, trip | Applies cancellation rules; refund and fees |
| `trip_contacts(trip_id)` | none (read) | Returns the phone numbers the caller may see right now, per SYSTEM-LOGIC §18 |
| `close_trip(trip_id)` | trip | After balance paid and no open dispute: status `closed`, refresh track record, ratings open |
