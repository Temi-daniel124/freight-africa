# PLATFORM-SCOPE.md, Freight Africa (full platform scope)

**Authority level: 6 of 14.** Defers to `docs/DECISIONS.md`, `docs/PRODUCT.md`, `docs/DATA-MODEL.md`
(with `docs/SYSTEM-LOGIC.md`), `docs/ARCHITECTURE.md` and `docs/ROLES-AND-PERMISSIONS.md`.

This is the scope of the **full platform**. By D014 everything under §4 is built and ships in the
launch version, all at once, in the order in §6. Anything not listed in §4 is out of scope for
launch. If a task seems to need something not listed here, stop and raise it rather than quietly
building it. The screen-by-screen specs in `docs/planning/` are annexes of this file.

## 1. Goals

- A shipper books a full truckload on any of the four corridors in under a minute, pays once, and
  sees exactly where their money and goods are until delivery.
- A truck owner sees funded loads that fit their trucks, accepts one in a tap, receives an advance on
  loading and the balance within minutes of delivery.
- A driver runs a whole trip by pressing one button that changes at each step.
- A receiver confirms delivery without an account, using only WhatsApp.
- No trip ever needs Freight Africa's own money (D001).
- Staff can see and control every trip, user, document and naira from one console.
- Nothing can be lost in one event again (D015).

## 2. Non-goals (launch)

- No credit terms, invoicing for later payment, loans or financing (D001, D002).
- No insurance sales or quotes (D011).
- No fuel vouchers or fuel station integration (D002).
- No native or app-store apps; no sideloaded Android app (D004, D005).
- No cross-border trips (Benin, Togo, Ghana).
- No vans, parcels, single small items or house moves smaller than a full truck.
- No open bidding or auctions. One instant price; an owner may counter once (SYSTEM-LOGIC §3).
- No in-app wallet that holds a balance for later use.
- No AI deciding prices, payouts, disputes or verification. AI may only assist staff.
- No masked calling; numbers shown only during a confirmed trip (D018).
- No languages other than English (D017).

## 3. Roles

| Role | Kind | Summary |
| --- | --- | --- |
| Shipper member | Member of a shipper organisation | Books and pays for loads. Sub-roles: owner, admin, booker, finance, viewer |
| Transporter owner | Member of a transporter organisation | Owns trucks, receives payouts, manages drivers. Sub-roles: owner, manager |
| Owner-driver | Transporter owner with `is_driver = true` | Owner screens plus driver trip screen |
| Driver | Member of a transporter organisation, role driver | Runs assigned trips. Sees no money |
| Pickup contact | No account | Person at loading. Gets the loading code by WhatsApp |
| Receiver | No account | Person at delivery. Gets the tracking link and delivery code |
| Agent | Individual account | Invites owners and shippers, earns a share (D012) |
| Staff | Freight Africa employee | Super admin, operations, verification, finance, support, field agent |

One person can hold several roles (for example a trader who ships and also owns a truck). The app
shows an account switcher when a person belongs to more than one organisation or role.

## 4. Feature list (everything ships at launch)

Feature IDs (`F-xx`) are referenced from the UX blueprints.

### 4.1 Accounts and onboarding

- **F-01 Sign-in.** Continue with Google; email one-time code (via Resend); WhatsApp one-time code
  (via Meta authentication template, Supabase custom SMS hook). No passwords.
- **F-02 Role choice at sign-up.** "I send goods", "I own trucks", "I'm an agent". Drivers join only
  by invite from an owner.
