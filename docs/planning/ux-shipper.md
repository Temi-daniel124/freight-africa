# ux-shipper.md, Freight Africa

**Annex to `docs/PLATFORM-SCOPE.md` (authority 6 of 14).** Visual rules come from `DESIGN_SYSTEM.md`. Follows `ux-conventions.md`, and defers to `DECISIONS.md`, `DATA-MODEL.md`,
`SYSTEM-LOGIC.md` and `PLATFORM-SCOPE.md`. This is the screen-by-screen wireframe description and
user journey for the **shipper** role: anyone who sends a full truckload, from a single trader to a
manufacturer's logistics team. It covers phones and desktops. It contains no drawings; every screen
is described in words, top to bottom, so design and development can work from the same text.

Screen IDs (`S-xx`) are referenced from other documents and must not be renumbered. Shared screens
owned by `ux-public-and-auth.md` (A-, N-, P-) are described here from the shipper's side.

---

## Part 0. How to read this document

Each screen is described with the same headings:

- **Purpose**: what the shipper is trying to get done here.
- **How they get here**: the screens, messages or buttons that lead in.
- **Phone layout**: what sits on the screen from top to bottom on a phone (about 360 to 430 px
  wide).
- **Desktop layout**: how the same screen is arranged on a laptop or desktop (1024 px and wider).
  Tablets in landscape use the desktop layout; tablets in portrait use the phone layout with wider
  margins.
- **Interactions**: every button, link, field and gesture, what it does and where it leads.
- **States**: loading, empty, error and any special situation.
- **Why it works**: how the screen moves the shipper towards their goal.

"Sheet" means a panel that slides up from the bottom on a phone and opens as a centred dialog on
desktop. "Toast" means a short message that appears briefly at the bottom (phone) or bottom-left
(desktop) and disappears after 4 seconds.

---


## D045 and D046 update (24 Nov 2026): Home, Track a trip, trip tracking

These override the older layouts below where they differ. Phone first; desktop arranges the same cards.

**Sender Home (reference 03).** Top: the avatar, "Good morning, Adaeze", the business name and the
bell. The search pill (no scan button). Two large tiles, **Book a truck** with a truck graphic and
**Track a trip** with the box, each graphic bleeding off the tile edge. **Needs you** only when
something waits (pay, answer an offer), "Your move: …". **Current trip**: reference, goods, a status
chip, progress dots for Booked, Loaded, On the road and Delivered (a small truck marks where it is),
dates, from/to; tapping it opens trip tracking. **Recent trips** with status chips. Desktop: tiles and
Current trip on the left, Needs you and Recent trips on the right.

**Track a trip (reference 01, no QR).** The illustration, "Track a trip", a field "Trip reference, like
FA-7K3Q9" and **Track**. Under it, **On the road now**: one-tap rows for the business's live trips.
Only trips of the signed-in person's business can be found; anything else: "We can't find that trip in
Okafor Foods Ltd." Receivers and pickup contacts keep their own `/track/[token]` links.

**Trip tracking (reference 04).** A full-screen map (MapLibre, OpenFreeMap tiles): the route a green
line, the truck a deep green marker, the destination a pin, Back top left. A deep green slide-up sheet
with three snap points: peek (reference, status, progress); half (from/to with dates, goods and weight
or amount, truck plate and type); full (the money for the sender, "₦980,000 held safely", never shown
to drivers, receivers or pickup contacts). At the bottom, the driver card: avatar, first name, plate and
one **Call** button; Call opens a small sheet with the number, "Call 0803 …" (`tel:`) and Copy, only
during a live trip (D018), otherwise it says when calling opens. No chat. Desktop: the map fills the
content area and the details sit in a fixed right panel 400 px wide. Live positions arrive with Phase 4;
until then the trip's last known position.

**Post a load (D046).** Weight in tonnes with **Not sure**; with Not sure, an optional rough amount
(number and unit: bags, cartons, pieces, drums or tonnes). Livestock asks "How many animals?" instead.

## Part 1. The shipper's goals and the shape of the app

### 1.1 What a shipper wants

1. Get a trustworthy truck for a known route, at a fair price, without phoning around.
2. Know their money is safe until the goods arrive.
3. Know where the goods are, without calling the driver every hour.
4. Have proof if something goes wrong.
5. Do it again next week in seconds.
6. For businesses: let staff book and let accounts staff pay and download records.

Every screen is judged against these six goals. If a screen element doesn't serve one of them, it
doesn't belong.

### 1.2 One app, installed on phone or desktop

Freight Africa is a single installable web app (D004). On a phone it installs to the home screen
and opens full-screen like any app. On a desktop it can be installed from Chrome or Edge as a window
app, or used in a normal browser tab. The same account, data and screens work on both; the layout
adapts.

### 1.3 Mobile navigation: five bottom tabs

A fixed bar at the bottom of the screen, always visible except inside the booking flow and full
screen views (map, photo viewer, chat on very small screens).

| Tab | Icon and label | What it represents | Badge |
| --- | --- | --- | --- |
| **Home** | House, "Home" | Today at a glance: what needs you, live trips, quick booking and repeat bookings | Red dot when something needs action |
| **Trips** | Route line, "Trips" | Every booking ever made, sorted into Active, Finding truck, Unpaid, Done and Cancelled | Count of active trips |
| **Book** | Large green circle with a plus, raised above the bar, "Book" | Start a new booking. The most important action in the app, so it sits in the thumb's natural position, in the centre | None |
| **Payments** | Wallet, "Payments" | Money paid, refunds, charges due, monthly statements | Amber dot when a charge is due |
| **More** | Three lines, "More" | Saved places, saved receivers, team, business profile, help, settings, switch account | None |

Tapping the active tab again scrolls that screen to the top. Each tab keeps its own place, so going
from Trips to Home and back returns to the same trip.

### 1.4 Desktop navigation: left sidebar and top bar

**Left sidebar** (240 px wide, collapsible to icons only):

1. Freight Africa logo (primary horizontal version).
2. **Book a truck** button, full width, green. Same role as the centre Book tab on phones.
3. Navigation items with icons and labels: **Home**, **Trips**, **Payments**, **Saved places and
   receivers**, **Team** (owners and admins only), **Help**.
4. At the bottom: **Settings** and the signed-in person's name and photo.

