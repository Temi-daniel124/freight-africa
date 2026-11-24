# ux-agent.md, Freight Africa

**Annex to `docs/PLATFORM-SCOPE.md` (authority 6 of 14).** Visual rules come from `DESIGN_SYSTEM.md`. Follows `ux-conventions.md`, and defers to `DECISIONS.md` (D012),
`DATA-MODEL.md`, `SYSTEM-LOGIC.md` (§16) and `PLATFORM-SCOPE.md` (F-75 to F-78). This is the
screen-by-screen wireframe description and user journey for the **agent**: a person who already
connects senders and truck owners, at a truck park, a market or through their own network, and who
earns a share from Freight Africa for every completed trip by people they bring. It covers phones
and desktops and contains no drawings.

The whole role is switched off when `settings.agents_enabled = false`: the role card on sign-up, the
public agents page and every screen here disappear, and existing agents see "The agent programme is
paused. Earnings already made will still be paid."

Screen IDs must not be renumbered.


**D043 (24 Nov 2026):** agents are not offered at sign-up. An agent joins through a link staff send
them; their data and rules stay, `agents_enabled` stays the master switch, and Phase 6 builds these
screens.

---

## Part 0. How to read this document

Each screen is described with the same headings: **Purpose**, **How they get here**, **Phone
layout**, **Desktop layout**, **Interactions**, **States**, and **Why it works**. "Sheet" means a
panel that slides up from the bottom on a phone and a centred dialog on desktop. "Toast" means a
short message that disappears after 4 seconds.

---

## Part 1. Who the agent is and how the app is shaped for them

### 1.1 A typical agent

Chinedu has worked at the Ojota truck park in Lagos for nine years. Traders call him when they need a
truck to the east or the north; he knows forty truck owners by name and which of them are reliable.
He takes a cut from each deal and is paid in cash. He has a smartphone and lives on WhatsApp. He has
heard of apps like this before and suspects they want to cut him out.

### 1.2 What the agent wants

1. **Earn from the people he already knows**, without losing them to the app.
2. **Bring people in with almost no effort**: a link or a QR code, not a form for each person.
3. **See who signed up, who got stuck, and who is earning him money.**
4. **Be paid reliably and see exactly why.**
5. **Keep helping his traders**, including booking for those who prefer to call him.
6. **Stay in good standing**, so his earnings aren't taken away.

### 1.3 The deal, in words the agent sees on many screens

"You earn **1% of the trip price** on every completed trip by a truck owner or sender you bring, for
their **first 6 months** on Freight Africa. It's paid by Freight Africa, so they never pay more because
of you. They sign up and check their own ID. You're paid when each trip closes."

Rules shown alongside it:
- Only for new businesses joining through your link. People already on Freight Africa don't count.
- Only for trips that finish without an upheld problem.
- You can't bring your own business.
- Asking drivers or senders for extra money is not allowed.

(Rate and duration come from `settings.agent_share_bps` and `agent_share_months`; screens read them,
never hard-code them.)

### 1.4 What the agent can and can't see

- Can see: the names and status of people they brought, how many trips each has done, and their own
  share from each trip.
- Can't see: the owners' payouts, senders' payments, freight prices, codes, or the phone numbers of
  drivers, receivers and pickup contacts (D018). They already have the numbers of the people they
  invited, because they typed them in or shared the link with them.

### 1.5 Mobile navigation: five bottom tabs

| Tab | Icon and label | What it represents | Badge |
| --- | --- | --- | --- |
| **Home** | House, "Home" | Earnings at a glance, people who need a nudge, recent activity | Red dot when something needs action |
| **People** | Two people, "People" | Everyone I've brought: owners and senders, their status and what they've earned me | Count of people stuck in sign-up |
| **Invite** | Large green circle with a plus, raised in the centre, "Invite" | Bring someone new: share a link, show a QR code, or invite by phone number. The agent's main action | None |
| **Earnings** | Naira note, "Earnings" | Shares earned, waiting, paid, voided; payouts; statements; bank account | Amber dot if a payout failed |
| **Me** | Person, "Me" | Profile, identity, agreement, notifications, help, settings | Red dot if identity or bank isn't done |

