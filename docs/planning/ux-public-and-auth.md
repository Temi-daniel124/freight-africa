# ux-public-and-auth.md, Freight Africa

**Annex to `docs/PLATFORM-SCOPE.md` (authority 6 of 14).** Visual rules come from `DESIGN_SYSTEM.md`. Follows `ux-conventions.md`. Covers the public website, sign-in, sign-up,
onboarding entry, invites, install prompt, account switcher, settings and notifications.

---

## Part 1. Public website (F-105 to F-110)

Server-rendered Next.js pages, fast on 3G, indexed by search engines. Shared header: logo (primary
horizontal), links **Send goods**, **Own trucks**, **Agents**, **Pricing**, **Help**, then **Sign
in** (text) and **Get started** (button). Phone: logo, **Get started**, menu icon. Shared footer:
routes list, company links, legal links, WhatsApp support number as selectable
text with a copy button, social links.

### P-01 Home
**Route** `/` · **Who** everyone

**Layout**
1. Headline: "Move full truckloads across Nigeria. Pay once, money held safely until delivery."
2. Quote box: From (city picker), To (city picker), What (goods chips, top 6) → **See price**.
3. Three proof points with icons: Verified truck owners · Money held until delivery · Track every
   kilometre.
4. How it works in 4 steps (Book · Truck accepts · Track · Confirm with a code).
5. Our routes: four corridor cards with typical time on the road and "from ₦X" (from lane prices).
6. For truck owners band: "Get paid within minutes of delivery" → **Join as a truck owner**.
7. FAQ (6 questions, FAQPage structured data).

| Element | Does | Goes to |
| --- | --- | --- |
| See price | Computes a guest quote (SYSTEM-LOGIC §3.1) | P-01 quote sheet: price, truck type, **Book this** |
| Book this | Saves the quote in local storage | A-01 sign in, then S-02 booking prefilled |
| Corridor card | | P-08 route page |
| Join as a truck owner | | A-01 with role preset `owner` |
| Get started | | A-01 |

**States** Off-corridor route in the quote → "We don't cover this route yet" + **Tell me when you
do** (→ P-17 waitlist prefilled).

### P-02 For shippers · `/shippers`
Benefits, how escrow works (the escrow diagram from the blueprint, simplified), what each fee buys,
example price on a corridor, FAQ. Main button **Get a price** → P-01 quote box anchor.

### P-03 For truck owners · `/truck-owners`
Benefits (advance on loading, balance in minutes, return loads, no chasing payment), what's needed
to join (ID, truck papers, bank account), commission and launch offer, tiers explained. Main button
**Join as a truck owner** → A-01 role `owner`.

### P-04 For agents · `/agents`
How agents earn (1% for 6 months), rules, example earnings. Main button **Become an agent** → A-01
role `agent`. Hidden when `agents_enabled = false`.

### P-05 How it works · `/how-it-works`
The 7-step trip with the trip flow diagram, the loading and delivery code explained, what happens
when something goes wrong.

### P-06 Pricing · `/pricing`
Fee tables (shipper discounts, owner commission, tiers), launch offers, what is always free,
worked example (₦1,000,000 trip). All numbers read from `fee_rules` and `promotions`.

### P-07 Routes · `/routes`
List of corridor directions with price ranges and time on the road → P-08.

### P-08 Route page · `/routes/{from}-to-{to}` (F-106)
Title "Truck hire from Lagos to Kano". Price range per truck type (from lane prices; from completed
trips once there are 20+), time on the road, cities on the way, truck types available now (count),
quote box prefilled, route-specific FAQ. JSON-LD `Service`. Main button **Get a price for this
route**.

### P-09 City page · `/cities/{city}`
Routes from the city, loading areas, local agents (if enabled), quote box with From prefilled.

### P-10 Safety · `/safety`
Verification, codes, tracking, insured badge, what we do in an emergency, how to report a problem.

### P-11 Help centre · `/help`
Search box, categories (Booking, Payments, Trips, For truck owners, For drivers, Account), top
articles, **Chat with us on WhatsApp** (number shown as text + copy).

### P-12 Help article · `/help/{slug}`
Article, "Did this help?" Yes/No (logged), related articles.

### P-13 Blog · `/blog`, `/blog/{slug}`
Posts from `content_pages`. Article JSON-LD.

### P-14 About · `/about` · P-15 Contact · `/contact`
Contact: company address, phone and email as selectable text with copy buttons, form (name, phone,
topic, message) that creates a `support_threads` row and shows "Thanks. We'll reply on WhatsApp
within one working day."

### P-16 Legal · `/legal/terms`, `/legal/privacy`, `/legal/transporter-agreement`, `/legal/agent-agreement`
Version number and date at the top. Previous versions linked.