**Top bar** (64 px tall, across the content area):

- Page title on the left.
- **Search** box in the middle: search by booking reference (FA-7K3Q9), city, receiver name or
  plate number. Results appear in a dropdown grouped by Trips, Receivers and Places.
- On the right: **notification bell** with an unread count, and the **organisation switcher** (logo
  and business name). Clicking it opens the account switcher (A-09) as a dropdown.

**Content area:** maximum width 1200 px, centred. Lists become tables with sortable columns. Detail
screens use two columns: main content on the left (about two thirds), a sticky side panel on the
right (about one third) for money, contacts and actions.

### 1.5 Who in a business can do what

Shippers who book as a business can invite staff (S-20). Each person has one sub-role. Anything a
person can't use is hidden from them, not shown greyed out.

| Action | Owner | Admin | Booker | Finance | Viewer |
| --- | --- | --- | --- | --- | --- |
| Book and edit drafts | ✓ | ✓ | ✓ | | |
| Pay | ✓ | ✓ | ✓ | ✓ | |
| Accept counter offers, raise price | ✓ | ✓ | ✓ | | |
| Cancel a booking | ✓ | ✓ | ✓ (own bookings) | | |
| See loading and delivery codes | ✓ | ✓ | ✓ | | |
| See phone numbers during a trip | ✓ | ✓ | ✓ | | |
| Report a problem, rate trips | ✓ | ✓ | ✓ | | |
| Payments and statements | ✓ | ✓ | | ✓ | |
| Team and business profile | ✓ | ✓ | | | |
| View trips | ✓ | ✓ | ✓ | ✓ | ✓ |

An individual shipper is simply the owner of their own one-person organisation and sees everything.

### 1.6 The complete journey at a glance

1. Arrives from the website, an agent's invite or a WhatsApp link → **sign in** (A-01, A-02).
2. **Chooses "I send goods"** and sets up in one screen (A-03, A-04).
3. Lands on an **empty Home** with a clear first step (S-01).
4. **Books** in four steps: Where, What, When and who, Price (S-02 to S-05).
5. **Pays** by bank transfer (S-06).
6. **Waits for a truck**, sees offers if any (S-07).
7. **Follows the trip**: truck confirmed, loading, on the road, arriving, delivered (S-09, S-10,
   S-11).
8. **After delivery**: rates the trip, downloads the receipt, or reports a problem (S-14, S-16,
   S-12, S-13).
9. **Comes back**: books again from Home or the trip, finds old trips, pays several at once (S-01,
   S-08, S-17).
10. **Manages the account**: payments, saved places and receivers, team, business profile,
    notifications, help, settings (S-15, S-18 to S-25, N-01, A-10).

---

## Part 2. Getting in

### A-01 Sign in or create an account (shared)

**Purpose.** Get the shipper into the app with no password to remember.

**How they get here.** **Get started** or **Sign in** on the website; **Book this** on a website
price quote; any deep link from WhatsApp or email when signed out; an agent's invite link.

**Phone layout.**
1. Stacked Freight Africa logo, centred, with generous space above.
2. Heading "Welcome to Freight Africa" and one line: "Book trucks you can trust. Your money is held
   safely until delivery."
3. **Continue with Google** button (white with a border and the Google mark).
4. A thin divider with "or".
5. Phone number field with a fixed "+234" prefix, accepting numbers typed as 0803…, 803… or with the
   prefix, formatting as you type.
6. **Send code on WhatsApp** main button.
7. Text link "Use email instead", which swaps the phone field for an email field and the button to
   **Send code by email**.
8. Small text at the bottom: "By continuing you agree to our Terms and Privacy policy", each a link.

**Desktop layout.** A centred card (440 px wide) on the paper-coloured background, same content and
order. To the left of the card on wide screens: a short reassurance column with three lines and
icons (Verified truck owners · Money held until delivery · Live tracking).

**Interactions.**
- **Continue with Google**: opens Google's account picker. A returning shipper lands where they were
  going (the deep link) or on Home. A new person goes to A-03.
- **Send code on WhatsApp**: checks the number is a valid Nigerian mobile number, sends a 6-digit
  code through the Freight Africa WhatsApp account (SMS if WhatsApp can't deliver it), and moves to
  A-02.
- **Send code by email**: sends the code through Resend and moves to A-02.

**States.** Invalid number: "Enter a Nigerian mobile number, for example 0803 123 4567." Too many
requests: "You've asked for 5 codes in the last hour. Try again at 3:40 pm."

**Why it works.** One tap with Google, or a code on WhatsApp, which every trader already uses. No
password means no "forgot password" and no lockouts.

### A-02 Enter the code (shared)

**Purpose.** Prove the phone number or email belongs to them.

**Phone layout.** Back arrow; heading "Enter the 6-digit code"; line "Sent to +234 803 123 4567 on
WhatsApp" with a **Change** link; six large boxes; **Resend code** link, disabled with a 30-second
countdown, then active.

**Desktop layout.** Same, in the centred card.

**Interactions.** Typing moves to the next box automatically; pasting a code fills all six; on
phones that offer it, the code fills itself from the message. The sixth digit submits automatically.
**Change** returns to A-01 with the number filled.

**States.** Wrong code: boxes clear and a red line reads "That code isn't right. Check the latest
message." After 5 wrong tries: "Too many tries. Get a new code." with **Send a new code**.

**What happens next.** Returning shipper → their deep link or Home. New → A-03. Invited team member →
straight into the inviting business's Home.

### A-03 What brings you here? (shared)

**Purpose.** Send the new person down the right path.

**Phone layout.** Heading "What brings you to Freight Africa?" Three large stacked cards, each with a
simple illustration, a title and one line:
- **I send goods**: "Book trucks for your loads."
- **I own trucks**: "Find loads and get paid fast."
- **I'm an agent**: "Earn by bringing truck owners and senders." (Hidden if agents are switched off.)

Below the cards: "Are you a driver? Ask the truck owner to add you. You'll get an invite on
WhatsApp."

Below that, three checkboxes:
- "I agree to the Terms and Privacy policy" (required).
- "Send me trip updates on WhatsApp" (required, with a short explanation that codes and updates
  arrive this way).
- "Send me occasional news and offers" (optional).

**Desktop layout.** The three cards sit side by side in a row; consents below.

**Interactions.** Tapping a card selects it (green border and check). The main button at the bottom,
**Continue**, enables once a card is chosen and the required boxes are ticked. "I send goods" → A-04.

### A-04 Set up as a shipper (shared)

**Purpose.** Create the shipper account in one screen and get to booking.

**Phone layout.**
1. Heading "Tell us who's sending".
2. **Your name**, filled in from Google if they used it.
3. **Sending as**: two chips, **Myself** and **A business**.
4. If **A business**: **Business name**, and **Registration number** (optional, with helper text
   "Helps large customers trust you").
5. **Add your phone** or **Add your email**, whichever they didn't sign in with (optional; verified
   by a code when added).