- **F-03 Organisation creation.** Shipper or transporter organisation; business name optional for
  individuals (defaults to the person's name).
- **F-04 Team members.** Invite by phone or email, assign sub-role, remove.
- **F-05 Identity verification (Didit).** ID scan, selfie liveness, face match, NIN lookup for owners
  (D006). Name and date of birth filled from the ID.
- **F-06 Bank account.** Account number + bank → name looked up automatically and matched to the ID
  name. New or changed account is held 24 hours before payouts can use it.
- **F-07 Install prompt.** Explains installing to the home screen; required for drivers' trip mode.
- **F-08 Account switcher.**
- **F-09 Text in one English message file** (D017), ready for more languages later. No language picker.
- **F-10 Consents.** Terms, privacy, WhatsApp messages, location during trips; stored with time and
  version.

### 4.2 Trucks, drivers and documents

- **F-11 Add truck.** Photo of the back → plate read on the phone; pick truck type from pictures;
  capacity and goods defaults filled from the type.
- **F-12 Truck goods exclusions.** Owner unticks goods categories per truck.
- **F-13 Documents.** Photograph each required document; expiry date read from the photo and
  confirmed; reminders 30, 7 and 1 day before expiry; expired documents pause the truck or driver.
- **F-14 Insured badge.** Upload goods-in-transit certificate; staff review; badge until expiry.
- **F-15 Add driver.** By phone number; WhatsApp invite; driver completes own Didit check; owner
  assigns default truck.
- **F-16 Connect a GPS tracker.** Owner enters tracker ID from a supported list; Traccar receives it.
- **F-17 Home city and corridors.** Owner taps where trucks are based and which corridors they run.
- **F-18 Truck availability.** Per truck: available, on trip, unavailable (with date it returns).

### 4.3 Booking and payment (shipper)

- **F-20 Instant quote.** Pickup, drop-off(s), goods, rough weight → suggested truck type and total
  price (freight + fee) shown before anything else is asked.
- **F-21 Multi-stop drop-offs.** Up to 4 drop-off stops, each with its own receiver and code.
- **F-22 Saved places and receivers.** Saved after first use; one-tap reuse.
- **F-23 Pickup contact.** "I'll be at loading myself" toggle, or a contact's name and WhatsApp.
- **F-24 Receiver.** "I'll receive it myself" toggle, or name and WhatsApp (email optional).
- **F-25 Declared value and documents.** Value of goods; required documents for the goods category
  (for example vet certificate for livestock).
- **F-26 Require insured truck** toggle.
- **F-27 Pay by bank transfer** to a one-time account number valid 24 hours. Card built in, switched off (D020).
- **F-28 Batch payment.** Companies pay several draft loads in one transfer.
- **F-29 Book again.** Repeat a past load with one tap; edit date and confirm.
- **F-30 Counter-offer approval.** If an owner counters higher, shipper pays the difference to accept
  or declines.
- **F-31 Cancel a load.** Rules in SYSTEM-LOGIC §4.
- **F-32 No-truck fallback.** After 24 hours with no accept: raise price, keep waiting, or full
  refund.

### 4.4 Matching (owner)

- **F-35 Load board.** Funded loads that fit the owner's trucks (type, goods, value limit, insured
  rule, corridor). Sorted by pickup time and distance from the truck.
- **F-36 Accept at price** with truck and driver selection.
- **F-37 Counter once** per load, up to +20% of the listed freight.
- **F-38 Return loads.** Loads from near the destination, shown before the truck arrives.
- **F-39 Load alerts.** WhatsApp/push when a fitting load is funded on the owner's corridors.

### 4.5 The trip

- **F-40 Trip timeline.** One timeline shared by shipper, owner, driver and staff (different detail).
- **F-41 Driver one-button flow.** Go to pickup → I've arrived → Loading → Enter loading code → Start
  trip → I've arrived → Enter delivery code → Done.
- **F-42 Loading evidence.** At least 3 photos of goods on the truck, seal number (optional per
  category), count or weighbridge ticket photo.
- **F-43 Loading code** from the pickup contact releases the advance.
- **F-44 Trip mode.** Full screen, Wake Lock, location every minute, offline queue (D005).
- **F-45 Tracking gap alerts.** Push at 15 min, staff call at 30, owner call at 60.
- **F-46 Tracker data** merged with phone data on the map.
- **F-47 Receiver tracking page** (no account).
- **F-48 Delivery code** confirms delivery and releases the balance.
- **F-49 Report a problem** by receiver (with code) or shipper; records exception and holds only the
  claimed amount.
- **F-50 Automatic release** after 24 hours if arrived with photos and no code or problem.
- **F-51 Waiting time** recording and waiting charges.
- **F-52 Trip chat** between shipper, owner, driver and staff; text, photos, voice notes.
- **F-53 Call** (real numbers only during a confirmed trip, by phone dialler or WhatsApp; **Ask the driver to call me** for receivers and pickup contacts, D018).
- **F-54 SOS.** One tap; sends location to staff and owner; staff call back.
- **F-55 Breakdown and transload.** Driver reports breakdown; staff assign a replacement truck.
- **F-56 Directions.** Opens Google Maps or Apple Maps with the stop's coordinates.
- **F-57 Ratings.** Both sides rate 1 to 5 with tags after delivery.

### 4.6 Money

- **F-60 Escrow per load** (D007).
- **F-61 Advance** on loading code: 30%, 40% or 50% by owner tier.
- **F-62 Balance** on delivery code: freight − advance − commission.
- **F-63 Payout status** visible to owner in real time.
- **F-64 Refunds** for cancellations and upheld claims; one refund per payment, at close.
- **F-65 Receipts and statements.** Shipper receipt per trip; monthly statement per organisation;
  owner payout statement. PDF and spreadsheet download.
- **F-66 Agent shares** paid with the owner balance at close.
- **F-67 Daily reconciliation** ledger vs Bachs, with differences shown to finance staff.
- **F-68 Two-person approval** for payouts above a threshold, manual refunds and fee changes.

### 4.7 Problems

- **F-70 Disputes** with evidence side by side and a decision recorded with reason.
- **F-71 Strikes and suspensions** (SYSTEM-LOGIC §8).
- **F-72 Fraud flags** (SYSTEM-LOGIC §10).
- **F-73 Route deviation and long-stop alerts** to staff.

### 4.8 Agents

- **F-75 Invite links and QR codes.**
- **F-76 People I brought** with status of each.
- **F-77 Earnings and payouts.**
- **F-78 Book for a shipper** they invited, with the shipper's approval and payment.

### 4.9 Track record