### P-17 Waitlist · `/waitlist` (pre-launch only, F-110)
Name, phone, email (optional), I am (sender / truck owner / agent), corridor interest (chips) →
**Join the waitlist** → saves `waitlist_signups`, sends confirmation email and WhatsApp, shows a
thank-you state with a share link.

### P-18 Not found / gone
Plain message, quote box, link home. Returns 404 or 410.

---

## Part 2. Sign-in and onboarding entry (F-01 to F-10)

### W-00 First-visit slides (D045)
**Route** `/welcome` on `app.freight-africa.com` only, first visit (a `fa_seen_intro` flag in local
storage); the public website stays waitlist-only (D036).

Three slides that follow the finger (the picture moves a little slower than the text). **Skip** at the
top right; progress pills at the bottom left; the deep green shaped **Next** button at the bottom right
shows 1, 2, 3 (the number changes with a quick vertical slide), and on the last slide its arrow leads
to W-01. Swipe or tap.
1. "Full truckloads, across Nigeria" / "Book verified trucks on the busiest routes."
2. "Your payment is held safely" / "The truck owner is paid as the trip happens, not before."
3. "Follow every trip live" / "See your goods from loading to delivery."

### W-01 Welcome
The illustration, "Move full truckloads across Nigeria", two small feature tiles (**Easy booking**,
**Payment held safely**) with green icons, a primary **Get started** and a secondary **Sign in**.
Desktop: the illustration fills the left half on a soft surface and the steps sit in a card on the
right (this replaces the deep green sign-in panel). After the slides on a phone's first visit, the
install card may slide up (A-08), never on top of the slides.

### A-01 Get started or sign in (D044)
**Route** `/auth` (query `mode=start|signin`, `next`, `invite`) · **Who** signed out

- **Get started:** email → **Send code** → A-02 → A-11 set a PIN → A-12 two-step (optional) → A-03.
- **Sign in:** email, or phone number for people invited by phone → **Continue** → A-13 enter PIN
  (then the authenticator code when two-step is on; staff always). No email code.
- Google and WhatsApp codes are switched off (`AUTH_GOOGLE`, `AUTH_WHATSAPP` unset) and not shown. No
  wording promises a code by phone or WhatsApp.

Footer: "By continuing you agree to the Terms and Privacy policy" with links.

**Rules** 5 codes per hour per email; 60 an hour per internet address. Invite links pass `invite` so
the role step is skipped.

### A-02 Enter the email code
**Route** `/auth/code` · Six boxes (`inputMode="numeric"`, `autocomplete="one-time-code"`),
auto-advance, paste supported. "Sent to ada@okaforfoods.ng" with **Change**. **Resend code** after 30
seconds, counting down. Wrong code: boxes shake (none with reduced motion), "That code isn't right.
Check the latest email." After 5 wrong tries: "Too many tries. Get a new code."

On success: no PIN yet (new person, forgot PIN, PIN locked) → A-11; otherwise `next` or `/app`.

### A-11 Set your PIN
One screen, entered twice ("Choose a 6-number PIN", then "Enter it again"). Obvious PINs are refused
("Choose a PIN that's harder to guess"). Phones: the keypad is docked to the bottom in a sheet with
28 px top corners; digits 28 px in borderless circular keys at least 72 px tall; the title and six dots
sit centred in the space above; the avatar shows above the title when we know who it is. Desktop: the
same card centred, the physical keyboard works, compact keypad.

### A-12 Add two-step sign-in (optional)
"Add two-step sign-in" with an authenticator app (QR and setup key), then backup codes to save, and
**Not now**. Copy recommends it for truck owners and anyone who handles payments. Staff can't skip it.

### A-13 Enter your PIN
Used for sign-in on a new device (after A-01 Sign in) and to open a locked app (closed or unused for
`app_lock_minutes`, default 15). Same keypad as A-11. Wrong PIN: the dots shake and Android buzzes
(`navigator.vibrate`); "That PIN isn't right. 3 tries left." After 2 wrong tries from one internet
address the bot check is asked for. Five wrong PINs lock PIN sign-in: "PIN sign-in is locked. We've
emailed you." → **Sign in with an email code** → A-02 → A-11. **Forgot PIN?** sits in the bottom-left
key slot: email code, then a new PIN. Phone-only accounts: "Ask your truck owner for a new PIN link."

Every lock and every sign-in on a new device emails "New sign-in on [device], [city]. Not you? Lock
your account"; the link locks the account and signs out every device.

### A-03 What brings you here?
**Route** `/onboarding/role` · **Who** new users without an invite

Two large cards (D043):
- **I send goods**: "Book trucks for your loads" → A-04.
- **I own trucks**: "Find loads and get paid fast" → T-ON-01 (ux-owner.md).

