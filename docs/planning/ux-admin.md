# ux-admin.md, Freight Africa

**Annex to `docs/PLATFORM-SCOPE.md` (authority 6 of 14).** Visual rules come from `DESIGN_SYSTEM.md`. Follows `ux-conventions.md`, and defers to `DECISIONS.md`, `DATA-MODEL.md`,
`SYSTEM-LOGIC.md` and `PLATFORM-SCOPE.md` (F-85 to F-103). This is the screen-by-screen wireframe
description and user journey for **Freight Africa staff**: the people inside the company who keep
trips moving, check identities and trucks, handle money, answer users, and configure the platform. It
covers desktops (where most staff work), phones (on-call operations and field agents) and tablets. It
contains no drawings.

Base route `/admin`. Screen IDs `X-xx` are referenced elsewhere and must not be renumbered.

---

## Part 0. How to read this document

Each screen is described with the same headings: **Purpose**, **Who uses it**, **How they get here**,
**Desktop layout**, **Phone layout** (where staff use it on a phone), **Interactions**, **States**, and
**Why it works**. "Dialog" means a centred window over the page (a bottom sheet on phones). "Toast"
means a short message that disappears after 4 seconds. "Reason" means a required text field explaining
an action, saved in the audit log.

---

## Part 1. Who the staff are and how the console is shaped

### 1.1 Staff roles

| Role | Who | Main job |
| --- | --- | --- |
| **Super admin** | Founders | Everything, including fees, settings, staff and the audit log |
| **Operations** | Dispatch and trip control | Keep every trip moving; respond to SOS, tracking gaps, stuck loads, breakdowns |
| **Verification** | Trust and safety | Approve or reject people, trucks, papers, bank accounts and insurance |
| **Finance** | Money | Payouts, refunds, charges, reconciliation, approvals, exports |
| **Support** | Customer care | Answer WhatsApp, email and in-app messages; help with disputes |
| **Field agent** | Freight Africa staff on the ground at parks and markets (not the independent agents in `ux-agent.md`) | Inspect trucks, onboard owners in person, map parks |

Operations and field agents can be limited to certain corridors; they then see only trips, trucks and
people on those corridors.

### 1.2 What staff want

1. **See what needs attention first**, without hunting through lists.
2. **Act fast and safely**: one click for routine work, a clear warning before anything risky.
3. **Have the full story of any trip, person or naira on one page.**
4. **Never be the single point of failure**: two-person approval for big money, playbooks for every
   emergency, an audit trail for everything.
5. **Be reachable when it matters** (SOS, on call) and left alone when it doesn't.

### 1.3 Desktop navigation (the main way staff work)

**Left sidebar** (260 px, collapsible), grouped. Each person sees only the items their role allows
(table in 1.5). Badges show counts that need action.

1. **My work** (X-26): the personal queue.
2. **Overview** (X-01).
3. **Operations**: Live map (X-02) · SOS (X-05, red badge) · Trips (X-03) · Loads and matching (X-04).
4. **Trust**: Verification (X-07) · Disputes (X-08) · Fraud and risk (X-14).
5. **People**: Users and companies (X-06) · Agents (X-19) · Support inbox (X-13).
6. **Money**: Escrow (X-09) · Payouts (X-10) · Refunds and charges (X-11) · Reconciliation (X-12) ·
   Approvals (X-17).
7. **Setup**: Catalogue (X-15) · Corridors and prices (X-16) · Fees and offers (X-18) · Messages (X-20) ·
   Website content (X-22) · Settings (X-21).
8. **Insights**: Reports (X-23).
9. **Admin**: Staff and on-call (X-24) · Audit log (X-25).
10. Bottom: **Playbooks** (X-28), **Help**, the staff member's name, role and **On call** indicator.

**Top bar** (64 px):
- **Global search** (keyboard shortcut "/"): trip or load reference, plate, phone number, name,
  business, payout reference, dispute number. Results grouped by kind, each opening its page.
- **SOS indicator**: grey normally; red and pulsing with a count when an SOS is open (click → X-05).
- **Notification bell** (X-27).
- **Approvals** count for finance and super admins (click → X-17).
- Staff name and role; menu with **My profile** (X-29), **Playbooks**, **Sign out**.

**Patterns on every page.**
- **Lists** have filters, sort, **saved views** (for example "Lagos ⇄ Kano, problem trips"), column
  choice, and **Export** (logged). 50 rows per page.