6. Main button **Start booking**.

**Desktop layout.** Centred card, same order.

**Interactions.** **Start booking** creates the shipper organisation with this person as owner. If a
price quote was saved from the website, it opens the booking flow with that route filled in (S-05
if everything is known, otherwise S-02). Otherwise it opens Home.

**Why it works.** Four fields at most. Everything else (places, receivers, team) is asked for only
when it's needed.

---

## Part 3. Home

### S-01 Home

**Purpose.** Show, in one glance, anything that needs the shipper's action, where their goods are
right now, and the fastest way to book.

**How they get here.** After sign-in; the Home tab or sidebar item; the logo on desktop.

**Phone layout (returning shipper).**
1. **Top bar**: business logo or the person's initials (opens the account switcher), the word
   "Home", and the notification bell with a count.
2. **Greeting**: "Good morning, Adaeze" in body text, not a large banner.
3. **Needs your action** (only if there is something): a short stack of rows, each with an icon,
   one line, and one button on the right:
   - "FA-7K3Q9 is waiting for payment" → **Pay**.
   - "An owner offered ₦1,050,000 for FA-2M8R1" → **Review**.
   - "No truck yet for FA-9P4T2 after 24 hours" → **Decide**.
   - "Waiting charge of ₦15,000 to pay" → **Pay**.
   - "Rate your trip to Kano" → **Rate**.
4. **Book a truck** card: two fields side by side, **From** and **To**, each showing the city
   picker on tap, and a **Continue** button.
5. **Book again**: up to three cards in a horizontal scroll, one per lane used most often. Each card
   shows the route ("Lagos → Kano"), the truck ("30 t flatbed"), the goods ("Bags of rice") and the
   last price.