One line below: "Driving for a truck owner? Ask them to invite you." Agents join through a link staff
send them (ux-agent.md); they are not offered here.

Consent checkboxes at the bottom of this step (F-10): Terms and Privacy (required), messages about my
trips (required, explained), Occasional news and offers (optional).

### A-04 Shipper setup (one screen)
**Route** `/onboarding/shipper`

Fields: Your name (prefilled from Google), Sending as: **Myself** / **A business** (chips). Business →
business name, CAC number (optional, "helps large customers trust you"). Phone or email, whichever
wasn't used to sign in (optional, verified later by code).

Main button **Start booking** → creates shipper org (role `owner`) → S-02 booking (prefilled from a
saved guest quote if any) or S-01 home.

### A-05 (reserved for transporter onboarding, see ux-owner.md T-ON-01 to T-ON-08)

### A-06 Agent setup
Agent onboarding is specified in `ux-agent.md` (G-ON-01 to G-ON-05): about you, the agent agreement,
identity check, bank account, install. Agents can invite people before identity and bank are done;
earnings wait until they are.

### A-07 Accept invite
**Route** `/invite/{token}` (team and driver invites) and `/invite/a/{code}` (agent referral)

- **Invited by email:** "Musa Transport invited you to join as a driver." Shows business, inviter,
  role. **Accept and continue** → A-01 Get started with that email (code, PIN) → driver onboarding
  D-ON-01, or the team member lands in the business's shell.
- **Invited by phone** (D044): the link the owner shared from their own WhatsApp is the proof. The
  person confirms their name, sets a PIN (A-11), and their account is created with that phone number.
  Afterwards they sign in with phone number and PIN. A forgotten PIN: their owner or an admin taps
  **Send a new PIN link** on Drivers or Team and shares it the same way.
- Role wording: "as a driver.", "as a booker.", "as an admin.", "as a viewer." (also in the shared
  message).
- Agent referral: "Chinedu (agent) invited you to Freight Africa." **Get started** → A-01 with the
  referral stored. The referral attaches only if a new organisation is created.
- Expired, used or not found: equal-height cards, 32 px padding, content centred: "This invite has
  expired. Ask for a new one." + **Go to home**.

### A-08 Install the app
**Route** `/onboarding/install` · **Who** drivers and truck owners who drive (required step), others
through the install card.

- **Install card (D045):** on a phone's first visit, after the slides (never on top of them), a small
  card slides up from the bottom: app icon, "Install Freight Africa", "Opens faster and works with a
  weak signal", a primary **Install** and a quiet **Not now**. On iPhone, Install shows the three Add
  to Home Screen pictures. Not now hides it for 7 days; it appears 3 times at most. Desktop: a small
  **Install app** item in the sidebar footer.
- The required step detects the platform: Android Chrome native prompt; iPhone Safari "Tap Share,
  then Add to Home Screen" with the three pictures; iPhone not in Safari "Open this page in Safari".
  "Trips need the app installed so tracking and alerts work." Drivers can't start a trip until
  installed or staff waive it.

### A-09 Account switcher (sheet)
Opened from the avatar. "Signed in as" with the email on its own line under it, truncated. Lists every
business the person belongs to with its type and role ("Sender · Owner", "Truck owner · Admin") and a
check mark on the active one. Tap → switches shell and saves `last_active_org_id`. Bottom links:
**Add a business** (→ A-03), **Settings** (→ A-10), **Sign out**.

### A-10 Settings
**Route** `/app/settings` (inside any shell)

| Section | Contents | Actions |
| --- | --- | --- |
| Profile | Picture, name (locked after KYC, "Contact support to change"), phone, email | **Choose your picture** (3D faces, D045); add or change phone/email with code |
| Driving | Truck owners: **I drive my own truck** switch (adds the Drive tab, D043) | Toggle |
| Notifications | Per event group: WhatsApp, email, push toggles; safety and money groups locked on | Toggle |
| Install | Install status and steps | → A-08 |
| Security | PIN, two-step sign-in, app lock after (minutes), signed-in devices with last active time | **Change PIN** (needs a sign-in in the last 15 minutes), **Add two-step sign-in** / **Turn off**, **Sign out of this device**, **Sign out everywhere** |
| Privacy | Download my data (request, emailed within 7 days), consents with dates | **Withdraw marketing consent**, **Delete my account** (confirm sheet explains what is kept by law, e.g. trip and money records) |
| Help | → P-11, WhatsApp support number with copy |
| About | App version, Terms, Privacy | |

### N-01 Notification centre
**Route** `/app/notifications` · List grouped Today / Earlier; each item: icon, one line, time, unread
dot; tap → the linked screen. **Mark all as read**. Empty: "You're all caught up."
