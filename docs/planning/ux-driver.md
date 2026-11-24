# ux-driver.md, Freight Africa

**Annex to `docs/PLATFORM-SCOPE.md` (authority 6 of 14).** Visual rules come from `DESIGN_SYSTEM.md`. Follows `ux-conventions.md`, and defers to `DECISIONS.md`, `DATA-MODEL.md`,
`SYSTEM-LOGIC.md` and `PLATFORM-SCOPE.md`. This is the screen-by-screen wireframe description and
user journey for the **driver**: a person employed by a truck owner to drive their truck. In the data
a driver is a member of a transporter organisation with `transporter_role = driver` and
`is_driver = true` (D003). It covers phones and desktops and contains no drawings.

**This file is the home of every driving screen** (D-01 to D-15). The owner who drives uses the same
screens with a few additions, listed in `ux-owner.md` Part 13. If the two ever differ on a
driving screen, this file wins.

Screen IDs must not be renumbered.

---

## Part 0. How to read this document

Each screen is described with the same headings: **Purpose**, **How they get here**, **Phone
layout**, **Desktop layout** (where it applies), **Interactions**, **States**, and **Why it works**.
"Sheet" means a panel that slides up from the bottom. "Toast" means a short message that disappears
after 4 seconds.

---


## D045 update (24 Nov 2026): the Trip tab

The founder mockup "camera only, one big button per step", in the new look. With a trip: the map card,
the next step as one big button, the goods (never money, D003), and **Call** for the pickup or receiver
contact during the live trip (D018). With no trip: the illustration empty state. At loading the driver
confirms or corrects the weight or amount (a weighbridge ticket photo is optional, D046). Drivers
invited by phone sign in with phone number and PIN (D044).

## Part 1. Who the driver is and how the app is shaped for them

### 1.1 A typical driver

Sani drives a 30-tonne flatbed for Musa Transport. He's on the road three or four weeks a month,
mostly Kano to Lagos and back. He has an Android phone with limited data, mounts it on the
dashboard, and uses WhatsApp for everything. He reads English but prefers short messages and voice
notes. He's often asked to prove what he loaded, and worries about being blamed for shortages. He
never handles the freight money; his owner pays him.

### 1.2 What the driver wants

1. **Know exactly where to go and when**, without phoning the owner, the sender and the receiver.
2. **Do each step without confusion**: one clear thing to press, in big type.
3. **Not be blamed** for problems that weren't his fault: proof of what was loaded and delivered.
4. **Help on the road** when the truck breaks down, the road is closed or he's in danger.
5. **Not be distracted while driving.**
6. **A good record** with his owner, so he keeps getting trips.

### 1.3 What the driver never sees

No freight prices, payouts, commission, bank details or the shipper's declared value (D003). No
loading or delivery codes: those are given to him in person by the people at each end. Phone numbers
only while a trip is live, and only for the people he needs at that moment (D018).

### 1.4 Mobile navigation: four bottom tabs

| Tab | Icon and label | What it represents | Badge |
| --- | --- | --- | --- |
| **Trip** | Steering wheel, "Trip" | The trip I'm driving now, or my next one. Almost all of the driver's time is spent here | Green dot while a trip is live; red dot for a new trip to confirm |
| **Next load** | Box with an arrow, "Next load" | Trips the owner has given me after this one, and return loads near where I'm going | Count of new items |
| **History** | Clock, "History" | Trips I've finished, with their photos and ratings | None |
| **Me** | Person, "Me" | My profile, licence, phone check, emergency contact, notifications, help, sign out | Red dot if the licence is expiring |

The app always opens on **Trip**. Tabs are larger than in the other apps (labels at 13 px, icons at
28 px) and the bar is taller (72 px) for use in a moving cab and with gloves.

While a trip is live and the truck is moving, the **Next load**, **History** and **Me** tabs show
their content but disable anything that needs typing, with a line "Pull over to do this." The Trip tab
and SOS always work.

### 1.5 Desktop

Drivers rarely use a desktop, and trips can only be driven on a phone (tracking, camera, codes). On a
desktop or laptop:

- A **left sidebar** with **Trip**, **Next load**, **History**, **Me** and **Help**.
- **Trip** shows the current or next trip as a read-only page (stops, load, timeline, map) with a
  banner: "Drive this trip on your phone. The trip buttons and tracking only work there," and a QR code
  that opens the trip on the phone.
- **History** and **Me** work fully.

### 1.6 The complete journey at a glance

1. The owner adds the driver; the driver gets a **WhatsApp invite** (A-07).
2. **Signs in** with his phone number and a WhatsApp code (A-01, A-02).
3. **Sets up**: welcome, identity check, driver's licence, install the app and test GPS, then waits for
   approval (D-ON-01 to D-ON-05).
4. Gets a **new trip** from the owner and confirms it (D-01, new trip).
5. **Gets ready** the evening before (D-01, upcoming trip; D-15 trip details).
6. **Drives the trip** with one button: to pickup, arrive, load and photograph, enter the loading code,
   start the trip, rest stops, arrive, delivery photo, enter the delivery code (D-01, D-02, D-03,
   D-09).
7. **Handles problems**: report a problem, breakdown, SOS and calls (D-04, D-05, D-14).
8. **Finishes** the trip and sees what's next (D-10, D-06).
9. **Looks back** at past trips and keeps his details right (D-07, D-08).
10. Gets **help** when needed (D-12, D-13) and **notifications** throughout (N-01).

---

## Part 2. Getting in

Drivers can't sign up on their own. On the sign-up screen (A-03) a line says: "Are you a driver?
Ask the truck owner to add you. You'll get an invite on WhatsApp." This keeps every driver tied to an
owner who is responsible for them.

### A-07 The invite (shared)

**Purpose.** Bring the driver in from the owner's invite.

**How they get here.** A WhatsApp message from Freight Africa: "Hello Sani. Musa Transport added you
as a driver on Freight Africa. Tap to join: [link]."

**Phone layout.** Freight Africa logo; "Musa Transport added you as a driver"; the owner's name and
business; the truck plate if the owner chose one ("You'll drive LSR 123 XY"); main button **Join
Musa Transport**.

**States.** Expired or already used: "This invite has expired. Ask Musa Transport to send a new
one." The link is valid for 7 days.

### A-01 and A-02 Sign in and code (shared)

Opened from the invite with the phone number already filled in (the one the owner used). **Send
code on WhatsApp**, then the six-digit code, which fills itself in on phones that allow it. Google and
email sign-in are offered as smaller links. After the code: → D-ON-01.

---

## Part 3. Setting up

A short sequence, one screen at a time, with a progress line ("Step 2 of 4"). Each step saves as it
goes, so the driver can stop and return through the same invite link or by opening the app.

### D-ON-01 Welcome

**Purpose.** Confirm who the driver is working for and what happens next.

**Phone layout.**
1. "Welcome, Sani."
2. "You'll drive for **Musa Transport**." With the owner's name and photo if they have one.
3. **Your name**, prefilled from the invite, editable until the identity check.
4. Three short lines with icons, the steps ahead: Check your ID · Add your licence · Get your phone
   ready.
5. Main button **Start**.

### D-ON-02 Identity check

**Purpose.** Prove the driver is who he says, which protects shippers and the owner.

**Phone layout.** "Check your identity" and two lines: "Take a photo of your ID card or driver's
licence" and "Take a selfie". "It takes about 2 minutes." Main button **Start ID check**.

**What happens.** The Didit check opens with the camera: ID document, then a selfie with a liveness
check. Drivers don't enter a NIN (D006).

**States.**
- Approved: "Done. Your name is now Sani Abdullahi, as on your ID." The selfie becomes the driver's
  photo shown to senders and receivers.
- Needs review: "We're checking your details. Usually within 2 hours. You can carry on."
- Declined: the reason in plain words and **Try again**. After three tries: **Contact support**.

### D-ON-03 Driver's licence

**Purpose.** Record a valid licence so the driver can be put on trips.

**Phone layout.** "Your driver's licence"; a camera tile with a card-shaped frame; after the photo,
**Licence number** and **Expiry date** read from the photo, each with a check and **Edit**; main
button **Save licence**.