- **Detail pages** have a right-hand **Activity** panel: the audit history of that record and staff
  notes, with **Add note**.
- **Actions that change money, status or access** open a dialog that states the effect in one sentence,
  requires a reason, and, when two-person approval applies (SYSTEM-LOGIC §10), says "This needs a
  second approval" and sends it to X-17.
- **Keyboard shortcuts** for repetitive work (shown with "?").
- **Real-time**: lists and maps update live; a small "3 new" pill appears instead of reshuffling a
  list someone is reading.

### 1.4 Phone navigation (on-call operations, support, super admin away from desk, field agents)

The console is fully responsive, but on a phone it shows a focused set of tabs.

**Operations, support and super admin on a phone: five bottom tabs.**

| Tab | Represents |
| --- | --- |
| **My work** | The personal queue (X-26), most urgent first |
| **Live** | The live map and problem trips (X-02) |
| **SOS** | Open emergencies (X-05), red badge, with sound |
| **Search** | Global search, full screen |
| **More** | Every other section the role allows, as a list |

**Finance on a phone:** My work · Approvals · Payouts · Search · More.
**Verification on a phone:** My work · Verification · Search · More.
**Field agents** have their own phone app shape (X-30): Tasks · Inspect · Parks · Me.

Desktop-only screens (heavy tables and editors such as Catalogue, Lane prices, Reconciliation and
Reports) open on a phone in a read-only, simplified form with "Open on a computer to edit."

### 1.5 Who sees what

| Section | Super admin | Operations | Verification | Finance | Support | Field agent |
| --- | --- | --- | --- | --- | --- | --- |
| My work, Overview | ✓ | ✓ | ✓ | ✓ | ✓ | Tasks only |
| Live map, SOS | ✓ | ✓ | | | view | |
| Trips, loads, matching | ✓ | ✓ | view | view | view | |
| Users and companies | ✓ | ✓ | ✓ | view | ✓ | view |
| Verification | ✓ | view | ✓ | | | truck inspections |
| Disputes | ✓ | ✓ | | view | ✓ | |
| Fraud and risk | ✓ | ✓ | ✓ | ✓ | | |
| Money pages | ✓ | view | | ✓ | view | |
| Approvals | ✓ | | | ✓ | | |
| Support inbox | ✓ | ✓ | | | ✓ | |
| Agents | ✓ | ✓ | | view | ✓ | |
| Catalogue, corridors, prices | ✓ | lane prices | | | | |
| Fees and offers | ✓ (second approval) | | | view | | |
| Messages | ✓ | view | | | view | |
| Website content | ✓ | ✓ | | | | |
| Reports | ✓ | ✓ | | ✓ | | |
| Settings, staff, audit log | ✓ | | | | | |

Anything a role can't use is hidden. A direct link to it shows "You don't have access to this. Ask a
super admin."

### 1.6 The staff journey at a glance

1. A super admin **invites** the staff member (X-24).
2. They **sign in**, set up **two-step sign-in**, and read the **staff code** and their role's
   **playbooks** (X-00, X-28).
3. Each shift starts on **My work** (X-26) and **Overview** (X-01).
4. They do their role's daily work (Parts 4 to 9), moving between queues and detail pages.
5. They respond to **notifications**, **SOS** and **approvals** as they arrive (X-27, X-05, X-17).
6. They look things up in **search**, **playbooks** and **help** (X-28).
7. They manage their own **profile and on-call** availability (X-29).

---

## Part 2. Getting in

### X-00 Staff invite and first sign-in

**Purpose.** Bring a new staff member in securely.

**How they get here.** A super admin adds them in X-24. They receive an email from
`mail.freight-africa.com`: "You've been added to Freight Africa as Operations. Set up your account:
[link]." The link is valid for 48 hours.

**Steps, one screen each (desktop card, or full screen on a phone).**
1. **Welcome**: "Welcome to the Freight Africa team, Kemi. Your role: Operations, Lagos ⇄ Kano and
   Lagos ⇄ Abuja." Main button **Continue**.
2. **Sign in**: Continue with Google (company email) or email code (A-01 and A-02). Staff must use the
   email the invite was sent to.