6. **Live trips**: one card per booking that isn't finished, with the ones needing attention first.
   Each card shows the reference, the route, a status chip (for example "On the road" in blue), the
   next thing that will happen ("Arrives Thu about 2:30 pm"), and the money held ("₦630,000 held
   safely").
7. Bottom tabs.

**Phone layout (first visit, no trips yet).**
1. Top bar as above.
2. Illustration of a truck on a road, small.
3. "Your trips will show here."
4. A green badge "Your first trip has no service fee" when the launch offer applies.
5. Main button **Book your first truck**.
6. Three short reassurance lines: "Pay once. Money held until delivery." "Only verified truck
   owners." "Track your goods all the way."
7. Link "How it works" → P-05.

**Desktop layout.**
- Main column: Needs your action list at the top, then Live trips as a table (Reference · Route ·
  Status · Next step · Money held), each row opening the trip.
- Right panel: the **Book a truck** card at the top, then **Book again** as a vertical list, then a
  small **This month** box ("4 trips · Service fee now 3% · 2 more trips to reach 2%").

**Interactions.**
- **Needs your action** buttons: **Pay** → S-06 · **Review** → S-07 at the offer · **Decide** → S-07
  at the decision card · **Pay** (charge) → S-23 · **Rate** → S-14.
- **Book a truck**: picking cities opens S-02 with both filled.
- **Book again** card: opens S-05 with everything copied and a date picker at the top, because the
  only thing that usually changes is the day.
- **Live trip** card or row: opens S-09.
- Pull down to refresh on phones (data updates live anyway).

**States.** Loading: grey placeholder blocks in the shape of the cards. Offline: an amber strip under
the top bar, "You're offline. Showing your last saved trips." Booking blocked by an unpaid charge: a
red row at the top of Needs your action, "Pay the ₦15,000 waiting charge to book again."

**Why it works.** The first thing a shipper sees is what they must do, then where their goods are,
then how to book. The booking start sits where the thumb rests and Book again cuts a repeat booking
to two taps.

---

## Part 4. Booking a truck

### 4.0 How the booking flow behaves

- Four steps: **1 Where · 2 What · 3 When and who · 4 Price**. A thin progress bar at the top shows
  the step and the step name.
- The bottom tabs are hidden during booking so nothing distracts. A close icon (top left) leaves
  the flow; the booking is kept as a draft and appears in Trips → Unpaid.
- Every change is saved as it happens. Closing the app and returning resumes at the same step.
- From step 2 on, a **price bar** sits above the main button showing the total ("₦1,030,000 total")
  and a **Details** link.
- **Desktop:** the four steps sit on one page as stacked sections that open in turn. A sticky
  **summary panel** on the right shows the route, goods, truck, time, contacts and the price
  breakdown, updating as the shipper fills in each section. The main button sits at the bottom of the
  summary panel.

### S-02 Step 1: Where

**Purpose.** Say where the goods are collected and where they go.

**Phone layout.**
1. Progress bar "1 of 4 · Where".
2. **Pickup** field with a green dot icon, placeholder "Where are the goods?".
3. A dotted vertical line connecting to:
4. **Drop-off** field with a pin icon, placeholder "Where are they going?".
5. **Add another drop-off** text link with a plus icon (up to four drop-offs).
6. Once both are set: a route strip, "Lagos → Kano · about 1,000 km · usually 2 to 3 days on the
   road".
7. Main button **Next: what are you sending**.

**Desktop layout.** The Where section on the left, with a map below the fields showing the pickup and
drop-off pins and the route line. The summary panel on the right starts filling.

**Interactions.**
- Tapping **Pickup** or **Drop-off** opens the **place picker** (S-02a).
- Extra drop-offs appear as numbered rows with a drag handle (reorder by dragging) and a remove
  icon.
- **Next** goes to S-03.

**States.** Route not covered: a calm amber box, "We don't cover this route yet. We're on Lagos ⇄
Kano, Lagos ⇄ Abuja, Lagos ⇄ Onitsha/Aba and Port Harcourt ⇄ Aba ⇄ Onitsha ⇄ Enugu," with **Tell me
when you do** (saves interest) and the main button disabled.

### S-02a Place picker (sheet)

**Purpose.** Find the exact spot quickly, even where street addresses are vague.

**Layout.**
1. Search field at the top with the keyboard open, placeholder "Search for an address, market or
   warehouse".
2. **Use my current location** row (asks for location permission the first time, with one line
   explaining why).
3. **Saved places** list: label ("Apapa warehouse"), address, times used.
4. Search results as the shipper types.
5. **Pick on the map** row at the bottom: opens a full-screen map with a fixed centre pin; the
   shipper moves the map under the pin and taps **Use this spot**.

After choosing, a small second view asks:
- **Landmark** (optional): "Opposite First Bank, Dawanau Market gate 3".
- **Save this place** switch with a **Label** field.
- **Done**.

**Desktop layout.** A dialog (560 px) with the search and lists on the left and a map on the right
that moves as results are highlighted.

**Why it works.** Truck drivers navigate by landmarks and markets as much as by addresses. Saved
places make repeat bookings instant.

### S-03 Step 2: What

**Purpose.** Describe the goods well enough to get the right truck and a firm price.

**Phone layout.**
1. Progress bar "2 of 4 · What".
2. **What are you sending?** A grid of picture chips, two or three per row: Bags of grain, Cement,
   Cartons and boxes, Building materials, Fresh produce, Livestock, Machinery, Containers. A **See
   all** link at the end.
3. **How heavy?** A slider in tonnes with a number field beside it, plus a "Not sure?" link that
   shows typical weights ("A 30-tonne truck carries about 600 bags of 50 kg").
4. **How many?** optional field ("600 bags").
5. **Truck**: a highlighted card with the suggested truck's illustration and name ("Suggested: 30 t
   flatbed") and a **Change** link.
6. **Value of the goods** in naira, with helper text: "Used to match you with trucks allowed to
   carry this value. The driver doesn't see it."
7. **Only insured trucks** switch with an info icon.
8. **Documents needed** (only for goods that require one, such as a vet health certificate for
   livestock): a camera tile, "Take a photo of the certificate".
9. **Note for the driver** (optional, up to 200 characters), placeholder "Handle with care, stack
   no more than 5 high".
10. Price bar: "₦1,030,000 total · Details".
11. Main button **Next: when and who**.

**Desktop layout.** Goods chips in a row of four; weight, quantity and value in a three-column row;
truck card and insured switch side by side; the summary panel shows the price as soon as goods and
weight are set.

**Interactions.**
- **See all** opens a sheet with every goods category grouped (Food and farm, Building, Packaged
  goods, Animals, Machinery) and a search box. Searching for something banned shows "We can't carry
  this" with a link to the list of goods we don't carry.
- **Change** truck opens a sheet of truck types that fit the goods and weight, each with an
  illustration, capacity and the price difference ("+₦120,000"). Picking one updates the price.
- **Only insured trucks** info icon: "Only trucks whose owners hold goods-in-transit insurance will
  see your booking. You may wait longer for a truck."
- **Details** on the price bar opens the price breakdown sheet (freight, service fee, any first-trip
  offer, total).

**States.** Weight above every truck's capacity: "This is more than one truck can carry. Split it
into two bookings." Document required but missing: the main button shows "Add the vet certificate to
continue".

### S-04 Step 3: When and who

**Purpose.** Set the loading time and the people at each end, who will receive the codes.

**Phone layout.**
1. Progress bar "3 of 4 · When and who".
2. **Loading day**: chips for Today, Tomorrow and the next five days, plus a calendar icon for later
   dates.
3. **Loading time**: chips Morning (6 am to 12 pm), Afternoon (12 to 5 pm), Evening (5 to 9 pm),
   Any time.
4. **Who's at loading?** A switch **I'll be there myself**. When off: **Name** and **WhatsApp
   number** fields, and a **Pick a saved contact** link. Helper: "They'll get a loading code to give
   the driver once your goods are on the truck."
5. **Who receives it?** One block per drop-off, each with a switch **I'll receive it myself**. When
   off: **Name**, **WhatsApp number**, **Email** (optional), **Pick a saved receiver** link, and a
   **Save this receiver** switch. Helper: "They'll get a tracking link and a delivery code on
   WhatsApp."
6. Price bar.
7. Main button **Next: check your price**.

**Desktop layout.** When fields on one row; the pickup contact and receivers in a two-column grid.

**Interactions.** Saved contact links open a searchable list (S-19 data); choosing fills the fields.
Phone fields format as typed and check the number is valid.

**Why it works.** The shipper learns here, in plain words, what the codes are and who gets them, so
nothing about delivery is a surprise later.

### S-05 Step 4: Price and review

**Purpose.** Show everything and the exact amount before any money moves.

**Phone layout.**
1. Progress bar "4 of 4 · Price".
2. **Summary card**: route with each stop, loading day and time, goods, weight and quantity, truck,
   "Only insured trucks" if chosen, and the names of the pickup contact and receivers. Each row has a
   small **Edit** link.
3. **Price card**:
   - Freight: ₦1,000,000
   - Service fee (3%): ₦30,000
   - First trip offer: −₦30,000 (only if it applies)
   - **Total: ₦1,030,000** (bold, larger)
4. **What's included**, as a short list with check icons: Money held safely until delivery ·
   Verified truck owner and truck · Live tracking · Delivery code so no one can claim a false
   delivery · Photos at loading and delivery · Receipts for your records.
5. A muted line: "Your fee drops to 2% from your 6th trip this month."
6. A reassurance line: "If no truck accepts within 24 hours, you can raise the price or get a full
   refund."
7. Main button **Pay ₦1,030,000**.
8. Text links below: **Save and pay later** · **Pay for several trips at once**.

**Desktop layout.** Summary on the left, price card and main button in the right panel.

**Interactions.**
- **Edit** on any row returns to that step with the field focused; **Next** then comes straight back
  here.
- **Pay ₦1,030,000** recalculates the price once more. If it changed, a line appears above the
  button: "The price for this route changed to ₦1,040,000," and the button updates. Then → S-06.
- For a booker who isn't allowed to pay, the main button reads **Send to Chidi to pay** (the finance
  member's name, or a picker if there are several). Chidi gets a WhatsApp message and a notification;
  the booking waits in Unpaid with "Waiting for Chidi to pay".
- **Save and pay later** → Trips, Unpaid tab, with a toast "Saved. Pay when you're ready."
- **Pay for several trips at once** → S-17.

**Why it works.** The total appears in large type next to what it buys. Nothing is hidden behind a
later step.

---

## Part 5. Paying

### S-06 Pay

**Purpose.** Pay the exact amount by bank transfer with no chance of error.

**How they get here.** **Pay** on S-05, Home, Trips or a WhatsApp reminder.

**Phone layout.**
1. Top bar with a back arrow and "Pay for FA-7K3Q9".
2. The amount in the largest type on any screen: **₦1,030,000**.
3. "Transfer exactly this amount to:"
4. A card with the bank name, the **account number** in large, evenly spaced digits with a **Copy**
   button, and the account name.
5. A countdown: "This account number works for 23 h 59 min."
6. Three numbered steps: Copy the account number · Transfer from your bank app · We'll confirm here
   automatically.
7. A live status line with a soft animated dot: "Waiting for your transfer…".
8. Text links: **Share payment details** · **Cancel booking**.

**Desktop layout.** The amount and account card on the left; the three steps and live status on the
right; a QR code is not used (bank apps in Nigeria don't scan these reliably).

**Interactions.**
- **Copy** copies the account number and shows "Copied" for 2 seconds.
- **Share payment details** opens the phone's share sheet with a short text (amount, bank, account
  number, reference, expiry) for someone else to pay. On desktop it copies the text.
- **Cancel booking** opens a confirm sheet: "Cancel this booking? Nothing has been paid." → back to
  Trips.
- When payment arrives, the status changes to a check mark and "Payment received", then the screen
  moves to S-07 after 2 seconds.

**States.**
- Paid too little: amber box "We received ₦1,000,000. ₦30,000 still to pay," with the same account
  details.
- Paid too much: the booking goes ahead and a toast says "₦5,000 extra will be refunded to your
  account."
- Expired: "This account number has expired." with **Get a new one** (the price is checked again).
- Card payments: a **Pay by card** option appears here only when card payments are switched on in
  settings (D020). Off at launch.

**Why it works.** One number to copy, one amount to send, and automatic confirmation. The shipper
never has to send a screenshot of a transfer.

---

## Part 6. Finding a truck

### S-07 Finding a truck

**Purpose.** Reassure the shipper while owners see the booking, and let them respond to offers or
delays.

**How they get here.** Automatically after payment; from Home or Trips → Finding truck.

**Phone layout.**
1. Status header: "Finding a truck", time since payment ("12 min"), and "Sent to 18 truck owners on
   this route."
2. **Money held** banner in a soft green: "₦1,030,000 held safely."
3. **Offers** (only when an owner proposes a different price): one card per offer showing the
   owner's business name, tier badge (New, Established, Gold), star rating, trips completed, insured
   badge if any, the truck type, and the offer, "Will do it for ₦1,050,000 (+₦50,000)", with a
   countdown ("1 h 42 min left"). On the card: **Accept and pay ₦51,500** and a **Decline** link.
4. **No truck yet** card (after 24 hours): "No truck has accepted yet." Four options as stacked
   buttons and links: **Raise the price by 5% (₦51,500)**, **Raise by 10% (₦103,000)**, **Keep
   waiting**, **Get a full refund**.
5. **Your booking** summary, collapsed, with **Change loading time** inside.
6. Text link in red: **Cancel and get a full refund**.

**Desktop layout.** Status and offers on the left; money held, summary and cancel on the right.

**Interactions.**
- **Accept and pay** opens S-06 for the extra amount (the difference plus the fee on it). Once paid,
  the truck is confirmed.
- **Decline** removes the card with a toast "Offer declined."
- **Raise the price** opens S-06 for the extra amount; the booking is sent to owners again.
- **Keep waiting** dismisses the card for now.
- **Get a full refund** and **Cancel and get a full refund** open a confirm sheet: "₦1,030,000 will
  be refunded to the account that paid." → the booking moves to Cancelled.
- **Change loading time** opens the When chips from S-04; saving sends the booking to owners again.

**What happens next.** When an owner accepts, this screen turns into the trip screen (S-09) with a
toast "Truck found: Musa Transport, 30 t flatbed," and a WhatsApp message goes to the shipper.

---

## Part 7. Following the trip

### S-09 Trip detail

**Purpose.** The single place to see where the goods are, what has happened, what happens next,
and where the money is.

**How they get here.** Home live trip cards, Trips list, notifications, WhatsApp links, search.

**Phone layout.**
1. **Status header**: the status in plain words ("On the road to Kano"), the arrival time ("Arrives
   Thu about 2:30 pm, in 26 h"), and a tracking chip: "Live" in green, or "No signal since 14:10" in
   amber with a small info icon ("Common on some highway stretches. We're keeping watch.").
2. **Map**, about 40% of the screen height: the planned route, the truck marker pointing in its
   direction, the stops, and dashed sections where the signal dropped. Tap to open S-10.
3. **Money held** banner: "₦630,000 held safely. Released when delivered." Tap to open the money
   sheet: amount paid, advance released to the owner and when, amount held, any amount held for a
   problem.
4. **Code card** (owners, admins and bookers only):
   - Before loading: "Loading code: 518 204. Sent to Emeka (pickup contact) on WhatsApp." with
     **Resend** and **Copy**.
   - After loading, before the delivery code is sent: "We'll send the delivery code about an hour
     before arrival."
   - Once sent: "Delivery code: 482 913. Sent to Amina (receiver) on WhatsApp." with **Resend to
     receiver** and **Copy**.
5. **Truck and driver card**: the driver's first name and photo, the owner's business name, tier
   badge, star rating, insured badge, truck type, plate number in large letters, and a truck photo.
   Buttons: **Call driver**, **Call owner**, **WhatsApp** (no chat at launch, D045).
6. **Timeline**: each step with its time and who did it. For example: Truck confirmed · Driver on the
   way to pickup · Arrived at pickup · Loading started · 4 photos added, seal 00451 · Loaded, advance
   paid to owner · On the road · (upcoming steps in grey). Photos show as thumbnails; tapping opens a
   full-screen viewer with swipe.
7. **Stops**: pickup and each drop-off, with the contact's name, a status chip and whether the code
   has been used.
8. **Details**: goods, weight, quantity, value, documents, reference, who booked it.
9. **Actions** at the bottom, shown only when they apply:
   - Before loading: **Cancel trip** (red link).
   - At any time after the truck is confirmed: **Report a problem**, **Get help**.
   - After delivery: **Rate this trip**, **Download receipt**, **Book again**, and **Report a
     problem** for 48 hours.

**Desktop layout.** Left column: status header, a larger map, then the timeline. Right sticky panel:
money held, code card, truck and driver card with contact buttons, stops, then actions. Chat can
open as a panel on the right without leaving the trip.

**The screen at each stage of the trip.**

| Stage | Status header says | What changes on screen |
| --- | --- | --- |
| Truck confirmed | "Truck confirmed. Driver getting ready." | Truck and driver card appears; phone numbers become available (D018) |
| Driver on the way to pickup | "On the way to pickup. About 40 min." | Map shows the truck approaching the pickup |
| At pickup | "Truck is at the loading point." | Loading code card highlighted; waiting clock appears after 4 free hours |
| Loading | "Loading in progress." | Loading photos appear in the timeline as the driver adds them |
| Loaded | "Loaded. Advance paid to the owner." | Money held drops; seal number shown |
| On the road | "On the road to Kano." | Live map, arrival time; receiver has been sent the tracking link |
| About an hour away | "Almost there." | Delivery code card shows the code sent to the receiver |
| Arrived | "Arrived at Dawanau Market." | "Waiting for the receiver to check the goods" |
| Delivered | "Delivered Thu 2:41 pm." | Delivery photo; money held shows ₦0 with "Owner paid"; rating and receipt buttons appear; phone numbers hidden |
| Delivered with a problem | "Delivered. Problem reported: 12 bags short." | Red banner with the amount held; link to S-13 |
| Cancelled | "Cancelled." | Refund amount and status; phone numbers hidden |

**Interactions.**
- **Call driver**, **Call owner**: show the number with a **Copy** button and open the phone's
  dialler on phones. **WhatsApp** opens a WhatsApp chat with the driver. Numbers come from the
  server only while the trip is confirmed and live; before that the buttons read "Numbers are shown
  once a truck is confirmed", and after delivery or cancellation "Numbers hidden after the trip
  ended. Contact support if you need them." (D018).
- **Resend** on a code card sends the code again to that contact (limited to 3 times an hour).
- **Cancel trip** opens a confirm sheet stating the money effect in one sentence, which depends on
  the stage: "You'll get a full refund of ₦1,030,000" before the truck reaches pickup; "You'll get
  ₦975,000 back. ₦25,000 goes to the owner for the wasted trip and the ₦30,000 service fee isn't
  refunded" once the truck is at pickup. After loading the option is gone.
- **Report a problem** → S-12. **Get help** → S-25 with this trip attached.
- **Rate this trip** → S-14. **Download receipt** → S-16. **Book again** → S-05 with a date picker.

**Special states.**
- Waiting time running: amber banner "The truck has waited 4 h 20 min at pickup. A waiting charge of
  ₦5,000 per hour now applies."
- Breakdown and second truck: blue banner "The first truck broke down. A second truck is taking
  over." The timeline shows both trucks; the truck card shows the new one.
- Tracking escalated: amber banner "We've lost the truck's signal for over an hour. We're calling the
  driver and owner." The shipper doesn't need to act.

**Why it works.** The answer to "where are my goods and is my money safe?" is the first thing on the
screen at every stage. Everything else is a tap away, not mixed in.

### S-10 Full map

**Purpose.** Look closely at the route and the truck's progress.

**Layout.** Full-screen map with a close button (top left), **Centre on truck** and **Show whole
route** buttons (bottom right), a small legend ("Dashed: no signal"), the last update time, and a
bottom drawer listing the stops with their arrival times. Desktop opens this as a large dialog.

### S-11 Trip chat (Launch 2, D045; not built at launch)

**Purpose.** Talk to the owner, driver and Freight Africa about this trip without leaving the app.

**Phone layout.**
1. Header: "Trip FA-7K3Q9" and the participants as small avatars (your team, the owner, the driver,
   Freight Africa).
2. Messages with the author's name and role ("Musa · Driver"). Freight Africa messages carry a green
   label.
3. Quick reply chips above the keyboard: "Where are you now?", "Please call me", "Loading is ready",
   "Gate 3 is open".
4. Composer: text field, **Photo** (camera or gallery), **Voice note** (hold to record, release to
   send, slide left to cancel).

**Desktop layout.** A side panel on the trip screen, or a full page with the trip summary on the
right.

**Interactions and rules.** Messages written offline wait with a small clock icon and send when back
online. If someone types what looks like a bank account number, a gentle warning appears: "Keep
payments on Freight Africa so your money stays protected." Chat stays open for 48 hours after
delivery, or while a problem is open, then becomes read-only.

---

## Part 8. After delivery

### S-14 Rate the trip

**Purpose.** Record how it went, which builds the owner's public track record.

**Layout.** "How was your trip to Kano?" Five large stars. After choosing, tag chips appear that
match the rating (4 to 5 stars: On time, Careful with goods, Good communication; 1 to 3 stars: Late,
Goods damaged, Rude, Asked for extra money). Optional comment. Main button **Send rating**, then a
thank-you toast and back to the trip.

**When it's offered.** A notification right after delivery, a row on Home under Needs your action,
and the button on the trip. Open for 7 days.

### S-16 Receipt

**Purpose.** Give accounts staff a document they can file.

**Layout.** A clean receipt page: Freight Africa details, the shipper's business details, booking
reference, route and dates, freight, service fee, offers, refunds, total paid, and VAT on the service
fee where it applies. Buttons **Download PDF** and **Share**. Desktop shows it as a printable-width
page in the content area.

### S-12 Report a problem

**Purpose.** Record a problem with evidence while it's fresh, and protect the money in dispute.

**How they get here.** **Report a problem** on the trip (any time after the truck is confirmed, and
for 48 hours after delivery).

**Layout, three steps on one scrolling screen (phone) or one dialog (desktop).**
1. **What's wrong?** Chips: Goods short · Goods damaged · Wrong goods · Not delivered · Very late ·
   Driver or owner behaviour · Charged more than agreed · Something else.
2. **Tell us more.** Where countable: "How many are affected?" and "Out of how many?" number fields.
   **Amount you're claiming**, filled in with an estimate from the declared value (editable).
   Description. Photos (camera opens directly; gallery allowed).
3. **Check and send.** One sentence on the money: "₦40,000 will be held from the owner's payment
   while we look into this," or, if the owner was already paid, "The owner has been paid. If we
   agree with you, we'll recover the amount from them." Main button **Send report**.

**What happens next.** → S-13 with a toast "Report sent. We'll reply within 72 hours." The owner is
told and asked for their side.

### S-13 Problem detail

**Purpose.** Follow the problem to a decision.

**Layout.**
1. Status chip: Open · Waiting for evidence · Being reviewed · Decided.
2. Amounts: claimed, held, and (once decided) the decision.
3. Deadline line: "The owner has until Fri 5 pm to respond."
4. One combined feed of evidence from both sides: your photos and notes, the owner's response, the
   loading photos and seal number, the delivery photos, and a snapshot of the GPS route.
5. **Add more evidence** (text and photos).
6. After the decision: the outcome, the Freight Africa reviewer's note in plain words, the money
   effect ("₦40,000 will be refunded when the trip closes"), and **Ask a question about this
   decision**.

Desktop shows the evidence feed on the left and the status, amounts and actions on the right.

---

## Part 9. Coming back and finding things

### S-08 Trips

**Purpose.** Find any booking, past or present.

**Phone layout.**
1. Top bar "Trips" with a search icon.
2. Tabs across the top: **Active** · **Finding truck** · **Unpaid** · **Done** · **Cancelled**.
3. A filter row: date range, and (for businesses) **Booked by**.
4. Cards: reference, route, date, status chip, total, and the arrival time or delivery date.

**Desktop layout.** The same tabs above a table: Reference · Route · Loading date · Status · Booked by
· Total · Delivered or arriving. Columns sort by clicking their header. A row checkbox appears on the
Unpaid tab.

**Interactions.** A card or row opens the right screen for its state: Unpaid → S-06, Finding truck →
S-07, all others → S-09. On the Unpaid tab, selecting several shows a bar at the bottom, **Pay for 3
selected (₦3,090,000)** → S-17.

**Empty tabs.** Active: "No trips on the road right now." with **Book a truck**. Done: "Your
finished trips will be listed here." Unpaid: "Nothing waiting for payment."

### S-17 Pay for several trips

**Purpose.** Let a business pay a week's bookings with one transfer.

**Layout.** List of unpaid bookings with checkboxes, each with its total and a drag handle; the
running sum at the bottom; a note "If you transfer less, we'll confirm bookings in this order until
the money runs out"; main button **Pay ₦3,090,000** → S-06 with one account number for all of them.

---

## Part 10. Money

### S-15 Payments

**Purpose.** One place for everything the shipper has paid, been refunded or still owes.

**Phone layout.** Top bar "Payments". Tabs: **Payments** · **Refunds** · **Charges due** ·
**Statements**.
- **Payments**: list by date with reference(s), amount and status. Tap → S-16 receipt.
- **Refunds**: amount, reason, trip, status (Pending, Sent) and date.
- **Charges due**: waiting charges or other extra charges with **Pay** on each. If bookings are
  blocked by an unpaid charge, a red line at the top says so.
- **Statements**: a month picker; a summary of trips, freight, fees and refunds for the month;
  **Download PDF** and **Download spreadsheet**.

**Desktop layout.** Tabs above tables; the statement summary as a card above the download buttons.

**Who sees it.** Owners, admins and finance members. Bookers and viewers don't have this tab; on
phones their bottom bar shows four tabs.

### S-23 Pay a charge

**Purpose.** Pay an extra charge that arose after booking, such as waiting time.

**Layout.** Why the charge exists ("The truck waited 7 hours at pickup. The first 4 hours are free;
3 hours at ₦5,000"), the trip, the amount, then the same transfer view as S-06.

---

## Part 11. Notifications

### N-01 Notification centre (shared)

**Purpose.** A record of every update, so nothing is missed if a WhatsApp message was.

**How they get here.** The bell in the top bar.

**Layout.** A list grouped **Today** and **Earlier**. Each item has an icon for its kind (money,
truck, code, problem, offer), one line of text, the time, and an unread dot. A **Mark all as read**
link at the top. Desktop opens it as a dropdown panel under the bell, with **See all** opening the
full page.

**Interactions.** Tapping an item marks it read and opens the exact screen (the trip, the offer, the
receipt).

**What a shipper is notified about, and where.** WhatsApp messages and push notifications carry
the same news and always link back into the app:

| Moment | WhatsApp | Email | Push | In the app |
| --- | --- | --- | --- | --- |
| Payment details created | | ✓ | | ✓ |
| Payment received | ✓ | ✓ | | ✓ |
| Offer from an owner | ✓ | | ✓ | ✓ |
| Truck confirmed | ✓ | ✓ | | ✓ |
| Truck at pickup, loading code | ✓ | | | ✓ |
| Loaded | ✓ | | | ✓ |
| On the road | ✓ | | | ✓ |
| Delivery code sent to receiver | ✓ | | | ✓ |
| Arrived | ✓ | | | ✓ |
| Delivered | ✓ | ✓ | | ✓ |
| Problem reported or decided | ✓ | ✓ | | ✓ |
| No truck after 24 hours | ✓ | ✓ | | ✓ |
| Waiting charge | ✓ | ✓ | | ✓ |

Push permission is asked only when it's useful, the first time the shipper pays: "Get told the
moment a truck accepts?" with **Turn on** and **Not now**.

---

## Part 12. Help and support

### S-24 Help

**Purpose.** Answer common questions without waiting for a person.

**How they get here.** More → Help (phone), Help in the sidebar (desktop), and **Get help** links
across the app.

**Layout.**
1. Search box: "How can we help?"
2. Topic tiles: Booking · Paying and refunds · During a trip · Codes and delivery · Problems and
   claims · Your account.
3. **Popular questions** (five or six), such as "What happens if no truck accepts?", "Who gets the
   delivery code?", "When is my money released to the owner?", "How do I get a refund?".
4. **Talk to us** card at the bottom: **Chat with support** (→ S-25), and the Freight Africa WhatsApp
   number shown as text with a **Copy** button.

Articles open in the same view, with **Did this help? Yes / No** at the end and related questions.
Desktop shows topics on the left and the article on the right.

### S-25 Support conversation

**Purpose.** Reach a person, with the context already attached.

**Layout.** Like the trip chat (S-11). A header shows the topic and, if opened from a trip, the trip
reference as a chip. The first message is prefilled from the context ("About trip FA-7K3Q9"). Replies
from Freight Africa staff arrive here and on WhatsApp. A line under the header sets expectations:
"We usually reply within 30 minutes, 7 am to 9 pm." Past conversations are listed on S-24 under
**Your conversations**.

---

## Part 13. More, saved items, team and settings

### S-22 More (phone only)

**Purpose.** Reach everything that isn't used every day.

**Layout.** A simple list with icons: **Saved places** · **Saved receivers** · **Team** (owners and
admins) · **Business profile** (owners and admins) · **Statements** · **Help** · **Install the app**
(only if not installed) · **Settings** · **Switch account** (only if they belong to more than one
business or role). At the bottom: app version and **Sign out**. On desktop these items live in the
sidebar and the account menu instead.

### S-18 Saved places

**Purpose.** Manage the places used for pickups and drop-offs.

**Layout.** A list with each place's label, address, landmark and times used. **Add a place** opens
the place picker (S-02a). Tapping a place opens it to edit the label, landmark and default contact,
with **Delete place** (confirm sheet). Desktop shows a table with a map preview on hover.

### S-19 Saved receivers

**Purpose.** Manage the people who usually receive or load goods.

**Layout.** A list with name, WhatsApp number and last used date. **Add a receiver** opens a sheet
with name, WhatsApp number and email. Tapping one opens it for editing, with **Delete**.

### S-20 Team

**Purpose.** Let a business share the work safely.

**Layout.**
1. Members list: name, phone or email, a role chip and a status (Invited, Active).
2. **Invite someone** button.
3. Tapping a member opens a sheet to **Change role** or **Remove from team**. The last owner can't be
   removed.

The **Invite someone** sheet has the person's phone or email, then role chips, each with one line of
explanation (Admin: everything except removing the owner · Booker: books and follows trips · Finance:
pays and downloads statements · Viewer: sees trips only), and **Send invite**. The invite arrives by
WhatsApp or email and opens A-07.

### S-21 Business profile

**Purpose.** Keep the business details that appear on receipts and to truck owners.

**Layout.** Business name, logo, registration number (optional), address, the email for receipts.
Below, read-only: the business's rating from owners (shown after 3 ratings), and **This month**:
trips so far and the current fee ("You're at 2% this month. 9 more trips to reach 1.5%.").

### A-08 Install the app (shared, offered once)

**Purpose.** Let the shipper put the app on their home screen or desktop for quicker access and
notifications.

**When it appears.** Once, after the first payment, as a sheet: "Add Freight Africa to your home
screen for quicker access and trip alerts." The steps shown depend on the device: on Android Chrome
and desktop Chrome or Edge a **Install** button; on iPhone Safari a three-step picture guide (Share,
then Add to Home Screen); on iPhone in another browser "Open this page in Safari to install," with a
copy-link button. **Not now** dismisses it; it stays available under More → Install the app.

### A-09 Account switcher (shared)

**Purpose.** Move between businesses or roles without signing out (for example, a trader who also
owns a truck).

**Layout.** A sheet (phone) or dropdown (desktop) listing each business and role with its logo or
initials: "Adaeze Foods · Shipper · Owner", "Ada Haulage · Truck owner". The current one has a
check. Tapping another switches the whole app to that business's screens. At the bottom: **Add a
business**, **Settings** and **Sign out**.

### A-10 Settings (shared, shipper view)

**Purpose.** Control the personal parts of the account.

**Sections, in order.**

| Section | What's there | What can be done |
| --- | --- | --- |
| Profile | Photo, name, phone, email | Change photo; change or add phone or email (confirmed by a code) |
| Notifications | Groups: Trip updates, Offers, Payments, Problems, News and offers. Each with WhatsApp, email and push switches | Turn channels on or off. Trip codes, payments and problems can't be turned off; their switches are shown locked with "Needed to protect your trips" |
| Install | Whether the app is installed on this device | Install steps (A-08) |
| Security | Devices signed in, with last active time | **Sign out of this device**, **Sign out everywhere** |
| Privacy | Consents with the date given; **Download my data** (sent by email within 7 days) | Withdraw news and offers; **Delete my account** (a confirm sheet explains that trip and payment records are kept as the law requires) |
| Help | Link to Help (S-24) and the support WhatsApp number with **Copy** | |
| About | App version, Terms, Privacy | |

The app is in English only at launch (D017), so there is no language setting.

---

## Part 14. Behaviour that applies everywhere

- **Live updates.** Trip screens, offers and payments update by themselves. The shipper never
  needs to refresh.
- **Deep links.** Every WhatsApp message and email opens the exact screen. If the shipper isn't
  signed in, signing in takes them back to that screen.
- **Offline.** The last viewed trips and Home stay readable offline. Booking and paying need a
  connection; the main button says "You're offline" instead of failing silently.
- **Errors.** Every error says what happened and what to do next, in plain words. No error codes on
  screen.
- **Confirmations.** Anything that cancels, deletes or moves money asks once, in a sheet that states
  the consequence and the amount.
- **Accessibility.** Text can grow to twice its size without breaking layouts; every button and icon
  has a label for screen readers; status is never shown by colour alone (each chip has a word); all
  actions work by keyboard on desktop, with a visible focus outline.
- **Speed on cheap phones.** Screens show their structure immediately with placeholder blocks; maps
  load only when visible; photos are shrunk on the phone before upload.
- **Words.** Plain words throughout: sender and receiver, delivery note, return load, waiting charge,
  money held safely. Buttons say what will happen ("Pay ₦1,030,000", "Send report").