**States.** Unreadable: "We couldn't read it. Try again in good light, flat on a table." Expired: "This
licence expired on 3 Jan 2026. You can finish setup, but you can't drive trips until a valid licence
is approved."

### D-ON-04 Get your phone ready (required)

**Purpose.** Make sure the phone can run trips: installed, location allowed, screen kept on, GPS
working.

**Three short screens.**
1. **Install the app.** On Android, one **Install Freight Africa** button. On iPhone, three pictures:
   tap Share, tap Add to Home Screen, tap Add. Explanation: "Trips need the app installed so tracking
   and alerts work."
2. **How trips work on your phone.** Three pictures with one line each: phone in a dashboard holder ·
   charger plugged in · screen stays on. "Location is used only during trips."
3. **Test your GPS.** A short pre-screen ("We use your location only during trips, so the sender can
   see the truck and we can help you on the road"), then the phone's own permission prompt, then a
   small map with "GPS working · accurate to 12 m", or a fix ("Turn on Location in your phone
   settings, then tap Try again").

Main button **I'm ready**. The driver can't be put on a trip until the app is installed and the GPS
test has passed once, unless support waives it.

**Also asked here (optional):** **Emergency contact**: a name and WhatsApp number of someone to tell
if you press SOS.

### D-ON-05 Waiting for approval / ready

**Purpose.** Tell the driver where things stand.

**Layout.** A checklist: Identity (Done or Being checked) · Licence (Done or Being checked) · Phone
ready (Done). One line: "Musa Transport will give you trips here. We'll message you on WhatsApp when
your first trip comes." Main button **Go to Trip** → D-01.

The driver and owner both get a WhatsApp message when everything is approved.

---

## Part 4. The Trip tab

### 4.0 Design rules for every driving screen

- Body text 17 px; titles 26 px; the main button 64 px tall, full width, at the bottom of the screen.
- **One main action per screen.** Secondary actions are large icon buttons with labels in one row
  above the main button.
- High contrast for bright sun. A night look (dark background) switches on after sunset
  automatically, or can be set in Me.
- A short vibration confirms each step; a different, longer vibration means something went wrong.
- Every action records the phone's location and time and works offline: it's saved on the phone and
  sent when signal returns, in order, with the real time it happened.
- No money, anywhere.

### D-01 Trip tab: no trip

**Purpose.** Reassure the driver there's nothing to do yet.

**Layout.** A truck illustration; "No trip right now."; "Musa Transport will give you a trip here.
You'll also get a WhatsApp message."; and two links: **See next loads** (D-06) and **Test my GPS**.

### D-01 Trip tab: new trip to confirm

**Purpose.** Let the owner know the driver has seen the trip and can do it.

**How they get here.** The owner accepts a load and chooses this driver. A WhatsApp message and push:
"New trip from Musa Transport: Kano → Lagos, Tue 12 Nov, morning."

**Phone layout.**
1. "New trip" in a green label.
2. The loading time in large type: "Tue 12 Nov, morning (6 am to 12 pm)".
3. **From** card: pickup area and landmark ("Dawanau Market, gate 3").
4. **To** card(s): drop-off area(s) ("Apapa, Lagos").
5. **The load**: goods with its icon, weight, quantity, and any handling note on a yellow card.
6. The truck: plate and photo.
7. Main button **I'll do this trip**.
8. Text link: **I can't do this trip**.

**Interactions.**
- **I'll do this trip**: records `driver_acknowledged`; the owner sees "Sani confirmed"; the screen
  becomes the upcoming trip.
- **I can't do this trip**: a sheet with reasons (Sick · Truck problem · Already on another job ·
  Family matter · Other) and an optional voice note → **Send**. The owner is told at once and asked to
  pick another driver. The trip disappears from this driver's screen when the owner reassigns it.

**Why it works.** Today owners often learn on the morning of loading that a driver isn't coming. One
tap tells them in advance.

### D-01 Trip tab: upcoming trip

**Purpose.** Prepare for the trip.

**Phone layout.**
1. "Next trip" and the loading time in large type, with a countdown when it's today ("Loading starts
   in 3 h 20 min").
2. **From** and **To** cards, each with the contact's first name.
3. **The load** with the handling note.
4. **Before you go** checklist (ticks are for the driver only, not recorded): Phone charger in the cab
   · Phone holder · Truck papers with you · Tarpaulin and ropes if needed.
5. Row of icon buttons: **Directions to pickup** · **Trip details** (D-15) ·
   **Call** (the pickup contact; numbers are available because the trip is confirmed).
6. Main button **Go to pickup**.

**Reminders.** The evening before and 1 hour before the loading window: "Your trip to load at Dawanau
Market starts tomorrow morning. Tap Go to pickup when you leave." If the driver hasn't pressed **Go to
pickup** by the start of the loading window, the owner is told.

**Interactions.** **Go to pickup** starts trip mode (location and screen kept on) and moves to the
trip screen below. The first time, the location explanation and phone prompt appear if they weren't
already accepted.

### D-01 The trip screen

**Purpose.** Run the whole trip by pressing one button that always shows the next step.

**Phone layout, the same frame at every step.**
1. **Status strip** at the very top: tracking ("Tracking on" with a green dot, or "Tracking paused" in
   amber), charging icon, signal bars.
2. The red round **SOS** button, top right, on every step (D-05).
3. **Where you're going**, very large: "To pickup: Dawanau Market" or "To Lagos: Apapa".
4. Distance and arrival time: "48 km · about 1 h 10 min".
5. **What to do now**, in one sentence: "Drive to the pickup."
6. Row of large icon buttons with labels: **Directions** · **Call** · **Rest stops** (D-09)
   · **Problem** (D-04).
7. The **main button** at the bottom.

**The steps, in order.**

| Step | What to do now | Main button | What pressing it does |
| --- | --- | --- | --- |
| Driving to pickup | "Drive to the pickup." | **I've arrived** (active inside the pickup area; outside it reads "2.4 km to go") | Records arrival. The person loading gets the loading code on WhatsApp |
| At pickup | "You're at the pickup. Wait for loading to start." After 4 hours, a waiting timer shows | **Start loading** | Opens D-02 |
| Loading | "Take photos as the goods go on." | **Enter loading code** (active once at least 3 photos and any seal are in) | Opens D-03 for the loading code |
| Loaded | "Loaded. You can start the trip." | **Start trip** | The receiver gets a tracking link; arrival time starts |
| On the road | "On the road to Lagos." | No main button; **Directions** becomes the largest button | Opens Google Maps or Apple Maps to the next stop |
| Arrived at a drop-off | "You've arrived. Ask Amina to check the goods." | **Enter delivery code** | Opens D-03 for the delivery code |
| More drop-offs | "Next stop: Ikeja." | (back to On the road) | |
| Delivered | "Delivered. Well done." | **Done** | Opens D-10 |

**Trip mode while moving.** The screen calms down: the night look if it's dark, the destination in
very large type, distance and arrival time. Turn-by-turn directions are left to the navigation app.
Taps on empty space do nothing. The screen is kept awake; if the phone refuses: "Keep this screen open
during the trip." If the battery is under 50% and the phone isn't charging: "Plug in your charger to
keep tracking on."

**Coming back to the app.** Opening the app during a trip always lands here: "Welcome back. Tracking is
on again." If tracking had paused for 15 minutes, the driver will have had a push and WhatsApp message:
"Tap to resume your trip." At 30 minutes Freight Africa calls the driver; at 60 minutes, the owner.

**Who the Call button dials (D018).**
- Before loading: the person at the pickup.
- From the start of the trip: the receiver of the next stop.
- From the Chat screen header, while the trip is live: the sender who booked.
- Always: the driver's own owner and admins (same business).
- A banner appears when a contact taps "Ask the driver to call me": "Amina (receiver) asked you to
  call," with **Call now**.
- Numbers disappear when the trip is delivered or cancelled.

**Waiting.** After arriving at pickup or a drop-off, the first 4 hours are free. After that a line shows
"Waiting 4 h 20 min. Your owner is being paid for the wait." (no amount). If the receiver isn't
there, **Problem → Receiver not there** tells Freight Africa, who call them.

### D-02 Loading

**Purpose.** Record proof of what went on the truck, which protects the driver if anyone later claims
something was missing.

**Phone layout.**
1. "Loading" and the goods: "600 bags of rice, 30 t".
2. The sender's handling note on a yellow card ("Stack no more than 5 high").
3. **Photos of the goods on the truck**: a large camera tile and a counter "2 of 3 photos". Each photo
   carries a small stamp with the time and place. Tap a photo to view it full screen with **Retake**.
4. **Seal number** (only for goods that need a seal): a number field and a camera tile for the seal.
5. **Count or weighbridge ticket** (optional): a number field ("600 bags") or a photo of the ticket.
6. Main button **Enter loading code**, active once the required photos and seal are in.

**Tip line** under the photos: "Take one photo from each side and one from the back, with the goods
clearly visible."

**Offline.** Photos are kept on the phone with a small upload arrow each, and sent when there's signal.
The code can still be entered.

### D-03 Enter a code (loading or delivery)

**Purpose.** Confirm loading or delivery with the code the other side gives.

**Phone layout.**
1. Title: "Ask the person loading for the loading code" or "Ask Amina for the delivery code".
2. One line: "They got it on WhatsApp. They give it to you when they're happy with the goods."
3. **Delivery only, first:** **Take a delivery photo** (at least one, at the drop-off). The code boxes
   appear after it.
4. Six large digit boxes and a large number keypad.
5. Main button **Confirm**.

**After a correct delivery code:** a question with two large buttons, **Did Amina say anything is
wrong?** **No, all good** / **Yes, there's a problem**. "Yes" opens chips (Some goods short · Some
damaged · Wrong goods · Something else), "How many?" and "Out of how many?", photos, and **Save**.

