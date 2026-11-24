# ux-owner.md, Freight Africa

**Annex to `docs/PLATFORM-SCOPE.md` (authority 6 of 14).** Visual rules come from `DESIGN_SYSTEM.md`. Follows `ux-conventions.md`, and defers to `DECISIONS.md`, `DATA-MODEL.md`,
`SYSTEM-LOGIC.md` and `PLATFORM-SCOPE.md`. This is the screen-by-screen wireframe description and
user journey for the **transporter owner** role: anyone who owns one or more trucks and wants loads
for them, from a single owner who drives to a fleet of fifty. It also covers **admins** (staff an
owner adds to run the fleet) and the **owner who drives** (an owner who drives their own truck). It
covers phones and desktops and contains no drawings. Driver screens are in `ux-driver.md`.

Screen IDs (`T-ON-xx`, `T-xx`) are referenced from other documents and must not be renumbered.
Shared screens owned by `ux-public-and-auth.md` (A-, N-) are described here from the owner's side.

---

## Part 0. How to read this document

Each screen is described with the same headings:

- **Purpose**: what the owner is trying to get done here.
- **How they get here**: the screens, messages or buttons that lead in.
- **Phone layout**: what sits on the screen from top to bottom on a phone (about 360 to 430 px).
- **Desktop layout**: how the same screen is arranged on a laptop or desktop (1024 px and wider).
  Tablets in landscape use the desktop layout; in portrait, the phone layout with wider margins.
- **Interactions**: every button, link, field and gesture, what it does and where it leads.
- **States**: loading, empty, error and special situations.
- **Why it works**: how the screen moves the owner towards their goal.

"Sheet" means a panel that slides up from the bottom on a phone and opens as a centred dialog on
desktop. "Toast" means a short message that appears briefly and disappears after 4 seconds.

---


## D045 and D046 update (24 Nov 2026): Home, truck detail, drivers

These override the older Home, truck and driver layouts below where they differ. Phone layouts first;
desktop arranges the same cards.

**Truck owner Home, phone.** Greeting and bell; summary chips that filter ("12 trucks · 5 on a trip · 4
ready · 3 paused"); a map card (about 200 px) with every truck on a trip, tapping it opens the full
map; **Needs you** (assign a driver, answer a request, a paper expiring); **Your trucks**: truck cards
with the truck graphic and its load display (D046: "80% full", "24 t of 30 t", or goods and rough
amount, or "Cattle · 40 head"), plate and type, a status chip, the driver's avatar and name, and the
route; **Loads for your trucks**: three rows and See all.

**Desktop (reference 07, simplified).** The map widget across the top with the filter chips over it,
then the truck cards in a grid on the left, **Needs you** and **Earnings this month** on the right.
Nothing else from the reference (no route efficiency, trends or chat cards).

**Truck detail** (a full page on phones, the right panel on desktop): the big truck graphic with its
load display and status; the current trip (reference, from/to, goods, weight or amount, pickup and
delivery times, progress); the driver (avatar, name, phone, licence status, trips done); the sender's
business name and what this trip pays (owners and admins only); the truck's papers with expiry dates;
the truck's trip history (date, route, goods, driver, amount earned); actions **Assign driver**,
**Pause truck**.

**Drivers page.** Each driver's avatar, status (on a trip, free, paused) and current truck; driver
detail shows current trip, phone, licence and history. **Send a new PIN link** for a driver invited by
phone (D044).

**One truck, driving it.** The same Home without the fleet parts (see Part 13).

## Part 1. The owner's goals and the shape of the app

### 1.1 What a truck owner wants

1. **Keep every truck earning**: a load for each truck, and a load back, with less time empty.
2. **Get paid fast and for certain**: no chasing shippers, no waiting weeks.
3. **Know where trucks and drivers are** without calling all day.
4. **Stay allowed to work**: papers valid, account in good standing.
5. **Build a reputation** that brings better loads, bigger advances and lower commission.
6. For fleets: let a admin run the day-to-day while the owner keeps control of money.

Every screen is judged against these six goals.

### 1.2 How the money works, in one paragraph the owner sees often

The shipper has already paid before any load appears. The owner sees **"You get ₦950,000"** on every
load: the freight price minus Freight Africa's commission (5%, or 4% for Gold owners, and nothing on
the first 3 trips). They receive part of it as an **advance** as soon as the goods are checked onto
the truck (30% for new owners, 40% after 5 clean trips, 50% for Gold), and the **balance** within
minutes of the receiver's delivery code. Money only goes to the owner's own verified bank account.

### 1.3 One app, on phone or desktop

Freight Africa is a single installable web app (D004). Owners often run their business from a phone
at a truck park, and larger fleets from a desktop in an office. Both get the same data and screens;
the layout adapts. Owners who drive must install it on their phone, because trip tracking needs it.

### 1.4 Mobile navigation: five bottom tabs

| Tab | Icon and label | What it represents | Badge |
| --- | --- | --- | --- |
| **Home** | House, "Home" | Today: what needs you, money coming, live trips, the best loads for your trucks, trucks at a glance | Red dot when something needs action |
| **Loads** | Box with an arrow, "Loads" | The load board: paid-for loads that fit your trucks, ready to accept | Count of new fitting loads since last visit |
| **Trips** | Route line, "Trips" | Every trip your trucks are doing or have done | Count of active trips |
| **Earnings** | Naira note, "Earnings" | Payouts received and coming, statements, bank account | Amber dot if a payout failed |
| **More** | Three lines, "More" | Trucks, drivers, documents, track record, business and team, load alerts, help, settings | Red dot if a document has expired |

For an **owner who drives**, the **Trips** tab is replaced by **Drive** (a steering wheel icon). Drive
opens the driver's one-button trip screen (`ux-driver.md`, D-01) for trips they drive themselves.
All trips, including those given to other drivers, stay under More → All trips.

Admins see the same tabs. Earnings shows amounts but not the bank account controls.

Tapping the active tab again scrolls to the top. Each tab keeps its place.

### 1.5 Desktop navigation: left sidebar and top bar

**Left sidebar** (240 px, collapsible to icons):

1. Freight Africa logo.
2. **Find loads** button, full width, green: the owner's main action, the same place a shipper has
   Book a truck.
3. Items with icons and labels: **Home**, **Loads**, **Trips**, **Earnings**, **Trucks**,
   **Drivers**, **Documents**, **Track record**, **Team** (owners only), **Help**.
4. At the bottom: **Settings** and the signed-in person's name and photo.

**Top bar** (64 px): page title on the left; **search** in the middle (trip reference, plate
number, driver name, city); on the right the **notification bell** and the **organisation
switcher** (logo and business name, opens A-09).

**Content area:** up to 1200 px wide. Lists are tables with sortable columns. Detail screens use two
columns: main content on the left, a sticky panel on the right for money, people and actions. The
load board on desktop shows a list beside a map.

### 1.6 Owner and admin permissions

| Action | Owner | Admin |
| --- | --- | --- |
| See the load board, accept, offer a different price | ✓ | ✓ |
| Assign or change trucks and drivers on trips | ✓ | ✓ |
| Add or edit trucks and documents | ✓ | ✓ |
| Add, pause or remove drivers | ✓ | ✓ |
| See freight, earnings and payouts | ✓ | ✓ |
| Add or change the bank account | ✓ | |
| Add or remove admins | ✓ | |
| Business details | ✓ | ✓ (view) |
| Run a trip as driver | if they're marked as a driver | if marked as a driver |

### 1.7 The complete journey at a glance

1. Arrives from the website, a field agent, an agent's invite or a WhatsApp link → **signs in**
   (A-01, A-02) and chooses **I own trucks** (A-03).
2. **Sets up** with a checklist: about you, identity check, bank account, first truck, drivers,
   install (T-ON-01 to T-ON-08).
3. Lands on **Home**, which keeps the setup checklist visible until everything is approved (T-01).
4. **Finds loads** on the load board and opens one (T-02, T-03).
5. **Accepts** at the listed price, or **offers a different price** once (T-03).
6. **Follows the trip**: driver to pickup, loading, advance paid, on the road, delivered, balance
   paid (T-05).
7. **Handles problems**: responds to a shipper's report, reports a breakdown (T-05a, T-05b).
8. **Gets paid** and checks payouts and statements (T-06, T-07).
9. **Grows the fleet** and keeps papers valid: trucks, trackers, drivers, documents, insurance
   (T-08 to T-14, T-18).
10. **Builds a track record**: ratings, tiers, strikes (T-15, T-21).
11. **Manages the account**: notifications, help, business and team, load alerts, settings (N-01,
    T-22, T-23, T-16, T-19, A-10).