3. **Two-step sign-in (required)**: a QR code to scan with an authenticator app (Google Authenticator,
   Microsoft Authenticator or similar), a field for the 6-digit code to confirm, and **ten backup
   codes** with **Copy** and a checkbox "I've saved these somewhere safe." Main button **Turn on
   two-step sign-in**. Staff can't continue without it.
4. **Staff code**: a short page covering confidentiality (never share user data outside the console),
   how money actions work (reasons, second approvals), contact with users (through the console only,
   never personal WhatsApp), and what's logged (everything). Checkbox **I've read and agree** and
   **Continue**.
5. **Your playbooks**: the playbooks for their role (X-28), listed with **Read**. They can start work
   before finishing, but My work shows "3 playbooks to read" until they do.
6. **Install on your phone** (operations, support and field agents): the install steps and **Turn on
   SOS alerts** (push permission with sound), because on-call alerts depend on it.

**Every later sign-in.** Email or Google, then the authenticator code. Sessions last 12 hours; after
that, both steps again. A new device triggers an email alert to the staff member.

**States.** Lost authenticator: **Use a backup code**; out of backup codes: "Ask a super admin to reset
your two-step sign-in" (the reset is logged and needs a second super admin).

---

## Part 3. Starting a shift

### X-26 My work

**Purpose.** A personal to-do list, assembled from every queue the staff member is responsible for,
most urgent first, so nobody has to check ten pages.

**Who uses it.** Everyone; it's the page staff land on after signing in.

**Desktop layout.**
1. Greeting and shift line: "Good morning, Kemi. You're on call until 6 pm."
2. **Urgent** strip (red), only when something is: open SOS, a tracking escalation, a locked code, a
   payout above threshold waiting, a dispute past its deadline.
3. **My queue**: a single list mixing items from the role's queues. Each row: an icon for its kind,
   one line ("FA-7K3Q9: tracking lost 34 min, Jebba"), how long it has waited, its deadline, and one
   action button that opens it ("Open trip", "Review", "Approve", "Reply").
4. Filters as chips above the list: All · Trips · Verification · Disputes · Support · Money.
5. **Assigned to me** and **Unassigned** tabs; **Take** on an unassigned item assigns it to me so two
   people don't work on the same thing.
6. Right panel: **Today** counts for the role (for operations: trips live, loads without a truck, SOS
   today; for verification: items waiting, average review time; for finance: payouts sent, failed,
   waiting approval), and **Playbooks to read**.

**Phone layout.** The Urgent strip, then the queue as cards with the action button; filters in a sheet.

**What fills each role's queue.**

| Role | Items |
| --- | --- |
| Operations | SOS, tracking lost or escalated, codes locked, loads funded over 12 h without a truck, breakdowns, route deviations, long stops, drivers who haven't confirmed or started, counters waiting near expiry, field tasks to create |
| Verification | People, trucks, documents, bank name mismatches, insurance certificates; oldest first; items over 4 hours flagged |
| Finance | Payouts failed, payouts and refunds waiting approval, reconciliation differences, charges overdue, owner receivables |
| Support | Unanswered conversations (WhatsApp 24-hour window closing first), disputes waiting for evidence, help requests from trips |
| Super admin | Everything urgent across roles, plus approvals for fee and setting changes and staff changes |

**Why it works.** The question at the start of every shift is "what do I need to do now?" This page
answers it in priority order and stops two staff members picking up the same item.

### X-01 Overview

**Purpose.** The health of the whole business today, in one screen.

**Desktop layout.**
1. **KPI row** (today, each with a 7-day sparkline): trips started · trips delivered · loads funded ·
   loads without a truck · money in escrow · payouts sent · average payout time after delivery ·
   tracking coverage %.
2. **Needs attention now**: the most severe items across the business (the Urgent strip of everyone's
   My work), each linking to its record.
3. **Corridors** table: per corridor, trips this week, repeat-sender rate, trucks active, average
   freight, and the latest agent price comparison (staff-entered, D009), with amber where our all-in
   price is above the agent price.
4. **Sign-ups this week** by role, verification approval rate, WhatsApp messaging limit used today
   (D021).

**Phone layout.** KPIs as a two-column grid, then Needs attention, then corridors as cards.

---

## Part 4. Operations: keeping trips moving

### X-02 Live map

**Purpose.** See every truck on the road and spot trouble before users notice.

**Who uses it.** Operations; support (view); super admin.

**Desktop layout.**
1. Full-width map with every active trip's truck. Marker colour: green live; amber delayed; red lost,
   escalated or SOS; blue at a stop. Markers cluster when zoomed out.
