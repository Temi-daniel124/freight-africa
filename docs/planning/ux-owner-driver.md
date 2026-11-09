# ux-owner-driver.md, Freight Africa

**Annex to `docs/PLATFORM-SCOPE.md` (authority 6 of 14).** Visual rules come from `DESIGN_SYSTEM.md`. Follows `ux-conventions.md`, and defers to `DECISIONS.md`, `DATA-MODEL.md`,
`SYSTEM-LOGIC.md` and `PLATFORM-SCOPE.md`. This is the screen-by-screen wireframe description and
user journey for the **owner-driver**: a person who owns a truck (usually one, sometimes two or three)
and drives it themselves. In the data they are a transporter owner with `is_driver = true` (D003).
The document covers phones and desktops and contains no drawings.

**Where the detail lives.**
- The **driving screens** (D-01 to D-15) are specified in full in `ux-driver.md`. Part 6 here lists
  how they differ for an owner-driver and specifies the two screens only owner-drivers have (OD-01
  driving lock, OD-03 trip summary).
- The **owner management screens** (load board, earnings, trucks, papers, track record) are fully
  specified in `ux-owner.md`. This document describes how they look and behave for an owner-driver
  and only repeats detail where the owner-driver's experience differs.

Screen IDs must not be renumbered. New screens unique to owner-drivers use `OD-`.

---

## Part 0. How to read this document

Each screen is described with the same headings: **Purpose**, **How they get here**, **Phone
layout**, **Desktop layout**, **Interactions**, **States**, and **Why it works**. "Sheet" means a
panel sliding up from the bottom on a phone and a centred dialog on desktop. "Toast" means a short
message that disappears after 4 seconds.

---

## Part 1. Who the owner-driver is and how the app is shaped for them

### 1.1 A typical owner-driver

Ibrahim owns one 30-tonne flatbed. He finds loads at the truck park in Kano or through people he
knows, drives Lagos and back several times a month, keeps his own papers, and is paid in cash or by
transfer when the receiver is satisfied, sometimes days later. He has an Android phone with a cracked
screen, mounts it on the dashboard, and uses WhatsApp all day. He has no office and no desktop most
of the time, but his wife or a relative sometimes checks the books on a laptop.

### 1.2 What the owner-driver wants

1. **A load for the truck now, and a load back**, without paying an agent or waiting at the park.
2. **Money he can count on**: the advance before he spends on diesel, the balance the moment he
   delivers.
3. **A trip screen he can use while working**: big buttons, few words, nothing to read while the
   truck is moving.
4. **Help on the road** when something goes wrong: breakdown, robbery, a receiver who isn't there.
5. **Papers that don't trip him up**: reminders before they expire.
6. **A good name** that gets him bigger advances and better loads.

### 1.3 Two jobs, one account, never at the same moment

The owner-driver does an owner's job when the truck is parked (finding loads, checking money, papers)
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

Owner-drivers use a desktop for the owner's job only; trips are driven on the phone.

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
   truck, driver's licence, install the app, test GPS (T-ON-01 to T-ON-08 with owner-driver steps).
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

## Part 2. Getting in

### A-01, A-02, A-03 Sign in, code, role (shared)

Exactly as for every owner (`ux-owner.md` Part 2): **Continue with Google** or a phone number with a
code on WhatsApp, then **I own trucks**. Because many owner-drivers don't use email, the phone and
WhatsApp option is placed first on this path when they arrive from **Join as a truck owner**, from a
field agent's QR code, or from an agent's invite.

---

## Part 3. Setting up

Setup is the owner's checklist (`ux-owner.md` T-ON-01 to T-ON-08), with three differences for
owner-drivers: they say they drive, they add their own driver's licence, and installing the app and
testing GPS become required steps. The checklist can be left and resumed at any point.

### T-ON-01 What you'll need (owner-driver version)

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

### T-ON-06 Your driver's licence (D-ON-03, owner-driver version)

**Purpose.** Record the licence so the owner-driver can be assigned to trips.

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

## Part 4. Home

### T-01 Home (owner-driver version)

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