- **F-80 Tiers.** New, Established (5+ clean trips), Gold (25+).
- **F-81 Track record page** for owners: clean trips, rating, strikes, tier progress.
- **F-82 Public trust signals** on loads and trips: verified, insured, tier, rating.

### 4.10 Admin console (staff only)

- **F-85 Staff roles and permissions**, two-step sign-in, audit log.
- **F-86 Overview dashboard.**
- **F-87 Live trips map**, problem trips first.
- **F-88 Trips and loads** search and actions.
- **F-89 Manual matching.**
- **F-90 Users and organisations.**
- **F-91 Verification queue.**
- **F-92 Goods catalogue and truck types.**
- **F-93 Corridors, lane prices, geofences, parks, risk segments.**
- **F-94 Fees and promotions.**
- **F-95 Money: escrow, payouts, refunds, reconciliation, exports.**
- **F-96 Disputes.**
- **F-97 Agents.**
- **F-98 Message templates and delivery reports.**
- **F-99 Support inbox** (WhatsApp and email threads).
- **F-100 Fraud and risk.**
- **F-101 Website content** (route pages, city pages, help, blog).
- **F-102 Reports.**
- **F-103 Settings** (all numbers in `settings`).

### 4.11 Public website and SEO

- **F-105 Marketing pages**: home, for shippers, for truck owners, for agents, how it works, pricing,
  safety, about, contact.
- **F-106 Route pages** per corridor direction; **city pages**.
- **F-107 Help centre and blog.**
- **F-108 Legal pages**: terms, privacy, transporter agreement, agent agreement.
- **F-109 SEO files**: sitemap, robots, manifest, icons, Open Graph, JSON-LD, noindex on
  private routes, security.txt.
- **F-110 Waitlist** (pre-launch) with role and corridor; exported weekly (D015).

### 4.12 Notifications

- **F-112 notify() service** with WhatsApp → SMS fallback, email copy, push, in-app (D008).
- **F-113 Notification preferences** per user (cannot switch off safety and money messages).
- **F-114 In-app notification centre.**

## 5. Success metrics

**Leading (first 30 days after launch)**
- Paid trips: target 20. Below 5 = price or prepay rule wrong (stop and fix before growth spend).
- Payout time after delivery code: target 90% within 60 minutes.
- Lost cargo: target zero.
- Tracking coverage: share of trip minutes with a location point within 5 minutes. Target 85%.

**Lagging (day 90)**
- Trips per month: 46+ (break-even at ₦1m average freight).
- Shipper repeat rate: 40%+ of shippers book again within 30 days.
- Owner retention: 60%+ of owners with a trip in month 1 have a trip in month 2.
- Disputes: below 5% of trips; upheld claims below 2%.

## 6. Build order (D014)

1. Foundations: auth, organisations, roles, RLS, i18n, design system, ledger, settings, audit log.
2. Supply: owner/driver onboarding, Didit, trucks, documents, goods catalogue, truck types,
   verification queue.
3. Booking and money: quotes, loads, payments, escrow, release rules, refunds, receipts, admin money.
4. The trip: load board, offers, trips, driver flow, trip mode, tracking, codes, receiver page,
   notifications, live map.
5. Problems: disputes, SOS, cancellations, waiting, breakdowns, fraud flags, strikes.
6. Growth: return loads, agents, discounts, promotions, ratings, tiers.
7. Website and SEO.
8. Hardening: security review, testing on low-end phones and slow networks, backup restore drill,
   staff playbooks.

## 7. Screens-by-role (pointer)

The screen-by-screen spec lives in `docs/planning/`. Treat these as the literal screen inventory:

- `ux-conventions.md`: navigation shells, visual language, components, words, global behaviour
- `ux-public-and-auth.md`: public website, sign-in, sign-up, onboarding, account switcher
- `ux-shipper.md`
- `ux-owner.md`: transporter owner, manager and owner-driver
- `ux-driver.md`: driver, and the full spec of every driving screen
- `ux-owner-driver.md`: owner-driver, and how the driving screens differ for them
- `ux-receiver.md`
- `ux-agent.md`
- `ux-admin.md`

Do not invent screens without a reason traceable to a feature ID above.

## 8. Later updates (not in the launch build; don't architect against them)

| Update | Why later | What the build does now so it's easy later |
| --- | --- | --- |
| Pidgin, Hausa, Yoruba, Igbo (D017) | Translation and checking time | All text in one English message file; `language` columns kept |
| Card payments switched on (D020) | Chargeback risk | Built behind `card_payments_enabled` |
| Insurance partnership, fuel vouchers, financing (D002) | Need traction first | `payouts.kind` and ledger accounts are extendable |
| Cross-border corridors | Customs and currency | Corridors are data; `currency` columns exist |
| Masked calling (D018) | Paid service | All numbers come through `trip_contacts()` so a masking provider can replace them |
| Sideloaded Android app for background tracking (D005) | Only if PWA tracking proves too weak | Tracking ingestion accepts any source |
| Lane rate data product | Needs volume | Every quote and final price is stored |