**States.**
- Correct: a large green check and "Loading confirmed" or "Delivery confirmed", with a short
  vibration.
- Wrong: "That code isn't right. 3 tries left."
- Locked after 5 tries: "Too many tries. Freight Africa is calling Amina now. Stay with the goods."
- Outside the area: "You need to be at the drop-off to enter the code. You're 2.4 km away."
- No signal: "Saved. We'll confirm as soon as you have signal." The trip moves on.

**Why it works.** The driver never holds the code, so no one can accuse him of delivering without the
receiver's agreement, and no one can pressure him for it.

### D-09 Rest stops (sheet)

**Purpose.** Help the driver stop somewhere safe.

**How they get here.** **Rest stops** on the trip screen; suggested automatically when the truck
enters a road stretch that's risky outside its safe hours.

**Layout.** Approved parks ahead on the route, nearest first: name, distance and time from here, and
facility icons (security, food, toilets, mechanic, fuel). Each has **Directions**. When it applies, an
amber note at the top: "The road from Jebba to Mokwa is safer in daylight. The nearest approved park
is 18 km ahead."

Stopping at an approved park doesn't trigger Freight Africa's long-stop check; stopping for over 90
minutes elsewhere does, and operations may call.

### D-04 Report a problem

**Purpose.** Get help quickly in a few taps, without typing.