**Why it works.** An owner-driver has one question when the truck is parked: "Where is my next load?"
The truck's state and the matching loads are the first two things on the screen.

---

## Part 5. Finding and accepting a load

### T-02 Load board

The owner's load board (`ux-owner.md` T-02). For an owner-driver with one truck:
- The **Truck** filter is hidden; every load shown fits their truck.
- The default sort is **Nearest to my truck**, because the truck's location is usually where the
  owner-driver is.
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

## Part 6. Driving the trip

Everything in this part happens in the **Drive** tab on the phone. The driving screens are specified
in full in `ux-driver.md` (D-01 to D-15) and look and behave the same for an owner-driver: the same
design rules (large type, one main button, no money, works offline), the same trip screen and steps,
loading photos (D-02), codes (D-03), rest stops (D-09), problems (D-04), chat (D-14) and trip details
(D-15). Only the differences are listed here.

### Differences from an employed driver

| Screen | Employed driver | Owner-driver |
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

**Purpose.** Keep the owner-driver's eyes on the road.

**When it appears.** A trip is running (to pickup or on the road) and the phone has been moving
faster than 10 km/h for at least 30 seconds, and the owner-driver opens any tab other than Drive.

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

## Part 7. After the trip

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

## Part 8. Truck, papers and track record

### T-08 and T-10 Truck

With one truck, **More → Truck** opens the truck's page directly (`ux-owner.md` T-10): photos, plate,
availability (**Available** or **Unavailable until** a date), goods carried, routes, papers with
expiry dates and **Replace**, the Insured badge or **Add insurance certificate**, the GPS tracker
connection, and recent trips. With two or more trucks it becomes the Trucks list (T-08).

**Availability matters more for owner-drivers.** When Ibrahim is resting at home for a week, setting
**Unavailable until Mon 18 Nov** stops load alerts and keeps his record clean (no missed-load
penalties exist, but it saves noise).

### T-14 Documents

All papers in one list, sorted by urgency, now including **your driver's licence** with the truck's
papers. WhatsApp reminders 30, 7 and 1 days before any expiry. An expired licence pauses driving
(existing trips can be finished only if staff allow; new loads can't be accepted with **Me** as the
driver).

### T-18 Connect a GPS tracker

As for owners. Particularly useful for owner-drivers because the truck keeps reporting its location
even when the phone is off or the app was closed, which avoids tracking strikes.

### T-15 Track record

As for owners: tier, progress, what each tier gets (advance 30%, 40%, 50%; commission 5%, 5%, 4%;
value limits; early access for Gold), rating by tag, strikes with expiry dates. For owner-drivers,
the tips focus on driving: keep the app open with the charger in, start trips on time, take clear
loading photos, stop at approved parks.

---

## Part 9. Growing beyond one truck, or stopping driving

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

## Part 10. Notifications

### N-01 Notification centre (shared)

The same list as for everyone, grouped Today and Earlier, each item opening its screen.

### What an owner-driver is told, and when

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

## Part 11. Help and support

### T-22 Help

As for owners, with an extra topic tile **On the road** (breakdowns, checkpoints, rest stops, SOS,
what to do if the receiver isn't there) and popular questions for owner-drivers ("What if my phone
dies on the trip?", "When do I get my advance?", "Can I take a return load while driving?").

### T-23 Support conversation

As for owners. From the trip screen, **Chat** includes Freight Africa in the same conversation, so
the owner-driver doesn't need a separate support thread during a trip. Voice notes are encouraged:
"Send a voice note if typing is hard."

---

## Part 12. More and settings

### T-17 More (owner-driver version)

**All trips** · **Truck** (or **Trucks**) · **Documents** · **Track record** · **Load alerts** ·
**Business** · **Help** · **Install the app** (if not installed) · **Settings** · **Switch account**
(if they have another business or role). App version and **Sign out** at the bottom.

### T-19 Load alerts

As for owners: routes, quiet hours, minimum pay. For owner-drivers, a toggle is on by default:
**Pause alerts while I'm driving**.

### A-10 Settings (owner-driver version)

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

## Part 13. Behaviour that applies everywhere

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