### 1.6 Desktop navigation

**Left sidebar:** logo; **Invite someone** button (green, full width); **Home**, **People**,
**Earnings**, **Bookings for senders**, **Help**; **Settings** and the agent's name at the bottom.

**Top bar:** page title; search (a person's name, business or phone); notification bell; account
switcher (useful when the agent is also a shipper or truck owner).

Desktop suits agents who manage many people: People and Earnings become sortable tables, and invite
links can be copied in bulk.

### 1.7 The complete journey at a glance

1. Arrives from the website's agents page, a field agent, or a friend → **signs in** and chooses **I'm
   an agent** (A-01 to A-03).
2. **Sets up**: about you, the agent agreement, identity check, bank account, install (G-ON-01 to
   G-ON-05).
3. Lands on **Home** with an invite ready to share (G-01).
4. **Invites** owners and senders by WhatsApp, QR code or phone number (G-02, G-02a).
5. **Follows people** as they sign up, nudges those who get stuck (G-03, G-04).
6. **Books for a sender** who prefers to call (G-06).
7. **Earns** as trips close, and is paid to their bank account (G-05, G-08).
8. **Manages** profile, notifications and help (G-07, N-01, G-09, G-10).

---

## Part 2. Getting in

### A-01 and A-02 Sign in and code (shared)

As for everyone: **Continue with Google**, or a phone number with **Send code on WhatsApp** (shown
first for agents), then the six-digit code. Arriving from the website's **Become an agent** button
presets the role.

### A-03 What brings you here? (shared)

The agent taps **I'm an agent** ("Earn by bringing truck owners and senders"), ticks the required
agreements and taps **Continue** → G-ON-01.

---

## Part 3. Setting up

A checklist with progress ("Step 2 of 5"), saved as it goes. The agent can **start inviting as soon
as G-ON-02 is done**; identity and bank account are needed only before money can be paid. Until then,
Home shows a **Finish setup to get paid** card, and earnings collect as "Waiting for your setup".

### G-ON-01 About you (replaces the summary in A-06)

**Purpose.** Learn where the agent works, to show them relevant loads and route pages and to help
Freight Africa's field team.

**Phone layout.**
1. "Tell us about your work."
2. **Your name** (from Google if used).
3. **City** (picker).
4. **Routes you work on**: chips for the four corridors, several allowed.
5. **Where you work**: chips Truck park · Market · Transport company · My own network · Other. If Truck
   park or Market: the park or market name (search with suggestions from Freight Africa's list).
6. **Roughly how many truck owners do you know?** chips 1 to 10 · 11 to 50 · More than 50. Same for
   senders. (Used only to plan support; never shown to anyone.)
7. Main button **Next**.

### G-ON-02 How you earn (agreement)

**Purpose.** Make the deal and the rules completely clear before the agent invites anyone, because
trust is the whole relationship.

**Phone layout.**
1. "How you earn" and the deal sentence from 1.3, in larger type.
2. A worked example: "A trader you bring sends a load to Kano for ₦1,000,000. When it's delivered, you
   earn ₦10,000. If a truck owner you brought carries it too, you earn on both sides."
3. The four rules from 1.3, each with a short icon.
4. **What you can do**: Invite truck owners and senders · Book loads for senders you brought · See
   their progress and your earnings.
5. A link **Read the full agent agreement** (opens the legal page in a sheet).
6. Checkbox **I agree to the agent agreement** (records the version).
7. Main button **Agree and continue**.

**Why it works.** Agents fear being cut out or underpaid later. Stating the deal, an example and the
rules on one screen before any work is done answers that fear directly.

### G-ON-03 Identity check

**Purpose.** Prove who the agent is before paying them.

The same Didit check as owners (ID photo, selfie, NIN with the "Is this right?" confirmation, D006).
Explained as: "We need this before we can pay you. It takes about 3 minutes." The agent can **Do this
later** and keep inviting. States are the same as for owners (approved, being checked, declined with
reason and **Try again**).

### G-ON-04 Bank account

**Purpose.** Set where earnings go.

The same form as owners: bank, 10-digit account number, the account name looked up automatically and
matched to the ID name, and the note "For your safety, a new bank account can receive payments 24
hours after it's added." The account is held on the agent's payout account behind the scenes; the
agent never sees that detail. **Do this later** is allowed.

### G-ON-05 Install and ready

**Purpose.** Put the app on the phone and send the agent to work.

The install steps (recommended, not required), then a ready screen: a checklist with each item Done,
Being checked or Not yet; "You can start inviting now"; main button **Invite your first person** →
G-02. Link **Go to Home**.

---

## Part 4. Home

### G-01 Home

**Purpose.** At a glance: what I've earned, who needs a nudge, and the quickest way to bring someone
new.

**Phone layout.**
1. **Top bar**: initials, "Home", notification bell.
2. **Finish setup to get paid** card, while identity or bank isn't done: "You have ₦30,000 waiting.
   Finish your ID check to get it," with **Continue**.
3. **Earnings strip**: three figures, **This month** · **Waiting to be paid** · **All time**. Tapping
   opens G-05.
4. **Your invite link** card: the short link (freight-africa.com/i/CHN4K7Q2), with three large buttons
   in a row: **Share on WhatsApp**, **Copy link**, **Show QR code**.
5. **Needs a nudge**: people who started signing up and stopped, each with name, where they stopped
   ("Stopped at bank account, 3 days ago") and **Send reminder**. Also owners whose truck papers were
   rejected ("Musa's licence photo needs redoing") with **Send reminder**.
6. **Recent activity**: a short feed: "Musa Transport finished a trip. You earned ₦10,000." · "Adaeze
   Foods signed up." · "Bello Haulage's truck was approved." Each line opens the person (G-04).
7. **People so far**: "12 owners · 7 senders · 9 active" with **See all** → G-03.
8. Bottom tabs.

**First visit (nobody invited yet).**
1. Top bar.
2. A friendly illustration of people shaking hands.
3. "Bring your first truck owner or sender."
4. The worked example in one line: "One ₦1,000,000 trip earns you ₦10,000."
5. The invite link card with the three buttons.
6. Link **How it works** → G-ON-02 content.

**Desktop layout.** Earnings cards across the top; Needs a nudge and Recent activity in the main
column; the invite link card (with a larger QR code) and the People summary in the right panel.

**Interactions.**
- **Share on WhatsApp** opens the phone's share sheet with a ready message (see G-02).
- **Copy link** copies it and shows "Copied".
- **Show QR code** → G-02a.
- **Send reminder** sends a WhatsApp reminder from Freight Africa naming the agent (see G-04 limits) and
  shows "Reminder sent."

**States.** Agent suspended: a red card at the top, "Your agent account is paused for review. You can't
invite people right now. Earnings already made are safe," with **Contact support**. Programme paused:
as described at the top of this document.

---

## Part 5. Inviting

### G-02 Invite

**Purpose.** Bring someone new in the way that suits the moment: a WhatsApp message, a QR code face to
face, or a phone number.

**How they get here.** The centre **Invite** tab; **Invite someone** on desktop; buttons on Home.

**Phone layout.**
1. "Who are you inviting?" Two large chips: **A truck owner** and **A sender**. The choice changes the
   message, the landing page and what the person sees first.
2. **Share on WhatsApp** (the largest button).
3. **Show QR code** (for someone standing in front of you).
4. **Invite by phone number**: name and WhatsApp number fields, then **Send invite**.
5. **Copy link**.
6. A collapsed **The rules** section with the four rules from 1.3.

**The prepared messages** (editable before sending in the share sheet):
- Owner: "Hello, I'm using Freight Africa to find loads for trucks. Loads are paid before you move, you
  get an advance when loaded and the rest minutes after delivery. Join here: [link] (Chinedu)"
- Sender: "Hello, I'm using Freight Africa to book trucks. You pay once, the money is held safely until
  your goods arrive, and you can track the truck. Join here: [link] (Chinedu)"

**Desktop layout.** The two chips at the top, then three columns: WhatsApp message (with **Copy
message**), QR code (with **Download image**), and invite by phone number. A fourth option on desktop:
**Invite several people**, a box to paste up to 20 lines of "name, phone number", each sent as its own
invite.

**Interactions.**
- **Invite by phone number** checks the number is valid and not already on Freight Africa. If it is:
  "This number is already on Freight Africa. Only new people count, so you won't earn from them."
  Otherwise Freight Africa sends a WhatsApp template naming the agent, and the person appears in People
  with status **Invited**.
- Each invite link carries the agent's code and the kind (owner or sender), so the person lands on the
  right page (the owner or sender version of the welcome) and the referral is recorded only if they
  create a new business.

**States.** Identity not done: inviting still works; a small note says "Finish your ID check to get
paid." Agent suspended: the screen shows the suspension message instead.

### G-02a QR code (full screen)

**Purpose.** Let someone scan and join on the spot, at the park or the market.

**Layout.** A large QR code on a white background with the Freight Africa logo in the middle and the
agent's name under it ("Invited by Chinedu"); the chips **Truck owner** / **Sender** above it to switch
which page it opens; the screen brightness is raised while it's open. Buttons **Save as image** (a
card-sized image with the QR code, the logo, one line "Scan to join Freight Africa" and the agent's
name, suitable for printing as a sticker or poster) and **Done**.

**Why it works.** Most of an agent's work happens face to face. A QR code turns a conversation into a
sign-up in seconds, and the printed card keeps working when the agent isn't there.

---

## Part 6. People

### G-03 People

**Purpose.** See everyone the agent has brought, where each one is, and who earns them money.

**Phone layout.**
1. Top bar "People" with a search icon.
2. Tabs: **Owners** · **Senders**.
3. Filter chips: All · Signing up · Active · Referral ended · Suspended.
4. A list, one row per person: name or business, the date they joined, a status chip, trips completed,
   and "You earned ₦40,000". People stuck in sign-up show where they stopped in amber.
5. Bottom tabs.

**Statuses, in plain words.**

| Status | Means |
| --- | --- |
| Invited | Invite sent, not opened or not signed up yet |
| Signing up | Started, not finished; shows the step ("ID check", "Bank account", "First truck") |
| Being checked | Waiting for Freight Africa to approve ID or truck |
| Active | Can work; earns you a share on each clean trip |
| Referral ended | Past their 6 months; they still use Freight Africa but you no longer earn |
| Suspended | Their account is paused by Freight Africa |
| Not counted | They were already on Freight Africa, or the referral was removed (with the reason) |

**Desktop layout.** A table: Name · Kind · Joined · Status · Trips · You earned · Referral ends. Columns
sort; a checkbox per row allows **Send reminder to selected** for people stuck in sign-up.

**Interactions.** A row → G-04.

**Empty states.** "No owners yet. Invite one from the Invite tab." with **Invite a truck owner**; the
same for senders.

### G-04 Person detail

**Purpose.** Help one person get going, and see what they've earned the agent.

**Phone layout.**
1. Name or business, kind (Truck owner or Sender), joined date, and **Referral ends 8 May 2027**.
2. **Getting started** checklist, which differs by kind:
   - Owner: Signed up · ID checked · Bank account · First truck approved · First trip.
   - Sender: Signed up · First booking paid · First trip delivered.
   Each item Done, In progress, or Not yet.
3. **Send a reminder** button, active when they're stuck. It sends a WhatsApp message from Freight
   Africa with a link to the step: "Hello Musa, Chinedu asked us to remind you: your truck needs one
   more photo. Finish here: [link]."
4. **Trips**: each completed trip with date, route, and **Your share ₦10,000** with its status (Waiting,
   Paid, Void with reason). No freight price or the person's own earnings or payments are shown.
5. Senders only: **Book a load for Adaeze** → G-06.
6. **Call** and **WhatsApp** buttons with the person's number (the agent invited them, so they already
   have it).