---

## Part 2. Getting in

### A-01 and A-02 Sign in and code (shared)

Same screens as for every user (`ux-public-and-auth.md`): **Continue with Google**, or a phone
number and **Send code on WhatsApp**, or email. Then the six-digit code.

**Owner-specific details.**
- Arriving from **Join as a truck owner** on the website, an agent's invite, or a field agent's QR
  code presets the role, so A-03 opens with **I own trucks** already selected.
- The headline line under "Welcome to Freight Africa" changes to "Find loads for your trucks. Get
  paid within minutes of delivery."
- An agent's invite shows a small line at the top: "Chinedu (agent) invited you." The referral is
  kept only if a new business is created.

### A-03 What brings you here? (shared)

The owner taps **I own trucks** ("Find loads and get paid fast"), ticks the required agreements
(Terms and Privacy; trip updates on WhatsApp) and taps **Continue** → T-ON-01.

---

## Part 3. Setting up (onboarding checklist)

### 3.0 How setup behaves

- Setup is a **checklist**, not a locked wizard. The owner can stop at any step and come back; every
  answer is saved as it's given.
- The owner can **look at the load board** as soon as T-ON-02 is done, to see what's available.
- To **accept** a load they need: identity approved, a bank account saved (it becomes usable 24 hours
  after it's added), and at least one truck approved.
- Until all of that is done, Home shows a **Finish setup** card with progress ("3 of 5 done") at the
  top, and the load board shows a banner explaining what's left.
- Desktop shows setup as a single page: the checklist on the left, the current step on the right.

### T-ON-01 What you'll need

**Purpose.** Tell the owner, before they start, what to have at hand, so they don't abandon halfway.

**Phone layout.**
1. Heading "Let's get your trucks working".
2. A checklist with icons and time estimates:
   - Your ID card or driver's licence (2 min)
   - A selfie (1 min)
   - Your bank account number (1 min)
   - Photos of each truck and its papers (about 5 min per truck)
3. One line: "Don't have everything now? Do it in parts. We save as you go."
4. A green badge "Your first 3 trips: no commission" when the launch offer is on.
5. Main button **Start**.

**Desktop layout.** The same content in a centred card, with the checklist on the left and a short
"How you get paid" explanation on the right (advance on loading, balance on delivery).

### T-ON-02 About you and your business

**Purpose.** Capture the few facts that shape what loads the owner will see.

**Phone layout.**
1. Progress "Step 1 of 5".
2. **Your name**, filled in from Google if used.
3. **I run trucks as**: chips **Myself** and **A company**. A company shows **Company name** and
   **Registration number** (optional).
4. **Do you drive your own truck?** chips **Yes** and **No**. Helper: "If yes, you'll also get the
   driver's trip screen."
5. **Where are your trucks based?** city picker.
6. **Which routes do you run?** chips for the four corridors (Lagos ⇄ Kano, Lagos ⇄ Abuja, Lagos ⇄
   Onitsha/Aba, Port Harcourt ⇄ Aba ⇄ Onitsha ⇄ Enugu), several allowed.
7. Main button **Next: check your ID**.

**Interactions.** Choosing **Yes** to driving marks the owner as an owner who drives: the Drive tab
appears, and the install step later becomes required.

### T-ON-03 Identity check

**Purpose.** Prove who the owner is, which protects shippers and is required to receive money.

**Phone layout.**
1. Progress "Step 2 of 5".
2. Heading "Check your identity" and three short lines: "Take a photo of your ID", "Take a selfie",
   "Enter your NIN". "This is how shippers know you're real. It takes about 3 minutes."
3. Main button **Start ID check**.

**What happens.** The Didit verification opens inside the app and uses the camera: a frame guides
the ID photo, then a selfie with a simple liveness check. Before the NIN is sent, the app shows a
field that accepts only 11 digits and then asks "Is this right? 1234 5678 901" with **Yes, check
it** and **Edit**, because every check costs money even when it fails (D006).

**Desktop layout.** On a computer without a good camera, the screen offers **Continue on your
phone**: a QR code and a link sent by WhatsApp that opens the same step on the phone.

**States.**
- Approved: a green check, and the owner's name and date of birth now come from the ID. "Done. Your
  name is now Musa Ibrahim, as on your ID."
- Needs review: "We're checking your details. Usually within 2 hours. You can carry on with the
  next steps."
- Declined: the reason in plain words ("The photo was blurry. Try again in good light") and **Try
  again**. After three tries: "Contact support" with the support conversation link.

### T-ON-04 Bank account

**Purpose.** Set where payouts go, with no chance of a typing mistake sending money to a stranger.

**Phone layout.**
1. Progress "Step 3 of 5".
2. **Bank**: a searchable list of Nigerian banks.
3. **Account number**: 10 digits.
4. As soon as the tenth digit is typed, the account name appears below, looked up automatically:
   "MUSA IBRAHIM TRANSPORT ENT", with a green check if it matches the name on the ID or the company
   name, or an amber note "This name doesn't match your ID. We'll check it before paying you."
5. A note with a lock icon: "For your safety, a new bank account can receive payouts 24 hours after
   it's added. We'll tell you on WhatsApp if it ever changes."
6. Main button **Save bank account**.

**Who sees it.** Owners only. Admins skip this step.

**Why it works.** The name check removes the most expensive mistake in payments, and the 24-hour
wait stops anyone who takes over the account from quietly redirecting money.

### T-ON-05 Add your first truck

**Purpose.** Get one truck approved so the owner can accept loads.

This is the **Add a truck** flow (T-09), opened as step 4. When it ends, two options: **Add another
truck** (runs T-09 again) and **Next: your drivers**.

### T-ON-06 Your drivers

**Purpose.** Say who drives each truck.

**Phone layout.**
1. Progress "Step 5 of 5".
2. "Who drives [plate]?" for each truck added.
3. Options per truck: **I drive it myself** (only for owners who drive), **Add a driver** (opens T-12),
   **Decide later**.
4. Main button **Next**.

### T-ON-07 Install the app

**Purpose.** Put the app on the owner's phone.

The shared install screen (A-08). Required for owners who drive ("Your trips need the app installed so
tracking and alerts work"); for other owners it's recommended and can be skipped with **Not now**.

### T-ON-08 You're set up

**Purpose.** Show what's done and what's still being checked, and send the owner to work.

**Layout.**
1. A checklist with each item marked **Done** (green check) or **Being checked** (amber clock):
   identity, bank account (with "Usable from Tue 9:14 am"), each truck, each driver.
2. One sentence: "You can look at loads now. You can accept loads as soon as your ID, bank account
   and one truck are approved."
3. The launch offer badge if it applies.
4. Main button **See loads** → T-02. Link **Go to Home** → T-01.

Approval messages arrive on WhatsApp ("Your truck LSR 123 XY is approved. You can now accept
loads.") and as notifications.

---

## Part 4. Home

### T-01 Home

**Purpose.** In one glance: what needs the owner, how much money is coming, where the trucks are,
and the best work available right now.

**How they get here.** After sign-in; the Home tab; the logo on desktop.

**Phone layout.**
1. **Top bar**: business logo or initials (opens the account switcher), "Home", notification bell.
2. **Finish setup** card (until setup is complete): progress bar, the next missing item and a
   **Continue** button.
3. **Earnings strip**: two figures side by side, **Paid this month** (₦4,350,000) and **Coming to
   you** (₦1,100,000, the advances and balances of trips in progress). Tapping either opens T-06.
4. **Needs your action**: rows with an icon, one line and one button:
   - "Licence for LSR 123 XY expires in 6 days" → **Update**.
   - "Your offer of ₦1,050,000 was accepted. Assign a driver" → **Assign** (only if the driver wasn't
     chosen).
   - "The sender reported 12 bags short on FA-7K3Q9" → **Respond**.
   - "Payout of ₦550,000 failed" → **See why**.
   - "Rate your trip with Adaeze Foods" → **Rate**.
5. **Live trips**: one card per trip in progress: plate, driver's name, route, status chip ("On the
   road"), tracking chip ("Live" or "No signal 35 min"), and the next payout ("₦550,000 on
   delivery").
6. **Loads for your trucks**: the top five loads from the load board as compact cards (route, pickup
   day, truck type, "You get ₦950,000"), and **See all loads**.
7. **Return loads**: for any truck on the road, up to three loads that start near where it's going,
   labelled "For LSR 123 XY arriving Kano Thu".
8. **Your trucks**: a horizontal row of small cards, each with the plate, an availability chip
   (Available in green, On trip in blue, Unavailable in grey) and a red mark if a paper has expired.
9. **Track record** card: "Established · 12 clean trips · 13 more to Gold" with a progress bar.
10. Bottom tabs.

**First visit with setup done but no trips yet.** The Live trips section is replaced by: "No trips
yet. Accept a load to start earning." and the main button **See loads for your trucks**.

**Desktop layout.**
- Top row: the earnings figures as three cards (Paid this month · Coming to you · Held for problems).
- Main column: Needs your action, then Live trips as a table (Plate · Driver · Route · Status ·
  Tracking · Next payout), then Loads for your trucks as a short table with **Accept** shortcuts
  that open the load.
- Right panel: Return loads, Your trucks as a list, and the Track record card.

**Interactions.**
- Needs your action buttons open the right screen: **Update** → T-14a · **Assign** → T-05 with the
  driver picker open · **Respond** → T-05a · **See why** → T-07 · **Rate** → T-21.
- A live trip card → T-05. A load card → T-03. **See all loads** → T-02. A truck card → T-10.
  Track record → T-15.

**States.** Loading: placeholder blocks. Offline: amber strip "You're offline. Showing your last saved
trips." Account suspended: a red card at the top, "Your account is paused for review because of 3
strikes. Trips in progress continue. We'll contact you within 24 hours," with **Contact support**.

**Why it works.** Money and action items come first because those are what an owner checks every
morning. Loads and return loads are on Home so a truck never sits idle because nobody opened the
load board.

---

## Part 5. Finding work

### T-02 Load board

**Purpose.** See every paid-for load that one of the owner's trucks can carry, and pick the best.

**How they get here.** The Loads tab; **Find loads** on desktop; **See all loads** on Home; a
WhatsApp load alert.

**What the owner sees and doesn't see.** Only loads that are already paid for and that fit at least
one of their trucks: the truck type and goods, the papers being valid, the value limit for their
tier, insured-only rules, and the routes they run (SYSTEM-LOGIC §3.2). They see the pickup and
drop-off **areas**, not exact addresses or phone numbers, and a **value band** ("Under ₦3m"), not
the exact value. Gold owners see each new load 10 minutes before everyone else.

**Phone layout.**
1. Top bar "Loads".
2. **Filter row** that stays at the top while scrolling: corridor chips; a **Truck** chip that opens
   a list of the owner's trucks ("Any of my trucks" by default); **When** chips (Today, Tomorrow,
   This week); **Sort** (Soonest pickup, Nearest to my truck, Highest pay).
3. When new loads arrive while the list is open, a pill "3 new loads" appears at the top; tapping it
   scrolls up and shows them.
4. **Load cards**, one per load:
   - Route on the first line in bold: "Lagos (Apapa) → Kano (Dawanau)".
   - Pickup window: "Tue 12 Nov, morning".
   - Goods with its icon, weight and quantity: "Bags of rice · 30 t · 600 bags".
   - Truck needed: "30 t flatbed".
   - **You get ₦950,000** in large bold type, with "Freight ₦1,000,000" in small text below it. During
     the launch offer: "You get ₦1,000,000 · no commission".
   - Small badges as they apply: **Return load for LSR 123 XY**, **Insured trucks only**, **Gold
     early access**, value band.
   - Shipper line: "Adaeze Foods · ★ 4.8 · 23 trips".
5. Bottom tabs.

**Desktop layout.** The filters across the top; the list on the left (about 45% width) as cards or a
compact table; a map on the right showing each load's pickup area as a pin. Hovering a card
highlights its pin and route; clicking opens the load detail in the right panel without leaving the
board.

**Interactions.**
- A load card → T-03.
- A bell icon on each corridor chip turns WhatsApp and push alerts for that route on or off; the full
  alert settings are in T-19.
- Pull down to refresh on phones.

**States.**
- No fitting loads: "No loads for your trucks right now. We'll message you on WhatsApp when one comes
  in." with **Check alert settings** → T-19.
- Setup not finished: an amber banner "Finish setup to accept loads: bank account and one truck
  left," with **Continue setup**. Cards still open, but the accept button is replaced by the same
  message.
- All trucks on trips: a blue banner "All your trucks are busy. Showing loads for when they're free."

**Why it works.** The amount the owner will actually receive is the biggest thing on each card. The
filter list is short because the board already only shows loads their trucks can do.

### T-03 Load detail

**Purpose.** Give the owner everything they need to say yes with confidence, and make saying yes one
tap.

**Phone layout.**
1. Back arrow and the route as the title.
2. **Map** showing the pickup and drop-off areas and the route, with distance and usual time on the
   road ("about 1,000 km · 2 to 3 days").
3. **The load**: pickup window; number of drop-offs; goods, weight and quantity; the sender's
   handling note ("Stack no more than 5 high"); value band; "Insured trucks only" if set; documents
   the sender has provided (for example "Vet certificate provided").
4. **The sender**: business name or "Private sender", star rating, trips completed, member since.
5. **Money** card:
   - Freight: ₦1,000,000
   - Commission (5%): −₦50,000
   - **You get: ₦950,000**
   - Advance when loaded (40%): ₦400,000
   - Balance on delivery: ₦550,000
6. **Truck**: a picker listing the owner's trucks that fit, each with plate, type and availability.
   Trucks that don't fit are shown greyed with the reason ("Licence expired", "On a trip until
   Thu").
7. **Driver**: a picker of the business's drivers, defaulting to the truck's usual driver. An
   owner who drives can pick **Me**.
8. Main button **Accept for ₦950,000**.
9. Text link below: **Offer a different price**.

**Desktop layout.** Map and load details on the left; the sender card, money card, truck and driver
pickers and the main button in the right panel.

**Interactions.**
- **Accept for ₦950,000** opens a confirm sheet: "You're committing LSR 123 XY and driver Sani to load
  at Apapa on Tue 12 Nov, morning. Cancelling later gives you a strike." Buttons **Accept load** and
  **Go back**. On **Accept load**: a check mark, toast "Load is yours," and the trip screen opens
  (T-05). The driver gets a WhatsApp message and the trip on their screen.
- **Offer a different price** opens the **offer sheet** (T-03a).

**States.**
- Taken while viewing: the main button area turns into a grey box "This load was just taken by
  another owner" with **Back to loads**.
- Offer already sent: a card "Your offer of ₦1,050,000 is waiting · 1 h 42 min left" with **Withdraw
  offer**, replacing the offer link. The owner can still accept at the listed price.
- Not allowed yet (setup or value limit): the main button is replaced by the reason, for example
  "New owners can carry loads worth up to ₦3m. This load is above that."

### T-03a Offer a different price (sheet)

**Purpose.** Let an owner ask for more on a load that's worth more to them, once, without
haggling back and forth.

**Layout.**
1. "Offer a different price for Lagos → Kano".
2. An amount field starting at the listed freight, with the highest allowed shown ("Up to
   ₦1,200,000").
3. A live line: "You'd get ₦997,500 after commission."
4. Two plain sentences: "The sender has 2 hours to accept. Another owner may take the load at the
   listed price before then."
5. Main button **Send offer**.

**What happens next.** The sender gets the offer by WhatsApp and in their app. If they accept and pay
the difference, the owner gets "Your offer was accepted. Load is yours" and the trip opens. If they
decline or time runs out: "Your offer for FA-2M8R1 wasn't accepted. The load is still open at
₦1,000,000."

---

## Part 6. Running trips

### T-04 Trips

**Purpose.** See every trip the business's trucks are doing or have done.

**Phone layout.** Tabs **Active** · **Upcoming** (accepted, not yet started) · **Done** ·
**Cancelled**; a filter row for **Truck** and **Driver**; trip cards with the reference, plate,
driver, route, status chip and payout status ("Advance paid · ₦550,000 on delivery").

**Desktop layout.** Tabs above a table: Reference · Plate · Driver · Route · Status · Tracking ·
Advance · Balance. Columns sort; rows open the trip.

**Empty states.** Active: "No trucks on trips right now." with **Find loads**. Done: "Finished trips
will show here with what you earned."

### T-05 Trip detail (owner view)

**Purpose.** Watch a trip, step in when needed, and see exactly when each payment arrives.

**How they get here.** Home, Trips, notifications, WhatsApp links, search.

**Phone layout.**
1. **Status header**: the status in plain words ("On the road to Kano"), the arrival time, and the
   tracking chip ("Live", or "No signal since 14:10" in amber).
2. **Map** (about 40% of the screen height): route, truck marker, stops, dashed sections where the
   signal dropped. Tapping opens a full-screen map with **Centre on truck** and **Show whole route**.
3. **Payout card** (instead of the shipper's money-held banner):
   - Advance ₦400,000 · **Paid** Tue 9:14 am (green), or "Paid when loaded".
   - Balance ₦550,000 · "Paid when the receiver gives the delivery code".
   - Commission ₦50,000.
   - Held for a problem, if any, in red.
4. **Driver card**: name and photo, the last phone battery level and whether it's charging, the
   tracking state. Buttons **Call driver** and **WhatsApp**. Link **Change driver** (until the goods
   are loaded).
5. **Sender card**: business name, rating. Buttons **Call** and **WhatsApp** (the number of
   the person who booked, shown only while the trip is confirmed and live, D018). After delivery or
   cancellation: "Number hidden after the trip ended."
6. **Timeline**: every step with time, who did it, and photo thumbnails (loading photos, seal number,
   delivery photo).
7. **Stops**: pickup and each drop-off with the contact's first name and status. Owners never see the
   loading or delivery codes; those go only to the sender's side.
8. **Return loads** (while on the road): loads starting near the destination, each with **See load**.
9. **Actions**, shown when they apply: **Report a problem** (T-05b) · **Respond to problem** (T-05a,
   when a dispute is open) · **Cancel trip** (red, before loading) · **Rate the sender** (after
   delivery, T-21) · **Get help** (T-23 with this trip attached).

**Desktop layout.** Left: status, a large map and the timeline. Right sticky panel: payout card,
driver card, sender card, stops, return loads and actions. No chat at launch (D045).

**The screen at each stage.**

| Stage | Status header | What the owner sees change |
| --- | --- | --- |
| Accepted | "Load accepted. Waiting for Sani to confirm." then "Sani confirmed." | Driver card shows **Confirmed** or **Not confirmed yet**; if Sani taps "I can't do this trip", a red line with his reason and **Change driver**; a reminder if he hasn't tapped Go to pickup by the loading window |
| To pickup | "On the way to pickup. About 40 min." | Truck moving on the map |
| At pickup | "At the loading point." | Waiting clock after 4 free hours ("Waiting charge applies from 1:20 pm") |
| Loading | "Loading." | Photos arrive in the timeline |
| Loaded | "Loaded. Advance paid." | Advance row turns green with the time; toast and WhatsApp "₦400,000 sent to your account" |
| On the road | "On the road to Kano." | Live tracking, arrival time, return loads |
| Arrived | "Arrived. Waiting for the receiver." | Waiting clock as at pickup |
| Delivered | "Delivered. Balance paid." | Balance row green; total earned for the trip; Rate the sender appears |
| Delivered with a problem | "Delivered. The receiver reported a problem." | Red line "₦40,000 held while we review" and **Respond** |
| Cancelled | "Cancelled by the sender." | Cancellation fee if one applies ("₦25,000 paid to you for the wasted trip") |

**Interactions.**
- **Change driver** opens a list of available drivers; choosing one asks for confirmation ("Sani will
  be removed from this trip and Bello added"). The old driver loses the trip and the numbers at once;
  the new driver gets the trip and a WhatsApp message.
- **Cancel trip** opens a confirm sheet: "Cancel this trip? You'll get a strike. The sender gets a
  full refund and the load is offered to other trucks." Buttons **Cancel trip** and **Keep the
  trip**.
- **Call** and **WhatsApp** open the phone's dialler or WhatsApp with the number; on desktop the
  number is shown with **Copy**.

**Special states.**
- Tracking lost for 30 minutes: amber banner "We can't see LSR 123 XY's location since 14:10. Please
  call Sani." with **Call driver**. At 60 minutes Freight Africa operations calls the owner.
- SOS from the driver: a red banner at the top of the trip and Home, "Sani pressed SOS at 15:02 near
  Jebba. Freight Africa is responding," with **Call driver** and the operations line.
- Breakdown handed to another truck: blue banner "Another truck took over from Jebba. You'll be paid
  for the distance covered: ₦380,000."

### T-05a Respond to a problem

**Purpose.** Give the owner a fair chance to answer a shipper's claim before money is decided.

**Layout.**
1. The problem in one line ("12 of 600 bags short") with the amount claimed and the amount held.
2. The deadline: "Respond by Fri 5 pm."
3. The sender's evidence: their note and photos.
4. The trip's own evidence, already attached: loading photos, seal number, delivery photo, route
   map.
5. **Your side**: a text field, **Add photos**, and **Pick from loading photos** (to point at the
   photo that shows the full count).
6. Main button **Send response**.
7. After the decision: the outcome, the reviewer's note, and the money effect ("₦40,000 refunded to
   the sender. ₦510,000 balance paid to you. A strike has been added," or "The claim was rejected.
   The ₦40,000 hold has been paid to you.").

Desktop shows the two sides of evidence in two columns.

### T-05b Report a problem (owner)

**Purpose.** Tell Freight Africa about something going wrong on a trip.

**Layout.** Chips: Truck broke down · Accident · Road closed or unsafe · Sender not ready at pickup ·
Goods don't match the booking · Receiver not there · Something else. Each choice asks only what's
needed: a photo, whether a breakdown can be fixed in under 4 hours, a short note or a voice note.
Main button **Send**. For a breakdown that can't be fixed quickly: "Freight Africa is finding another
truck to take over. You'll be paid for the distance already covered."

### T-20 Trip chat (Launch 2, D045; not built at launch)

The same chat screen as the shipper's (text, photos, voice notes, quick replies), with quick replies
suited to owners: "Driver is on the way", "Is the loading ready?", "We're at the gate". Messages from
Freight Africa carry a green label. Open until 48 hours after delivery, or while a problem is open.

---

## Part 7. Getting paid

### T-06 Earnings

**Purpose.** Show every naira earned, coming and held, and where it was sent.

**Phone layout.**
1. Top bar "Earnings".
2. **Totals**: Paid this month · Coming to you · Held for problems. If the business owes Freight
   Africa (for example after an upheld claim when the balance had already been paid), a fourth line
   in amber: "Owed: ₦40,000. We'll take it from your next payout."
3. **Payouts** list: date, trip reference, kind (Advance, Balance, Cancellation fee, Waiting charge,
   Part payment after transfer), amount and status chip (Paid, Sending, Waiting for bank account,
   Being approved, Failed, Held).
4. **Statements**: a month picker, the month's summary (trips, freight, commission, net paid),
   **Download PDF** and **Download spreadsheet**.
5. **Bank account** card (owners only): bank name, account ending 1234, account name, status. Link
   **Change bank account** (T-06a).

**Desktop layout.** Totals as cards across the top; payouts as a table with filters (month, kind,
status, truck); statements and the bank account card in the right panel.

**Interactions.** A payout row → T-07. Download buttons generate the file and the browser saves it.

### T-06a Change bank account

**Purpose.** Change where money goes, safely.

The same form as T-ON-04, with a warning above it: "For your safety, payouts will wait 24 hours
after you change your bank account. We'll send a message to your phone and email now." After saving:
"Your new account can receive payouts from Wed 9:14 am. Payouts due before then will wait."

### T-07 Payout detail

**Purpose.** Explain exactly what happened to one payment.

**Layout.** The amount and kind; the trip with a link; the bank account (last four digits); a
timeline of the payment (Queued · Sending · Paid, with times); the bank reference; and, if it failed,
the reason in plain words and the next step ("Your bank didn't accept the transfer. We'll try again
at 3:15 pm," or "Check your bank account details" with **Change bank account**). Payouts over ₦5m show
"Being approved by our finance team. Usually within 30 minutes."

---

## Part 8. Trucks, drivers and papers

### T-08 Trucks

**Purpose.** See every truck and whether it can work.

**Phone layout.** A list with each truck's photo, plate, type, availability chip, papers status (green
"Papers OK", amber "Expires in 6 days", red "Expired: truck paused"), insured badge, and a small
signal icon if a GPS tracker is connected. **Add a truck** button at the top.

**Desktop layout.** A table with the same columns plus Default driver and Trips this month.

**Interactions.** A truck → T-10. **Add a truck** → T-09.

### T-09 Add a truck

**Purpose.** Register a truck with photos and taps, almost no typing.

**Layout, one step per screen on phones (a single page with sections on desktop).**
1. **Photo of the back of the truck.** The camera opens with a frame: "Fit the number plate in the
   box." The plate is read from the photo and shown in an editable field: "Is this the plate? LSR
   123 XY" with **Yes** and **Edit**.
2. **Truck type.** Picture chips: Flatbed, Covered, Container carrier, Tipper, Livestock, Tanker. Then
   capacity chips for that type (for example 20 t, 30 t, 40 t), with the usual one preselected.
3. **More photos** (optional but recommended): side and front. "Senders trust trucks they can see."
4. **Goods you carry.** Chips already ticked for what this truck type normally carries. The owner
   unticks anything they won't take ("No livestock").
5. **Papers.** One tile per required paper: vehicle licence, road-worthiness certificate, third-party
   insurance. Tapping a tile opens the camera; after the photo the expiry date is read and shown
   ("Expires 14 Mar 2027?") with **Correct** and **Change**. An optional tile: **Goods-in-transit
   insurance**, which earns the Insured badge once checked.
6. **Routes.** The corridors chosen in setup, already ticked; change if this truck runs others.
7. **Check and send.** A summary with **Edit** on each part. Main button **Send for checking**.

**What happens next.** The truck shows as "Being checked". "We usually check trucks within 4 hours. A
Freight Africa field agent may visit to see it." WhatsApp message on approval or if a photo needs
redoing, with the exact reason ("The licence photo is cut off at the bottom").

### T-10 Truck detail

**Purpose.** Keep one truck's details, papers and availability right.

**Phone layout.**
1. Photo carousel and the plate in large type.
2. **Availability**: chips **Available** and **Unavailable**; Unavailable asks "Until when?" with a
   date picker. (While on a trip it shows "On trip FA-7K3Q9" and can't be changed.)
3. Type, capacity and **Default driver** (picker).
4. **Goods it carries** (chips, editable).
5. **Routes** (chips, editable).
6. **Papers**: each with its expiry and status, and **Replace** (T-14a).
7. **Insurance**: Insured until a date, or **Add insurance certificate**.
8. **GPS tracker**: Connected (with the last signal time) or **Connect a GPS tracker** (T-18).
9. **Trips with this truck**: the latest five and **See all**.
10. Red link **Retire this truck** (not available during a trip; asks for confirmation).

**Desktop layout.** Photos and details on the left; papers, insurance, tracker and recent trips on
the right.

### T-18 Connect a GPS tracker

**Purpose.** Let trucks that already carry a tracker share their location automatically, which keeps
tracking working even if the driver's phone is off.

**Layout.** A short explanation; a list of supported tracker types; "How to find your tracker ID"
with pictures; a **Tracker ID** field; the server address and port to set on the tracker, each with
**Copy**; **Test connection**, which waits up to 5 minutes for a signal and then shows it on a small
map ("Signal received from near Ikeja at 10:42"); main button **Save**.

### T-11 Drivers

**Purpose.** See every driver and whether they can drive.

**Layout.** A list with photo, name, status (Invited, Checking ID, Active, Paused: licence expired,
Paused by you), default truck, and "On a trip now" if so. **Add a driver** at the top. Desktop shows
a table with Trips this month and Rating.

### T-12 Add a driver

**Purpose.** Bring a driver onto the platform without doing their paperwork for them.

**Layout.** **Driver's name**, **WhatsApp number**, **Default truck** (optional), and main button
**Send invite**. The driver gets a WhatsApp message with a link; they check their own identity and
licence on their phone (`ux-driver.md`). The owner sees their progress on T-13 and gets a message
when they're ready.

### T-13 Driver detail

**Purpose.** Manage one driver.

**Layout.** Photo (from their ID check), name, phone, identity status, licence photo with expiry and
status, default truck, trips completed, rating from senders, and the current trip if any. Actions:
**Change default truck**, **Pause driver** (they can't be given new trips), **Remove driver** (not
during a trip; confirm), and **Resend invite** while they haven't joined.

### T-14 Documents

**Purpose.** One list of every paper across all trucks and drivers, sorted by what needs attention.

**Layout.** Groups in this order: **Expired** (red), **Expiring within 30 days** (amber), **Needs a
new photo** (with the reviewer's reason), **Being checked**, **All good**. Each row shows the paper,
the truck or driver it belongs to, and the expiry date. Reminders also arrive on WhatsApp 30 days, 7
days and 1 day before expiry.

### T-14a Replace a document

The camera opens with the right frame for that paper; the expiry date is read and confirmed; **Send
for checking**. The old paper stays valid until the new one is approved, unless it has already
expired.

---

## Part 9. Reputation

### T-15 Track record

**Purpose.** Show the owner where they stand and exactly what earns them better terms.

**Phone layout.**
1. **Tier** card: the current tier (New, Established or Gold) with a progress bar to the next and a
   line on what's needed ("13 more clean trips, a rating of 4.3 or more, and no strikes in 90
   days").
2. **What your tier gets you**: a small comparison of the three tiers: advance (30%, 40%, 50%),
   commission (5%, 5%, 4%), highest load value (₦3m, ₦10m, no limit; no limit at any tier with the
   Insured badge), early access to new loads (Gold).
3. **Your numbers**: clean trips, total trips, rating with a breakdown by tag ("On time" 18, "Careful
   with goods" 15, "Late" 2).
4. **Strikes**: each with its reason and the date it expires. "3 strikes in 90 days pauses your
   account for review."
5. **How to keep a strong record**: four short tips (start trips on time, keep the app open on trips,
   take clear loading photos, don't cancel accepted loads).

**Desktop layout.** Tier and benefits on the left; numbers, strikes and tips on the right.

### T-21 Rate the sender

Five stars, then tags matching the rating (Goods ready on time, Easy to reach, Accurate description /
Kept us waiting, Goods not as described, Rude), an optional comment, and **Send rating**. Senders'
ratings appear on the load board, so this helps every owner choose.

---

## Part 10. Notifications

### N-01 Notification centre (shared)

**Layout.** The same list as for all users, grouped Today and Earlier, each item opening its screen.
On desktop, a dropdown under the bell with **See all**.

**What an owner is notified about, and where.**

| Moment | WhatsApp | Email | Push | In the app |
| --- | --- | --- | --- | --- |
| New load that fits your trucks | ✓ | | ✓ | ✓ |
| Your offer accepted or declined | ✓ | | ✓ | ✓ |
| Load assigned to your truck (after accepting) | ✓ | | ✓ | ✓ |
| Advance paid | ✓ | | ✓ | ✓ |
| Balance paid | ✓ | | ✓ | ✓ |
| Tracking lost for 30 minutes | ✓ | | | ✓ |
| Driver pressed SOS | ✓ | | ✓ | ✓ |
| Problem reported on a trip | ✓ | | ✓ | ✓ |
| Problem decided | ✓ | ✓ | | ✓ |
| Sender cancelled | ✓ | | ✓ | ✓ |
| Waiting charge paid | | | | ✓ |
| Paper expiring (30, 7, 1 days) | ✓ | ✓ | | ✓ |
| Truck, driver or ID approved or needs a new photo | ✓ | ✓ | | ✓ |
| Payout failed | ✓ | | | ✓ |
| Bank account changed (security) | ✓ | ✓ | | ✓ |

Push permission is asked at a useful moment, the first time the owner opens the load board: "Get
told the moment a load fits your trucks?" with **Turn on** and **Not now**.

### T-19 Load alerts

**Purpose.** Get the right loads without being flooded.

**Layout.** Per corridor: a switch, and which trucks it applies to. **Quiet hours** (for example 10 pm
to 5 am), when new-load alerts wait until morning (safety and money messages always come through).
**Only loads paying at least** an amount (optional). Main button **Save**.

---

## Part 11. Help and support

### T-22 Help

**Purpose.** Answer common owner questions without waiting.

**Layout.** A search box; topic tiles (Getting set up · Finding and accepting loads · During a trip ·
Getting paid · Papers and trucks · Problems and strikes · Your account); popular questions ("When do I
get my advance?", "Why can't I see a load?", "What gives me a strike?", "How do I get to Gold?"); and
a **Talk to us** card with **Chat with support** (T-23) and the Freight Africa WhatsApp number as
text with **Copy**. Desktop shows topics on the left and the article on the right.

### T-23 Support conversation

The same conversation screen as for shippers. Opened from a trip, it attaches the trip reference
automatically. Replies arrive here and on WhatsApp. "We usually reply within 30 minutes, 7 am to 9
pm."

---

## Part 12. More, business, team and settings

### T-17 More (phone only)

**Layout.** A list with icons: **All trips** (shown for owners who drive, whose Trips tab is replaced by
Drive) · **Trucks** · **Drivers** · **Documents** (with a red dot if something expired) · **Track
record** · **Business and team** · **Load alerts** · **Help** · **Install the app** (if not
installed) · **Settings** · **Switch account** (if they belong to more than one business or role).
At the bottom: app version and **Sign out**. On desktop these live in the sidebar and account menu.

### T-16 Business and team

**Purpose.** Keep the business details and the people who help run it.

**Layout.**
1. **Business**: name, logo, registration number (optional), home city, routes run. Owners edit;
   admins view.
2. **Team** (owners only): admins listed with name, phone and status. **Add a admin** opens a
   sheet with the person's WhatsApp number and **Send invite**. Tapping a admin offers **Remove**.
   Drivers are managed in Drivers (T-11), not here.
3. **Referral**: if an agent brought the business, their name and until when they earn from its trips
   ("Chinedu, until 8 May 2027"). This costs the owner nothing.

### A-08 Install the app (shared)

Offered after setup (required for owners who drive). On Android and desktop Chrome or Edge, an **Install**
button; on iPhone, the Share then Add to Home Screen steps in pictures. Explains: "Quicker access and
instant alerts when a load fits your trucks."

### A-09 Account switcher (shared)

Lists each business and role ("Musa Transport · Truck owner", "Musa Foods · Shipper"). Tapping one
switches the whole app. **Add a business**, **Settings**, **Sign out** at the bottom.

### A-10 Settings (shared, owner view)

| Section | What's there | What can be done |
| --- | --- | --- |
| Profile | Photo, name (from the ID, "Contact support to change"), phone, email | Change photo; change phone or email with a code |
| Notifications | Groups: New loads, Trips, Payments, Papers, Problems, News. Each with WhatsApp, email and push switches | Turn channels on or off. Payments, problems, SOS and security can't be turned off |
| Load alerts | Shortcut to T-19 | |
| Install | Whether the app is installed here | Install steps |
| Security | Devices signed in | **Sign out of this device**, **Sign out everywhere** |
| Privacy | Consents with dates; **Download my data** | Withdraw news; **Delete my account** (explains that trip and payment records are kept as the law requires; not possible with trips in progress or money owed) |
| Help | Help (T-22), support WhatsApp number with **Copy** | |
| About | Version, Terms, Privacy, Transporter agreement | |

English only at launch (D017), so there's no language setting.

---

## Part 13. "I drive my own truck" (Drive tab; folded in from the former ux-owner-driver.md)

An owner who drives their own truck is a truck owner with the **I drive my own truck** switch on
(`is_driver = true`, D043). It is a switch in the owner setup and in Settings, not a separate role or
label: it only adds the raised **Drive** tab. The driving screens (D-01 to D-15) are in `ux-driver.md`;
this part lists how they differ for an owner who drives, and the two screens only they have (OD-01
driving lock, OD-03 trip summary). Screen IDs `OD-` are kept.

A truck owner with one truck who drives it gets the same Home without the fleet parts: a **Your truck**
card instead of the map and list, then the current trip and loads for your truck. The Drive tab stays
raised.

### Part 0. How to read this document

Each screen is described with the same headings: **Purpose**, **How they get here**, **Phone
layout**, **Desktop layout**, **Interactions**, **States**, and **Why it works**. "Sheet" means a
panel sliding up from the bottom on a phone and a centred dialog on desktop. "Toast" means a short
message that disappears after 4 seconds.

---

### Part 1. Who the owner who drives is and how the app is shaped for them

### 1.1 A typical owner who drives

Ibrahim owns one 30-tonne flatbed. He finds loads at the truck park in Kano or through people he
knows, drives Lagos and back several times a month, keeps his own papers, and is paid in cash or by
transfer when the receiver is satisfied, sometimes days later. He has an Android phone with a cracked
screen, mounts it on the dashboard, and uses WhatsApp all day. He has no office and no desktop most
of the time, but his wife or a relative sometimes checks the books on a laptop.

### 1.2 What the owner who drives wants

1. **A load for the truck now, and a load back**, without paying an agent or waiting at the park.
2. **Money he can count on**: the advance before he spends on diesel, the balance the moment he
   delivers.
3. **A trip screen he can use while working**: big buttons, few words, nothing to read while the
   truck is moving.
4. **Help on the road** when something goes wrong: breakdown, robbery, a receiver who isn't there.
5. **Papers that don't trip him up**: reminders before they expire.
6. **A good name** that gets him bigger advances and better loads.

### 1.3 Two jobs, one account, never at the same moment

The owner who drives does an owner's job when the truck is parked (finding loads, checking money, papers)
and a driver's job when it's on a trip. The app keeps these apart:

- The **Drive** tab is the driver's job. It shows **no money**, only the trip, one big button that
  changes at each step, and help.
- Every other tab is the owner's job, with money shown as it is for any owner.
- **Driving lock (OD-01):** while a trip is running and the truck is moving faster than 10 km/h, the
  owner tabs are covered by a calm screen "You're driving. Pull over to use this." The Drive screen
  stays usable. This protects the driver and the goods.

### 1.4 Mobile navigation: five bottom tabs

| Tab | Icon and label | What it represents | Badge |
| --- | --- | --- | --- |
| **Home** | House, "Home" | My truck today, money coming, the next trip, loads that fit, things that need me | Red dot when something needs action |
| **Loads** | Box with an arrow, "Loads" | The load board: paid-for loads my truck can carry | Count of new fitting loads |
| **Drive** | Steering wheel, "Drive", the centre tab and slightly larger | The trip I'm driving now or next: the one-button trip screen | Green dot while a trip is live |
| **Earnings** | Naira note, "Earnings" | Money paid, money coming, statements, bank account | Amber dot if a payout failed |
| **More** | Three lines, "More" | All trips, truck and papers, track record, load alerts, help, settings | Red dot if a paper expired |

While a trip is live, the app opens on **Drive** every time it's launched. Otherwise it opens on
**Home**.

### 1.5 Desktop navigation

Owners who drive use a desktop for the owner's job only; trips are driven on the phone.

**Left sidebar:** logo; **Find loads** button; **Home**, **Loads**, **My trips** (the trips they
drive), **All trips** (shown once they have other drivers), **Earnings**, **Truck** (or **Trucks**
with more than one), **Documents**, **Track record**, **Help**; **Settings** and the person's name
at the bottom.

**Top bar:** page title, search (trip reference, plate, city), notification bell, organisation
switcher.

**My trips on desktop** shows the trip as a read-only page (map, timeline, payouts) with a banner:
"Drive this trip on your phone. The trip buttons and tracking only work there," plus a QR code that
opens the trip on the phone.

### 1.6 The complete journey at a glance

1. **Signs in** and chooses **I own trucks** (A-01 to A-03).
2. **Sets up**: about you (answering **Yes, I drive my own truck**), identity check, bank account,
   truck, driver's licence, install the app, test GPS (T-ON-01 to T-ON-08 with owner who drives steps).
3. **Home** shows the truck's status and the best loads for it (T-01).
4. **Finds a load** and accepts it with **Me** as the driver (T-02, T-03).
5. **Gets ready** the evening before: a reminder, the trip in Drive (D-01, upcoming).
6. **Drives the trip** with one button: to pickup, arrive, load, enter the loading code, advance
   paid, start the trip, rest stops, arrive, enter the delivery code, balance paid (D-01 to D-03,
   D-09, OD-03).
7. **Handles problems** on the road: report a problem, breakdown, SOS (D-04, D-05).
8. **Takes a return load** while stopped near the destination (D-06).
9. **Checks money**, rates the sender, sees history (T-06, T-21, D-07).
10. **Keeps the truck and papers valid** and builds a track record (T-08 to T-15).
11. **Grows**: adds a second truck and a driver, or stops driving (Part 9).

---

### Part 2. Getting in

### A-01, A-02, A-03 Sign in, code, role (shared)

Exactly as for every owner (`ux-owner.md` Part 2): **Continue with Google** or a phone number with a
code on WhatsApp, then **I own trucks**. Because many owners who drive don't use email, the phone and
WhatsApp option is placed first on this path when they arrive from **Join as a truck owner**, from a
field agent's QR code, or from an agent's invite.

---

### Part 3. Setting up

Setup is the owner's checklist (`ux-owner.md` T-ON-01 to T-ON-08), with three differences for
owners who drive: they say they drive, they add their own driver's licence, and installing the app and
testing GPS become required steps. The checklist can be left and resumed at any point.

### T-ON-01 What you'll need (owner who drives version)

The list adds one line: "Your driver's licence (1 min)". The time estimate at the bottom reads "About
12 minutes for you and one truck." Main button **Start**.

### T-ON-02 About you and your business

As for owners, with the question **Do you drive your own truck?** answered **Yes**. Choosing Yes:
- Adds the Drive tab to the app.
- Adds the driver's licence step and makes installing the app required.
- Shows a one-line note: "You'll get a simple trip screen for driving, separate from your money and
  business screens."

### T-ON-03 Identity check

One identity check covers both jobs: ID photo, selfie, NIN (D006). There is no second check as a
driver. On approval, the name on the ID becomes the owner's and the driver's name.

### T-ON-04 Bank account

As for owners: bank, 10-digit account number, the name looked up and matched to the ID, and the
24-hour wait before payouts can use a new account.

### T-ON-05 Add your truck

The **Add a truck** flow (`ux-owner.md` T-09): photo of the back with the plate read automatically,
truck type and capacity by picture, more photos, goods carried, papers with expiry dates read from
the photos, routes. At the end, the truck's default driver is set to **Me** automatically.

### T-ON-06 Your driver's licence (D-ON-03, owner who drives version)

**Purpose.** Record the licence so the owner who drives can be assigned to trips.

**Phone layout.**
1. "Your driver's licence".
2. Camera tile with a card-shaped frame: "Take a photo of the front of your licence."
3. After the photo: **Licence number** and **Expiry date**, read from the photo, each with a check
   and an **Edit** link.
4. Main button **Save licence**.

**States.** Unreadable photo: "We couldn't read the licence. Try again in good light, flat on a
table." Expired licence: "This licence expired on 3 Jan 2026. You can finish setup, but you can't
drive trips until a valid licence is approved."

### T-ON-07 Install the app and prepare for trips (required)

**Purpose.** Make sure the phone can run trips: installed, location allowed, screen kept on.

**Phone layout, three short screens.**
1. **Install**: the install steps for the phone (on Android a single **Install Freight Africa**
   button; on iPhone, Share then Add to Home Screen, in pictures). "Trips need the app installed so
   tracking and alerts work."
2. **How trips work on your phone**: three pictures with one line each: phone in a dashboard holder;
   charger plugged in; screen stays on. "Location is used only during trips."
3. **Test your GPS** (D-08's test): the app asks for location permission with a pre-screen that
   explains why, then shows "GPS working · accurate to 12 m" with a small map, or a fix-it message
   ("Turn on Location in your phone settings, then tap Try again").

Main button **I'm ready**. Setup can't be marked complete until the app is installed and the GPS test
has passed once, unless Freight Africa support waives it.

### T-ON-08 You're set up

The owner's checklist screen with two extra rows: **Driver's licence** and **App installed and GPS
tested**. Main button **See loads for your truck**.

---

### Part 4. Home

### T-01 Home (owner who drives version)

**Purpose.** At a glance when parked: is my truck busy or free, what's my next trip, how much money is
coming, and what loads fit right now.

**Phone layout.**
1. **Top bar**: initials or logo, "Home", notification bell.
2. **Finish setup** card while anything is still missing or being checked.
3. **My truck** card, large: plate, truck photo, and its state in words:
   - "Free in Kano. Ready for a load." (green), with a **Find a load** button.
   - "Next trip: Tue 12 Nov, morning, Kano → Lagos." (blue), with **Get ready** (opens Drive).
   - "On a trip to Lagos. Arrives Thu about 2:30 pm." (blue), with **Open trip** (opens Drive).
   - "Not available until Mon 18 Nov." (grey), with **Change** (opens truck availability).
4. **Earnings strip**: **Paid this month** and **Coming to you**.
5. **Needs your action**: papers expiring, an offer answered, a problem to respond to, a payout that
   failed, a sender to rate. One button per row.
6. **Loads for your truck**: up to five cards (route, pickup day, "You get ₦950,000"), and **See all
   loads**. If the truck is on a trip, this section becomes **Return loads near Lagos**.
7. **Track record** card with the tier and progress.
8. Bottom tabs.

**Desktop layout.** My truck card and earnings across the top; Needs your action and loads in the
main column; track record and recent trips in the right panel.

**Interactions.** As for owners (`ux-owner.md` T-01), plus the My truck card buttons above.

**Why it works.** An owner who drives has one question when the truck is parked: "Where is my next load?"
The truck's state and the matching loads are the first two things on the screen.

---

### Part 5. Finding and accepting a load

### T-02 Load board

The owner's load board (`ux-owner.md` T-02). For an owner who drives with one truck:
- The **Truck** filter is hidden; every load shown fits their truck.
- The default sort is **Nearest to my truck**, because the truck's location is usually where the
  owner who drives is.
- Loads that start after the current trip's arrival are labelled **After your trip**, and return
  loads near the trip's destination are labelled **Return load**.

### T-03 Load detail and accepting

The owner's load detail (`ux-owner.md` T-03), with:
- **Truck** preselected (their only truck) and **Driver** preselected as **Me**.
- The licence and truck papers checked against the trip dates. If the licence expires before the
  trip ends, the main button is replaced by "Your licence expires on 10 Nov. Update it to accept
  this load," with **Update licence**.
- The confirm sheet says: "You're committing to drive LSR 123 XY to load at Dawanau Market on Tue 12
  Nov, morning. Cancelling later gives you a strike." **Accept load** / **Go back**.
- After accepting: toast "Load is yours. It's in your Drive tab," and the app opens **Drive** on the
  upcoming trip.

**Offer a different price** works exactly as for owners (one offer, up to 20% more, 2 hours for the
sender to decide).

---

### Part 6. Driving the trip

Everything in this part happens in the **Drive** tab on the phone. The driving screens are specified
in full in `ux-driver.md` (D-01 to D-15) and look and behave the same for an owner who drives: the same
design rules (large type, one main button, no money, works offline), the same trip screen and steps,
loading photos (D-02), codes (D-03), rest stops (D-09), problems (D-04), chat (D-14) and trip details
(D-15). Only the differences are listed here.

### Differences from an employed driver

| Screen | Employed driver | Owner who drives |
| --- | --- | --- |
| D-01 new trip | Confirms with **I'll do this trip** or **I can't do this trip** | No confirmation step: they accepted the load themselves, so it goes straight to the upcoming trip |
| D-01 upcoming trip | Owner is told if **Go to pickup** isn't pressed in time | Only a reminder to themselves |
| D-01 waiting line | "Your owner is being paid for the wait" | "You're being paid for the wait" (still no amount on the Drive tab) |
| D-04 report a problem | Freight Africa and the owner are told | Freight Africa is told; there's no one else to tell |
| D-05 SOS | Alerts operations, the owner and the emergency contact | Alerts operations and the emergency contact; operations is the first responder |
| D-06 next load | **Tell my owner I can take this** | Tapping a load opens the owner's load detail (T-03) to accept it, **only while stopped**; while moving the button reads "Pull over to accept" |
| D-10 trip complete | "Delivered. Your owner has been told." No money | Replaced by OD-03, which shows what was earned |
| D-11 trip changed | Owner reassigned or sender cancelled | Only the sender cancelling applies |
| Other tabs while driving | No owner tabs exist | Covered by the driving lock (OD-01) |
| Advance paid | Not shown | A small banner "Advance sent" on the trip screen after loading, with no amount; the amount appears in Earnings and OD-03 |

### OD-01 Driving lock

**Purpose.** Keep the owner who drives's eyes on the road.

**When it appears.** A trip is running (to pickup or on the road) and the phone has been moving
faster than 10 km/h for at least 30 seconds, and the owner who drives opens any tab other than Drive.

**Layout.** A full-screen cover on that tab: a simple illustration, "You're driving. Pull over to use
this." and **Back to trip**. A small text link, **I'm a passenger** (for when someone else in the cab
is using the phone), dismisses the cover for 30 minutes; each use is recorded.

**Exceptions.** SOS and the Drive tab are never covered. Incoming notifications that aren't about
safety wait until the truck stops.

### OD-03 Trip summary

**Purpose.** Close the trip with what was earned and what comes next. This is the only driving-flow
screen that shows money, because the truck has stopped.

**How they get here.** **Done** after the last delivery code.

**Layout.**
1. A large check and "Trip FA-7K3Q9 complete."
2. **What you earned**: Freight ₦1,000,000 · Commission −₦50,000 · Advance ₦400,000 (paid Tue 9:14 am)
   · Balance ₦550,000 (sending now, then "Paid 10:22 am" when it lands) · **Total ₦950,000**.
3. If a problem was recorded: "₦40,000 is held while Freight Africa reviews the problem," with
   **See details**.
4. **Rate the sender** (stars right here, tags after choosing).
5. **Next**: a return load if one was accepted ("Your next trip: Thu, Lagos → Kano") with **Get
   ready**, or **Find a load near Lagos**.

---

### Part 7. After the trip

### T-06 and T-07 Earnings and payout detail

The owner's earnings screens (`ux-owner.md` T-06, T-07): money paid this month, coming, held and owed;
every payout with its status; monthly statements to download; the bank account. For a single truck,
the payout list groups advance and balance under each trip, so Ibrahim sees "Kano → Lagos, 12 Nov:
₦950,000" with the two payments inside.

### D-07 Trip history

**Purpose.** See past trips at a glance.

**Layout.** Under More → All trips (and the **My trips** sidebar item on desktop): past trips with
date, route, status and the rating received. Tapping one opens a read-only trip page with the map,
timeline, loading and delivery photos, and (because they're the owner) what was earned.

### T-21 Rate the sender

Offered on OD-03 and as a notification afterwards; stars, tags, optional comment. Open for 7 days.

---

### Part 8. Truck, papers and track record

### T-08 and T-10 Truck

With one truck, **More → Truck** opens the truck's page directly (`ux-owner.md` T-10): photos, plate,
availability (**Available** or **Unavailable until** a date), goods carried, routes, papers with
expiry dates and **Replace**, the Insured badge or **Add insurance certificate**, the GPS tracker
connection, and recent trips. With two or more trucks it becomes the Trucks list (T-08).

**Availability matters more for owners who drive.** When Ibrahim is resting at home for a week, setting
**Unavailable until Mon 18 Nov** stops load alerts and keeps his record clean (no missed-load
penalties exist, but it saves noise).

### T-14 Documents

All papers in one list, sorted by urgency, now including **your driver's licence** with the truck's
papers. WhatsApp reminders 30, 7 and 1 days before any expiry. An expired licence pauses driving
(existing trips can be finished only if staff allow; new loads can't be accepted with **Me** as the
driver).

### T-18 Connect a GPS tracker

As for owners. Particularly useful for owners who drive because the truck keeps reporting its location
even when the phone is off or the app was closed, which avoids tracking strikes.

### T-15 Track record

As for owners: tier, progress, what each tier gets (advance 30%, 40%, 50%; commission 5%, 5%, 4%;
value limits; early access for Gold), rating by tag, strikes with expiry dates. For owners who drive,
the tips focus on driving: keep the app open with the charger in, start trips on time, take clear
loading photos, stop at approved parks.

---

### Part 9. Growing beyond one truck, or stopping driving

### Adding a second truck or a driver

- **Add a truck** works as for owners. The new truck's default driver is empty until set.
- **Add a driver** (T-12) invites someone by WhatsApp; they verify themselves.
- Once the business has a driver other than the owner, **More → All trips** and the desktop **All
  trips** item show every trip, while **Drive** keeps showing only the trips the owner drives.
- When accepting a load, the **Driver** picker now lists **Me** and the other drivers.

### Stopping driving

Settings → **I drive my own truck** switch. Turning it off asks for confirmation ("You'll no longer
see the Drive tab. Your truck needs another driver before it can take loads."), removes the Drive
tab, and turns the tab back into **Trips**. It can't be turned off during a trip they're driving.

---

### Part 10. Notifications

### N-01 Notification centre (shared)

The same list as for everyone, grouped Today and Earlier, each item opening its screen.

### What an owner who drives is told, and when

| Moment | WhatsApp | Push | In the app | Delivered while driving? |
| --- | --- | --- | --- | --- |
| New load fits your truck | ✓ | ✓ | ✓ | No, waits until stopped |
| Return load near your destination | ✓ | ✓ | ✓ | No |
| Offer accepted or declined | ✓ | ✓ | ✓ | No |
| Trip reminder (evening before, 1 hour before) | ✓ | ✓ | ✓ | Yes |
| Tap to resume your trip (tracking paused 15 min) | ✓ | ✓ | | Yes |
| A contact asked you to call | ✓ | ✓ | ✓ (banner on the trip screen) | Yes |
| Advance paid | ✓ | ✓ | ✓ | No (shown on the trip screen as "Advance sent" without the amount) |
| Balance paid | ✓ | ✓ | ✓ | Yes (the trip has ended) |
| Problem reported, problem decided | ✓ | ✓ | ✓ | No |
| Sender cancelled | ✓ | ✓ | ✓ | Yes, with "Stop the trip. You don't need to go to pickup." |
| Paper or licence expiring | ✓ | | ✓ | No |
| Truck, licence or ID approved or needs a new photo | ✓ | | ✓ | No |
| Payout failed | ✓ | | ✓ | No |
| Bank account changed (security) | ✓ | | ✓ | Yes |

"Waits until stopped" means the push is held until the phone has been still for 2 minutes. WhatsApp
messages are sent immediately; the app cannot hold those, so their wording is short and safe to read
later.

---

### Part 11. Help and support

### T-22 Help

As for owners, with an extra topic tile **On the road** (breakdowns, checkpoints, rest stops, SOS,
what to do if the receiver isn't there) and popular questions for owners who drive ("What if my phone
dies on the trip?", "When do I get my advance?", "Can I take a return load while driving?").

### T-23 Support conversation

As for owners. From the trip screen, **Chat** includes Freight Africa in the same conversation, so
the owner who drives doesn't need a separate support thread during a trip. Voice notes are encouraged:
"Send a voice note if typing is hard."

---

### Part 12. More and settings

### T-17 More (owner who drives version)

**All trips** · **Truck** (or **Trucks**) · **Documents** · **Track record** · **Load alerts** ·
**Business** · **Help** · **Install the app** (if not installed) · **Settings** · **Switch account**
(if they have another business or role). App version and **Sign out** at the bottom.

### T-19 Load alerts

As for owners: routes, quiet hours, minimum pay. For owners who drive, a toggle is on by default:
**Pause alerts while I'm driving**.

### A-10 Settings (owner who drives version)

| Section | What's there | What can be done |
| --- | --- | --- |
| Profile | Photo, name (from the ID), phone, email | Change photo; change phone or email with a code |
| Driving | **I drive my own truck** switch; driver's licence with expiry; **Emergency contact** (name and WhatsApp number, told if you press SOS); **Night look** (automatic, always on, always off) | Change these; replace licence |
| Notifications | As for owners, plus **Pause alerts while I'm driving** | Turn channels on or off (payments, safety and security stay on) |
| Phone check | Install status, **Test my GPS**, location permission status | Install steps; open the phone's settings help |
| Security | Devices signed in | Sign out of a device or everywhere |
| Privacy | Consents, **Download my data**, **Delete my account** | As for owners |
| Help and About | Help, support WhatsApp number with **Copy**, version, Terms, Privacy, Transporter agreement | |

English only at launch (D017).

---

### Part 13. Behaviour that applies everywhere

- **Two jobs kept apart.** No money on the Drive tab except the final trip summary; owner tabs
  covered while driving (OD-01).
- **Offline first on the road.** Every driving action (arrival, photos, codes, problems) works
  without signal and is sent later, in order, with the time it really happened.
- **Live updates.** Loads, trips and payouts update by themselves.
- **Deep links.** WhatsApp messages open the exact screen; while a trip is live, any link opens the
  Drive tab first, with the linked screen one tap away.
- **Battery and data.** One location point a minute while moving, fewer while stopped, sent in small
  batches. Photos shrink before upload.
- **Safety.** SOS on every driving screen; rest stops on risky stretches; no task that needs reading
  while the truck moves.
- **Accessibility.** Large text and buttons on driving screens, labels on every icon, status always in
  words as well as colour, voice notes wherever typing would be needed.
- **Plain words.** Load, trip, pickup, drop-off, code, advance, balance, papers, return load.

## Part 14. Behaviour that applies everywhere

- **Live updates.** The load board, trips, payouts and chat update by themselves.
- **Deep links.** Every WhatsApp message and email opens the exact screen; signing in returns there.
- **Offline.** Home, trips and the last load board stay readable offline. Accepting a load, changing
  drivers and saving papers need a connection; buttons say "You're offline" instead of failing.
- **Errors.** Every error says what happened and what to do next, in plain words.
- **Confirmations.** Accepting a load, cancelling, changing a driver mid-trip, changing the bank
  account and retiring a truck each ask once, in a sheet that states the consequence.
- **Money words.** "You get" always means after commission. Amounts are shown in full with the naira
  sign ("₦950,000"), never abbreviated on money screens.
- **Accessibility.** Text can grow to twice its size; every control has a label; status always has a
  word, not only a colour; everything works by keyboard on desktop.
- **Cheap phones and weak networks.** Placeholders show structure at once; maps load only when
  visible; photos shrink on the phone before upload and wait offline until sent.
- **Plain words.** Load, trip, advance, balance, papers, return load, waiting charge. No trade jargon.