2. Left panel: the list of active trips, problem trips first, with filters (corridor, state, owner
   tier, new owner, value band) and a search box.
3. Overlays toggled at the top: risky road stretches, approved parks, geofences, trucks with GPS
   trackers.

**Interactions.** Clicking a truck or list row opens a **side drawer**: trip summary, last location time
and source (phone or tracker), battery and charging, speed, the driver's and owner's phone numbers
with **Copy**, the latest events, and buttons **Open trip** (X-03), **Mark called** (outcome: reached,
no answer, wrong number, with a note; saved to the contact log), **Add note**, **Open playbook** (the
right one for the trip's problem).

**Phone layout.** The map full screen with a bottom drawer listing problem trips; tapping one opens the
same drawer as a sheet. **Call** buttons dial directly.

### X-05 SOS

**Purpose.** Respond to emergencies within two minutes, every time.

**How they get here.** The red SOS indicator; push with sound on the on-call phone; WhatsApp to the
on-call super admin if not acknowledged in 2 minutes (SYSTEM-LOGIC §12).

**Desktop layout.** Open alerts as large cards at the top, each with: the trip, the driver's name and
photo, the location on a map (updating), the time pressed, how long since, the driver's and owner's
numbers, and the emergency contact's number if set. Below: resolved alerts from the last 7 days.

**Interactions.**
- **Acknowledge** (one click, stops the escalation timer and the sound; records who and when).
- **Call driver** (shows the number; on a phone it dials).
- **Open playbook: SOS** (the steps: call the driver; if no answer, call the owner; if danger, call the
  police contact for that state from the playbook's list; record each step).
- **Add update** (each call or action as a timestamped line).
- **Resolve** (outcome and a required note: "Driver safe; tyre burst; mechanic on the way").

**States.** Sound and a flashing tab title until acknowledged. If two staff open the same alert, the
second sees "Kemi acknowledged this at 15:03."

**Phone layout.** The same cards full width, **Acknowledge** as the main button, **Call driver** next to
it.

### X-03 Trips

**Purpose.** Find any trip and see its full story; act on it when needed.

**Desktop list.** Columns: Reference · Status · Corridor · Sender · Owner · Plate · Driver · Arrival ·
Tracking · Money held · Flags. Saved views such as "Problem trips", "Arriving today", "New owners".

**Trip page.**
1. **Header**: reference, status chip, corridor, who booked it, agent (if any), and quick facts (value
   band, insured-only, new owner).
2. **Tabs**:
   - **Timeline**: every event with time, who, location on a mini map, and photos.
   - **Map**: the planned route, the path taken, gaps, deviations, stops.
   - **Money**: the load's ledger entries, payouts, refunds and charges.
   - **Codes**: when each code was sent, every attempt with its location and result. Never the code.
   - **Chat**: the trip conversation; staff post with the green Freight Africa label.
   - **Problems**: disputes on this trip.
   - **Messages**: every WhatsApp, SMS, email and push sent for this trip, with delivery status.
3. **Right panel**: the parties (sender, owner, driver, pickup contact, receivers) with phone numbers
   (staff always see them) and **Mark called**; the Activity panel.

**Actions** (shown by trip state; each opens a dialog with the effect, a reason, and approval if
needed):
- **Change truck or driver** (until loaded).
- **Issue a new code** (after calling the contact; the call log is required).
- **Confirm loading for the contact** / **Confirm delivery for the receiver** (when they can't use
  WhatsApp; requires a call log and the driver inside the area with photos; SYSTEM-LOGIC §5.2).
- **Extend free waiting** / **Waive waiting charge**.
- **Cancel trip** (the dialog shows the money effect from SYSTEM-LOGIC §4.4).
- **Start a transload** (opens X-04 to find a replacement truck near the breakdown).
- **Hold balance** / **Release hold**.
- **Change status** (super admin only, with reason; recorded as an override).

**Phone layout.** Header, then tabs as a horizontal scroll, actions in a **Take action** sheet.

### X-04 Loads and matching

**Purpose.** Get every paid load onto a truck.

**Desktop layout.** Tabs **Without a truck** (oldest first, with time since payment) · **Offers
waiting** · **Unpaid** · **All**. A load page shows everything the sender entered, the payment, who was
alerted and when, who viewed it, and offers.

**Find a truck panel** (on the load page): fitting trucks ranked by the matching rules, each with
distance from pickup, tier, rating, last active, and buttons **Alert again**, **Call owner** (number
shown, **Mark called**), and **Assign to this truck** (only with the owner's agreement on the phone,
recorded in the reason; creates the trip as if the owner had accepted).

**Other actions.** **Change price for this load** (lane price override with a reason; if higher, the
sender gets a payment request for the difference); **Extend the no-truck deadline**; **Refund in full**
(second approval).

### X-14 Fraud and risk (operations view)

Described in Part 5; operations sees flags for trips (code outside area, location jumps, long stops).

---

## Part 5. Trust: verification, disputes, risk

### X-07 Verification

**Purpose.** Approve real people, trucks and papers quickly and consistently.

**Desktop layout.**
1. Tabs: **People** · **Trucks** · **Documents** · **Bank accounts** · **Insurance**, each with a
   count and the oldest item's age.
2. A queue list (oldest first) with **Start reviewing**, which opens items one after another.

**Review screen.**
- Left: the evidence. For people: the Didit result summary (decision, checks passed, extracted name and
  date of birth), with **Show ID images** (opening them is logged). For trucks: plate photo with the
  plate text read from it, side and front photos, the owner's stated type and capacity. For documents:
  the photo with the expiry date read from it and the date the user confirmed.
- Right: a checklist for that item (for example "Plate on photo matches the plate entered", "Document
  belongs to this truck", "Expiry date correct", "Name matches ID"), each a checkbox.
- Buttons: **Approve** (A) · **Reject** (R, with reason chips and a note sent to the user in plain
  words) · **Ask for a new photo** (choose which photo and why) · **Send a field agent** (creates a
  field task, X-30) · **Skip** (N).
- A target time per item shows in the corner; the queue moves to the next item after each decision.

**Phone layout.** One item at a time, evidence on top, checklist below, buttons at the bottom.

**Why it works.** Side-by-side evidence and checklist make each decision consistent between reviewers,
and keyboard shortcuts make a queue of fifty items quick to clear.

### X-08 Disputes

**Purpose.** Decide problems fairly, on evidence, within 72 hours.

**Desktop list.** Columns: Number · Trip · Type · Claimed · Held · Opened by · Deadline · Status · Assigned.

**Dispute page.**
1. Header: type, amounts, status, deadline countdown.
2. **Two columns of evidence**: the sender's side and the owner's side, each with statements and photos.
3. **Trip evidence**, shared: loading photos and delivery photos side by side, seal number at loading
   versus reported, the GPS path with stops, the chat transcript.
4. **History**: previous disputes of each party and their outcomes.
5. **Decide** panel: outcome (upheld in full · upheld in part, with amount · rejected · withdrawn), a note
   to both sides (required, written in plain words), strike to the owner (preselected when upheld), and
   the money effect shown before confirming ("₦40,000 refunded to the sender at trip close; ₦510,000
   released to the owner"). Decisions above ₦1m go to X-17.
6. **Ask for more evidence** (from either side, with a new deadline).

### X-14 Fraud and risk

**Purpose.** Catch abuse patterns early.

**Desktop layout.** A list of flags with kind (code outside the area, location jumps, shared device,
bank account change, repeated claims, self-referral attempt), severity, subject, trip and time. A flag
page shows the evidence (locations, devices, accounts sharing a device or bank account, timelines) and
the related records. Actions: **Dismiss** (reason) · **Suspend account** · **Hold payouts** · **Open a
dispute** · **Escalate to super admin**. A side panel lists the current rule thresholds with a link to
edit them in Settings.

---

## Part 6. People and support

### X-06 Users and companies

**Purpose.** Everything about one person or business in one place.

**Desktop list.** Search and filters (kind, status, tier, corridor, joined date, referred by agent).

**Company page tabs.** Summary (kind, status, tier, track record, rating, referral) · Members · Trucks ·
Drivers · Trips · Money (payments or payouts, receivables) · Documents · Strikes · Ratings ·
Conversations.

**Person page.** Profile, companies and roles, sign-in history and devices, identity checks (results;
images only on request, logged), consents.

**Actions.** **Suspend** / **Restore** · **Ban** (blocks the phone, email and device) · **Add strike** /
**Remove strike** · **Change tier** (super admin) · **Set a value limit for this company** · **Merge
duplicates** (super admin) · **Block bookings** / **Unblock** · **Reset sign-in** (sends new sign-in
links) · each with a reason.

### X-13 Support inbox

**Purpose.** Answer every message in one place, with the context already there.

**Desktop layout.**
1. Left: conversation list from WhatsApp, email, the contact form and in-app help, newest or most
   urgent first. Each shows the person, the channel icon, the first line, the waiting time, and (for
   WhatsApp) a countdown of the 24-hour reply window.
2. Middle: the conversation, with a composer. Inside the 24-hour WhatsApp window, any reply can be sent;
   outside it, the composer only allows an approved message template and says so.
3. Right: the person's card (companies, live trips, recent problems), linked trip if detected, and
   **Saved replies**.

**Interactions.** **Reply** · **Use a saved reply** · **Draft a reply** (AI suggests a reply for the
staff member to edit; it never sends by itself) · **Assign to** · **Link to a trip** · **Open a
dispute** · **Close**. Closed conversations reopen automatically when the person writes again.

**Phone layout.** The list, then the conversation full screen; the person's card in a sheet.

### X-19 Agents

**Purpose.** Look after independent agents and stop abuse.

**Desktop layout.** List of agents with people brought, active, trips, earned, flags. Agent page:
referrals with status, shares (earned, paid, void), payments, reminders sent, flags. Actions: **Suspend
agent** · **Remove a referral** (reason; future shares stop) · **Void a share** (reason) · link to the
programme switch in Settings.

---

## Part 7. Money

### X-09 Escrow

**Purpose.** Know exactly how much shippers' money is being held and why.

**Layout.** Total held, then every load with money held: amount paid, released (advance, balance),
held for problems, age. Closed loads with any money left show in red at the top ("must be zero").

### X-10 Payouts

**Purpose.** Make sure every owner and agent is paid, and paid once.

**Layout.** Tabs **Queue** · **Waiting approval** · **Failed** · **Paid**. Filters for kind, amount,
bank, date. A payout page shows the ledger entry, the bank account (last four), every attempt and the
provider's responses.

**Actions.** **Retry** · **Hold** (reason) · **Release hold** · **Approve** (above ₦5m; not your own
request) · **Mark as returned by the bank**.

### X-11 Refunds and charges

**Layout.** Refunds (pending, sent), charges owed by senders (open, paid, waived), and owner receivables
with recovery progress. Actions: **Create a manual refund** (always second approval) · **Waive a
charge** (reason).

### X-12 Reconciliation

**Purpose.** Prove every day that our records match the payment provider.

**Layout.** Daily runs with totals in and out from both sides; each difference listed with the provider
record and our record side by side. Actions: **Mark explained** (note) · **Create an adjustment**
(ledger entry with second approval). **Export** for the accountant: ledger by date range, payouts,
refunds, revenue (fees, commission, offers, agent shares).

### X-17 Approvals

**Purpose.** A second pair of eyes on every risky change.

**Layout.** A list of waiting items: payouts above ₦5m, manual refunds, fee and money setting changes,
ledger adjustments, dispute decisions above ₦1m, staff role changes. Each shows who asked, when, the
reason and the exact effect. **Approve** / **Reject** (with note). The person who asked can't approve
their own item. Approved items run immediately and the requester is told.

**Phone layout.** One item per card, **Approve** and **Reject** at the bottom, for finance staff away
from the desk.

---

## Part 8. Setup (mostly super admin)

### X-15 Catalogue

**Purpose.** Decide what can be carried, by which trucks, with which papers.

**Layout.** Three tabs:
- **Goods categories**: a tree you can drag to reorder; each category has a name, icon, banned switch,
  specialist-trucks-only switch, required documents, seal needed, normal loss allowance, handling note
  shown to drivers, active switch.
- **Truck types**: name, picture, capacity default and range, the goods they carry by default (chips),
  order.
- **Document types**: name, applies to (truck, driver, company, load), required, has expiry, pauses
  when expired.

Every save first shows "This affects 34 trucks and 6 open loads," with the list.

### X-16 Corridors and prices

**Purpose.** Control where we operate and what trips cost.

**Layout.**
- **Corridors**: name, cities, places on the way, distance, usual time on the road, active.
- Per corridor, a **map editor**: draw risky road stretches with risk level and safe hours; drop pins for
  approved parks with name and facilities; set each city's centre radius.
- **Lane prices** grid: from city × to city × truck type, with base price, price per extra km, minimum,
  busy-period multiplier, and the latest **agent price** for comparison. Cells where our all-in price is
  above the agent price are amber. **Change by percentage** for a whole corridor; scheduled changes with
  a start date; history of every change.

### X-18 Fees and offers

**Purpose.** Set what Freight Africa charges.

**Layout.** Shipper fee steps, commission by tier, cancellation fee, waiting charge per truck type,
per-corridor overrides, advance percentages, value limits; offers (first trip with no fee, first trips
with no commission) with budget and amount spent. Every edit becomes a pending change until a second
person approves it, then takes effect at a chosen time. A preview shows the effect on a sample trip:
"A ₦1,000,000 Lagos → Kano trip would cost a sender on their first 5 trips this month ₦1,030,000 and
pay an established owner ₦950,000."

### X-20 Messages

**Purpose.** Control every message the platform sends and see whether it arrives.

**Layout.** Templates per event and channel (English at launch, D017) with variables, the Meta template
name and approval status, and **Submit to Meta**; a preview with sample data. A **Delivery report**:
sent, delivered, read and failed by channel and template; the failed list with errors and whether the
SMS backup went out. **WhatsApp account health**: quality rating and today's messaging limit and use
(D021).

### X-22 Website content

**Purpose.** Keep the public site and help centre accurate.

**Layout.** Pages by kind (route, city, help, blog, legal, marketing). A Markdown editor with preview,
search fields (title, description, sharing image), **Publish**, **Unpublish**, **Schedule**. Legal pages
create a new version on publish, and the version each user accepted is recorded. Route pages show their
automatic data (price ranges, truck counts), which can't be edited by hand.

### X-21 Settings

**Purpose.** Every adjustable number in one place.

**Layout.** Every setting from SYSTEM-LOGIC §11, grouped (Booking, Matching, Codes, Tracking, Money,
Trust, Agents, Messaging, Driving), each with a plain description, current value, who changed it last
and when. Money-related settings need a second approval. Switches such as **Card payments**, **SMS
backup** and **Agent programme** live here.

---

## Part 9. Insight and administration

### X-23 Reports

**Purpose.** Understand how the business is doing.

**Layout.** A list of reports: trips and revenue by corridor, week and month; sender cohorts and repeat
rate; owner retention; payout times; disputes and claims rate; tracking coverage; offer spend; agent
performance; identity-check and messaging spend. Each report: a chart, a table, date and corridor
filters, and **Download spreadsheet**.

### X-24 Staff and on-call

**Purpose.** Manage the team and who answers emergencies.

**Layout.**
- **Staff**: list with role, corridors, last sign-in, two-step status. **Invite staff** (email, role,
  corridors) → X-00 email. **Change role** (second approval) · **Limit to corridors** · **Reset two-step
  sign-in** (second super admin) · **Deactivate**.
- **On-call rota**: a weekly calendar of shifts per role (operations always; a super admin as the
  escalation contact). Each shift names one person. Gaps show in red. The SOS escalation goes to whoever
  is on call at that moment.

### X-25 Audit log

**Purpose.** A permanent record of who did what.

**Layout.** Search by staff member, record, action and date. Each entry shows the old and new values,
the reason, and the IP and device. Read-only. Super admin only.

---

## Part 10. Field agents (phone)

### X-30 Field agent app

**Purpose.** Support Freight Africa's staff at truck parks and markets: inspecting trucks, onboarding
owners in person, mapping parks.

**Phone tabs:** **Tasks** · **Inspect** · **Parks** · **Me**.

- **Tasks**: inspections and visits assigned to me, with address, owner name and phone (**Call**,
  **WhatsApp**), a map link, and the due time. Tapping a task opens it.
- **Inspect a truck**: opens the truck's record; take fresh photos (plate, side, owner standing with the
  truck); tick a checklist (plate matches papers, visibly roadworthy, tarpaulin and ropes, tyres); then
  **Approve truck** or **Report a problem** (reason chips and a note). Works offline and uploads later.
- **Onboard an owner on the spot**: shows a QR code for the owner to scan with their own phone, which
  starts their setup. The field agent can watch progress but can't complete the identity check for them.
- **Parks**: add an approved park from the current location (name, photos, facilities chips) or update
  an existing one.
- **Me**: profile, two-step sign-in, sign out.

---

## Part 11. Notifications

### X-27 Staff notifications

**Purpose.** Tell staff what needs them without drowning them.

**Desktop.** The bell opens a panel grouped **For me** (assigned to me, mentions in notes, approvals I
asked for) and **For my role** (new queue items above the role's threshold). Each opens its record.

**What staff are told, and how.**

| Moment | In the console | Push (phone) | Sound | WhatsApp |
| --- | --- | --- | --- | --- |
| SOS pressed | ✓ | ✓ (operations on call) | ✓ until acknowledged | To the on-call super admin if not acknowledged in 2 minutes |
| Tracking escalated (60 min) | ✓ | ✓ (operations on the corridor) | | |
| Code locked | ✓ | ✓ (operations) | | |
| Load without a truck for 12 h | ✓ | | | |
| Item assigned to me | ✓ | ✓ | | |
| Mentioned in a note | ✓ | ✓ | | |
| Approval waiting | ✓ | ✓ (finance, super admin) | | |
| My request approved or rejected | ✓ | ✓ | | |
| Dispute deadline in 12 h | ✓ | | | |
| WhatsApp 24-hour window closing on an unanswered conversation | ✓ | ✓ (support) | | |
| Reconciliation difference | ✓ | | | |
| WhatsApp messaging limit above 80% today | ✓ | ✓ (super admin) | | |
| Sign-in from a new device | | | | Email to the staff member |

Staff set **quiet hours** for non-urgent pushes in X-29. SOS and on-call alerts ignore quiet hours while
the person is on call.

---

## Part 12. Help and playbooks

### X-28 Playbooks

**Purpose.** Written, tested steps for every situation, so a new staff member handles an emergency the
same way an experienced one would.

**Layout.** A list grouped by role. Each playbook has: when to use it, the steps as a checklist, who to
call (with numbers), what to record, and links to the console screens involved. Playbooks open from the
console wherever they apply: **Open playbook** on an SOS, a lost truck, a locked code, a breakdown, a
dispute type.

**Playbooks at launch** (one per worst case in the blueprint): Driver disappears with cargo · Goods
damaged · Shortage · Livestock loss · Road accident · Robbery or kidnapping · Breakdown and transload ·
Illegal or misdeclared goods · Payment reversed · Receiver absent or refusing · Fake truck listing ·
Faked delivery code · Large company asks for credit terms · Payment provider outage · Account takeover
of a payout · Code locked · Tracking lost · WhatsApp account restricted.

When a playbook is followed on a record, each ticked step is saved to that record's Activity.

**Staff help.** A **Help** link opens short guides on using each console section, keyboard shortcuts, and
how to request access or report a console problem to a super admin.

---

## Part 13. My profile

### X-29 My profile

**Purpose.** The staff member's own settings.

| Section | What's there | What can be done |
| --- | --- | --- |
| Profile | Name, photo, email, phone, role, corridors (read only) | Change photo and phone |
| Two-step sign-in | Status, backup codes left | **Show new backup codes**, **Move to a new phone** |
| On call | My upcoming shifts | **Swap a shift** (asks the other person; a super admin is told) |
| Notifications | Push per kind, quiet hours | Change (on-call alerts locked on during shifts) |
| Devices | Signed-in devices | **Sign out of a device**, **Sign out everywhere** |
| Install | Whether the console is installed on this phone | Install steps and **Test SOS sound** |

---

## Part 14. Behaviour that applies everywhere

- **Attention first.** My work and the Urgent strip always put the most serious items on top.
- **One owner per item.** Items are taken or assigned, so two people never work on the same problem
  without knowing.
- **Reasons and records.** Every change to money, status or access asks for a reason and is logged with
  old and new values.
- **Two people for big decisions.** Payouts over ₦5m, manual refunds, fee and money settings, ledger
  adjustments, large dispute decisions and staff role changes.
- **Least access.** Each role sees only its sections; corridor limits narrow it further; sensitive
  images and numbers are logged when opened.
- **Live, not reshuffled.** Lists and maps update live, but new items appear as a "new" pill instead of
  moving rows under the cursor.
- **Works on a phone when it matters.** SOS, approvals, the live map, search and the support inbox work
  fully on a phone; heavy editors are desktop-only.
- **Plain words to users.** Every note, rejection reason and decision staff write is shown to users as
  written, so the console reminds staff to write plainly and politely.