**Rules.** Reminders are limited to one per person per day and three in total for each sign-up step, to
avoid spam.

**Desktop layout.** Checklist and actions on the left; trips table on the right.

---

## Part 7. Booking for a sender

### G-06 Book for a sender

**Purpose.** Let the agent keep serving traders who prefer to call him, while the trader stays in
control of the payment.

**How they get here.** **Book a load for Adaeze** on G-04; **Bookings for senders** on desktop, then
**New booking**.

**The flow.** The shipper booking flow, step by step, exactly as in `ux-shipper.md` (S-02 Where, S-03
What, S-04 When and who, S-05 Price), with a banner at the top of every step: "Booking for Adaeze
Foods. They'll check and pay." Only senders the agent brought can be chosen.

**The last step differs.**
1. The summary and price as the sender will see them.
2. Main button **Send to Adaeze to check and pay**.
3. Under it: "Adaeze gets a WhatsApp message with a link. Nothing is booked until she pays."

**What the sender sees.** A WhatsApp message, "Chinedu prepared a booking for you: Lagos → Kano, Tue
12 Nov. Check and pay: [link]." The link opens S-05 in the sender's own account, where she can edit
anything and pay, or decline.

**What the agent sees afterwards.** In **Bookings for senders** (a list in G-04 and on desktop): each
booking with its status: **Waiting for Adaeze** · **Paid, finding a truck** · **On the road** ·
**Delivered** · **Declined by Adaeze** · **Expired** (not paid within 7 days). The agent sees the
progress, but not the delivery code, the driver's number or the payment details.