**Phone layout.** Large chips, two per row: **Truck broke down** · **Accident** · **Road closed or
unsafe** · **Police or checkpoint delay** · **Sender not ready** · **Receiver not there** · **Goods
don't match** · **Something else**.

Each choice asks only what's needed:
- **Truck broke down**: "Can it be fixed in under 4 hours?" **Yes** / **No**, a photo, a voice note.
- **Accident**: "Is anyone hurt?" **Yes** shows 112 as large text with **Copy** and asks "Press SOS?";
  **No** asks for photos.
- **Road closed or unsafe**: a photo or voice note; the arrival time pauses.
- **Police or checkpoint delay**: optional note; the arrival time pauses.
- **Sender not ready** / **Receiver not there**: starts or confirms the waiting time; Freight Africa
  calls the contact.
- **Goods don't match**: photos and a note; Freight Africa and the owner decide before loading
  continues.

Main button **Send**, then "Sent. Freight Africa will call you within 10 minutes." The owner is told
too. For a breakdown that can't be fixed soon: "We're finding another truck to take over. Stay with
the goods."

**Voice notes everywhere.** Each problem screen has a large **Hold to record** button.

### D-05 SOS

**Purpose.** Get help in an emergency, even when typing isn't possible.

**Layout.** The round red **SOS** button on every driving screen. **Press and hold for 2 seconds**: a
ring fills around it, so it can't go off by accident. Then a full red screen: "Help is being contacted.
Stay safe."

**What it does.** Sends the location to Freight Africa operations (who must respond within 2 minutes)
and to the owner, and, if set, a WhatsApp message to the driver's emergency contact. Shows the
emergency number 112 and the Freight Africa operations line in large text with **Copy**. Button **I'm
safe now** asks for a short note or voice note and returns to the trip.

### D-14 Trip chat (Launch 2, D045; not built at launch)

**Purpose.** Talk to the owner, the sender and Freight Africa about this trip.

**Phone layout.** Header with the trip reference and a **Call sender** button while the trip is live;
messages with names and roles; quick reply chips suited to drivers ("I'm on my way", "I'm at the
gate", "Loading is done", "Stuck in traffic", "Please call me"); a large **Hold to record** voice-note
button beside a small text field; a camera button. Messages written offline wait with a small clock
and send when back online. Typing is disabled while the truck is moving; quick replies and voice notes
still work.

### D-15 Trip details (sheet)

**Purpose.** All the facts about the trip in one place, when the driver needs to look something up.

**Layout.** Reference number; loading window; each stop with its area, landmark, contact first name and
status; goods, weight, quantity and handling note; truck plate; the sender's business name. No prices
or value. A **Directions** button beside each stop.

### D-10 Trip complete

**Purpose.** Close the trip and show what's next.

**Layout.** A large check, "Trip complete. Well done, Sani."; the route and the delivery time; the
number of photos recorded; "Your owner has been told." Then **What's next**: the next trip if the owner
has given one ("Thu: Lagos → Kano") with **See trip**, or return loads with **See next loads**, or "No
trip yet. Rest well." Main button **Done** → D-01.

No money is shown. The owner's balance is released at this moment, but that's between the platform and
the owner.

### D-11 Trip changed or cancelled

**Purpose.** Tell the driver clearly to stop or change plans.

**When it appears.** The owner gives the trip to another driver, or the sender cancels before loading.

**Layout.** A full-screen message:
- Reassigned: "This trip has been given to another driver. You don't need to go." Main button **OK**.
- Cancelled: "The sender cancelled this trip. Stop. You don't need to go to the pickup." If the truck
  was already at the pickup: "Your owner will be paid for the wasted trip." Main button **OK**.

Phone numbers for the trip disappear at the same moment. A vibration and a push accompany the
message even if the driver is in another app.

---

## Part 5. Next load

### D-06 Next load

**Purpose.** Show what's coming after this trip, and let the driver suggest a return load to the
owner.

**Phone layout.**
1. **From your owner**: trips the owner has already given the driver after the current one, each with
   date, route and goods, and **See trip**.
2. **Return loads near Lagos** (shown while a trip is on the road): loads starting near the current
   destination after the arrival time, with route, pickup day and goods. No prices.
3. On each return load: **Tell my owner I can take this**.

**Interactions.** **Tell my owner I can take this** sends the owner a push and WhatsApp message with the
load link ("Sani can take this return load from Lagos on Thu"). The owner accepts on their own screen.
The driver sees "Sent to Musa Transport" on the card, and the trip appears under From your owner once
accepted.

**While moving.** The list is visible; the button reads "Pull over to send."

---

## Part 6. History

### D-07 History

**Purpose.** A record of past trips, useful when someone asks about an old delivery.

**Phone layout.** A list grouped by month: date, route, status chip (Delivered, Delivered with a
problem, Cancelled), and the sender's rating if given ("★★★★★ Careful with goods"). Tapping a trip
opens a read-only page: map of the route taken, timeline, loading photos, seal number, delivery
photos, and any problem notes. No prices.

**Desktop layout.** A table with the same columns, and the trip page opening on the right.

---

## Part 7. Me

### D-08 Me

**Purpose.** The driver's own details and the phone settings that keep trips working.

**Phone layout, as a list of sections.**

| Section | What's there | What can be done |
| --- | --- | --- |
| Profile | Photo (from the ID check), name, phone | Change phone (with a code) |
| Working for | Musa Transport, the owner's name, default truck | **Call owner**; if the driver works for more than one owner, the account switcher |
| Licence | Photo, number, expiry, status | **Update licence** (camera, expiry read and confirmed) |
| Phone check | Installed or not, location permission, last GPS test | **Test my GPS**, install steps |
| Emergency contact | Name and WhatsApp number | Add or change |
| Night look | Automatic, Always on, Always off | Change |
| Notifications | Trip messages (can't be turned off), next loads, reminders | Turn the optional ones on or off |
| Help | Help (D-12), Freight Africa support WhatsApp number with **Copy** | |
| About | Version, Terms, Privacy | |
| Sign out | | **Sign out** |

**Licence reminders** arrive on WhatsApp 30, 7 and 1 days before expiry. An expired licence stops the
driver being given new trips; the owner is told.

**Leaving an owner.** A text link at the bottom of Working for: **Stop driving for Musa Transport**
(confirm sheet; not possible during a trip). The owner is told. The driver's account and history stay;
another owner can add him later.

---

## Part 8. Notifications

### N-01 Notification centre (shared)

The bell is in the top bar of the Next load, History and Me tabs (the Trip tab keeps the top clear for
driving). The list is grouped Today and Earlier; each item opens its screen.

### What a driver is told, and when

| Moment | WhatsApp | Push | In the app | While driving |
| --- | --- | --- | --- | --- |
| New trip from the owner | ✓ | ✓ | ✓ | Held until stopped |
| Trip reminder (evening before, 1 hour before) | ✓ | ✓ | ✓ | Sent |
| Trip changed or cancelled | ✓ | ✓ | ✓ (D-11) | Sent |
| Tap to resume your trip (tracking paused 15 min) | ✓ | ✓ | | Sent |
| A contact asked you to call | ✓ | ✓ | ✓ (banner) | Sent |
| A new chat message | | ✓ | ✓ | Held until stopped |
| Return load suggestions | | ✓ | ✓ | Held until stopped |
| Identity or licence approved, or needs a new photo | ✓ | | ✓ | Held |
| Licence expiring | ✓ | | ✓ | Held |

"Held until stopped" means the push waits until the phone has been still for 2 minutes. WhatsApp
messages can't be held on the phone, so they're kept short.

---

## Part 9. Help and support

### D-12 Help

**Purpose.** Quick answers for drivers, mostly about the road.

**Layout.** A search box; topic tiles with icons: **Using the trip screen** · **Codes** · **Photos** ·
**On the road** · **Problems and SOS** · **Your phone and GPS**; popular questions such as "What if my
phone dies on the trip?", "The receiver won't give the code", "I'm not near the drop-off but the
receiver is here", "Why do I need photos at loading?". Each answer is short, with pictures, and many
have a 30-second voice explanation (**Listen**). A **Talk to us** card at the bottom: **Chat with
support** (D-13) and the support WhatsApp number with **Copy**.

### D-13 Support conversation

During a trip, the trip chat (D-14) already includes Freight Africa, so the driver doesn't need a
separate conversation. Outside trips, **Chat with support** opens a conversation like the trip chat,
with voice notes encouraged: "Send a voice note if typing is hard. We usually reply within 30 minutes,
7 am to 9 pm."

---

## Part 10. Behaviour that applies everywhere

- **Trip first.** The app opens on Trip; any WhatsApp link opens Trip first during a live trip, with
  the linked screen one tap away.
- **Nothing to read while moving.** Typing is disabled and non-urgent pushes wait while the truck
  moves; buttons and voice notes still work.
- **Offline first.** Arrivals, photos, codes and problem reports all work without signal and are sent
  later in order.
- **Battery and data.** One location a minute while moving, fewer while stopped, sent in small batches.
  Photos shrink on the phone before upload.
- **Proof protects the driver.** Every photo, code and arrival is stamped with time and place and kept
  on the trip.
- **No money, no codes held.** The driver never sees prices or payouts, and never holds a code.
- **Accessibility.** Large text and buttons, labels on every icon, status always in words, vibrations
  for confirmations, voice notes wherever typing would be needed, and text that can grow to twice its
  size.
- **Plain words.** Trip, pickup, drop-off, load, code, photos, rest stop, problem.