**Why it works.** The agent keeps the relationship and the trader keeps the decision and the money.
Freight Africa never takes payment from the agent on someone else's behalf.

---

## Part 8. Earnings

### G-05 Earnings

**Purpose.** Show every share earned, waiting, paid and voided, and where the money went.

**Phone layout.**
1. Top bar "Earnings".
2. Totals: **This month** · **Waiting** · **Paid all time**. If setup isn't done: an amber line "₦30,000
   is waiting for your ID check and bank account," with **Finish setup**.
3. Tabs: **Shares** · **Payments** · **Statements**.
   - **Shares**: one row per trip: date, the person's name, route, **₦10,000**, status chip (Waiting
     for trip to finish, Paid, Void). Void rows give the reason ("A problem on this trip was upheld").
   - **Payments**: each transfer to the agent's bank: date, amount, the trips it covers, status (Sent,
     Paid, Failed).
   - **Statements**: month picker, the month's summary, **Download PDF** and **Download spreadsheet**.
4. **Bank account** card: bank, account ending 1234, name, status, and **Change bank account** (with
   the 24-hour safety wait explained).

**Desktop layout.** Totals as cards; shares and payments as tables with filters (month, person,
status); statements and bank account in the right panel.

**Interactions.** A share row → G-08. A payment row → its detail (amount, timeline, bank reference,
failure reason and next step, like the owner's payout detail).

**When agents are paid.** A share becomes **Paid** when the trip closes: it's sent with the trip's
final payment, usually within minutes of delivery. If the agent's bank account isn't ready, shares
wait and are sent once it is.

### G-08 Share detail

**Purpose.** Explain one share.

**Layout.** The amount; the person it came from and whether they were the sender or the truck owner on
that trip; the trip reference, route and delivery date; the status timeline (Earned · Sent · Paid);
and, for a void share, the reason in plain words. No freight price, codes or other party details.

---

## Part 9. Notifications

### N-01 Notification centre (shared)

The same list as for everyone, opened from the bell; each item opens its screen.

### What an agent is told, and where

| Moment | WhatsApp | Push | In the app |
| --- | --- | --- | --- |
| Someone signed up with your link | ✓ | ✓ | ✓ |
| Someone you brought is approved and can work | | ✓ | ✓ |
| Someone stopped signing up for 2 days | | ✓ | ✓ (Needs a nudge) |
| First trip by someone you brought | ✓ | ✓ | ✓ |
| You earned a share | | ✓ | ✓ |
| Payment sent to your bank | ✓ | | ✓ |
| Payment failed | ✓ | | ✓ |
| A sender paid or declined a booking you prepared | ✓ | ✓ | ✓ |
| A referral is ending in 30 days | | | ✓ |
| A share was voided | | ✓ | ✓ |
| Your ID or bank account approved, or needs attention | ✓ | | ✓ |
| Your agent account paused or restored | ✓ | | ✓ |

Agents can turn off the "You earned a share" pushes if they get many; payment and account messages
stay on.

---

## Part 10. Help and support

### G-09 Help

**Purpose.** Answer agent questions quickly.

**Layout.** A search box; topics: **How you earn** · **Inviting people** · **Helping people sign up** ·
**Booking for senders** · **Getting paid** · **Rules and your account**; popular questions such as "Why
didn't I earn from someone I invited?", "When do I get paid?", "Can I invite someone who already uses
Freight Africa?", "What if a trader wants me to pay for them?". A **Talk to us** card with **Chat with
support** (G-10) and the support WhatsApp number with **Copy**.

### G-10 Support conversation

The shared support conversation, with the agent's people available to attach ("About Musa Transport").
"We usually reply within 30 minutes, 7 am to 9 pm."

---

## Part 11. Me and settings

### G-07 Me

**Purpose.** The agent's own details and account.

**Phone layout, as sections.**

| Section | What's there | What can be done |
| --- | --- | --- |
| Profile | Photo, name (from the ID once checked), phone, email | Change photo; change phone or email with a code |
| My work | City, routes, where you work | Edit |
| Identity | Status of the ID check | **Start** or **Try again** if needed |
| Bank account | Shortcut to the bank card in Earnings | |
| My invite code | The code and link (read only) | **Copy**, **Show QR code** |
| Agent agreement | The version agreed and the date | **Read** |
| Notifications | Groups: People, Earnings, Bookings, Account; WhatsApp and push switches | Turn optional ones off |
| Install | Whether the app is installed | Install steps |
| Help | G-09 | |
| Settings | Devices, privacy, download my data, delete account (A-10) | |
| Switch account | If the agent is also a sender or truck owner | Opens A-09 |
| Sign out | | |

**Desktop layout.** The same sections as a settings page with a left list of sections.

**Leaving the programme.** Under Settings: **Stop being an agent** (confirm sheet: "You'll stop earning
from new trips. Shares already earned will still be paid."). The account and earnings history stay.

---

## Part 12. Behaviour that applies everywhere

- **Inviting is never more than one tap away**: the centre Invite tab on phones, the sidebar button on
  desktop, the link card on Home.
- **No access to other people's money or trips.** The agent sees status, trip counts and their own
  shares only.
- **Clear about money.** Every share shows its trip and status; every void shows a reason.
- **No spam.** Reminders are limited, and every reminder is sent by Freight Africa's WhatsApp account
  with the agent's name, so recipients trust it.
- **Offline.** Home, People and Earnings stay readable offline; inviting by phone number and reminders
  wait and send when back online; the QR code works offline.
- **Accessibility.** Text can grow to twice its size; every control is labelled; statuses always have
  words.
- **Plain words.** Invite, people, sign up, share, paid, waiting, reminder.
