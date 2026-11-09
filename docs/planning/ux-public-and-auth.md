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

### A-01 Sign in or sign up
**Route** `/auth` (query `role`, `next`, `invite`) · **Who** signed out

**Layout** Logo (stacked), "Welcome to Freight Africa", three options stacked:
1. **Continue with Google** (main button style but white with border, Google mark per Google rules).
2. Phone number input → **Send code on WhatsApp**.
3. Text link "Use email instead" → swaps phone input for email input → **Send code by email**.

Footer: "By continuing you agree to the Terms and Privacy policy" with links.

| Element | Does | Goes to |
| --- | --- | --- |
| Continue with Google | Supabase OAuth | Existing user → `next` or `/app`; new user → A-03 |
| Send code on WhatsApp | Validates number; sends 6-digit code via authentication template; SMS if WhatsApp fails | A-02 |
| Send code by email | Sends code via Resend | A-02 |

**Rules** 5 codes per hour per number or email. Invite links pass `invite` so the role step is
skipped.

### A-02 Enter code
**Route** `/auth/code` · Six boxes, auto-advance, paste supported, autofill from SMS where the phone
offers it. "Sent to +234 803 123 4567 on WhatsApp" with **Change**. **Resend code** enabled after 30
seconds, counting down. Wrong code: boxes shake (no shake if reduced motion), "That code isn't right.
Check the latest message." After 5 wrong tries: "Too many tries. Get a new code."

On success: existing user → `next` or `/app`; new user → A-03; invite → A-07.

### A-03 What brings you here?
**Route** `/onboarding/role` · **Who** new users without an invite

Three large cards with illustrations:
- **I send goods**: "Book trucks for your loads" → A-04.
- **I own trucks**: "Find loads and get paid fast" → T-ON-01 (ux-owner.md).
- **I'm an agent**: "Earn by bringing truck owners and senders" → G-ON-01 in ux-agent.md (hidden if agents disabled).

Text below: "Are you a driver? Ask the truck owner to add you. You'll get a WhatsApp invite."

Consent checkboxes at the bottom of this step (F-10): Terms and Privacy (required), WhatsApp
messages about my trips (required, explained), Occasional news and offers (optional).

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

- Team/driver invite: "Musa Transport invited you to join as a driver." Shows org name, inviter,
  role. **Accept and continue** → A-01 if signed out → then driver onboarding D-ON-01 or team member
  lands in the org's shell.
- Agent referral: "Chinedu (agent) invited you to Freight Africa." **Get started** → A-01 with the
  referral stored → A-03. The referral attaches only if a new organisation is created.
- Expired or used: "This invite has expired. Ask for a new one." + **Go to home**.

### A-08 Install the app
**Route** `/onboarding/install` · **Who** drivers and owner-drivers (required), others (offered once)

Detects platform and shows the right steps with pictures:
- Android Chrome: **Install Freight Africa** button (native install prompt).
- iPhone Safari: "Tap Share, then Add to Home Screen", with a looping 3-frame illustration.
- iPhone not in Safari: "Open this page in Safari to install" + copy link button.

Explains why: "Trips need the app installed so tracking and alerts work."
**I've installed it** → checks `display-mode: standalone` next launch; if opened standalone, marks
done. Drivers can't start a trip until installed or staff waive it.

### A-09 Account switcher (sheet)
Opened from the org avatar. Lists every org and role the person has: avatar, name, role ("Shipper ·
Admin", "Truck owner", "Agent"). Tap → switches shell and saves `last_active_org_id`. Bottom links:
**Add a business** (→ A-03), **Settings** (→ A-10), **Sign out**.

### A-10 Settings
**Route** `/app/settings` (inside any shell)

| Section | Contents | Actions |
| --- | --- | --- |
| Profile | Photo, name (locked after KYC, "Contact support to change"), phone, email | Edit photo; add or change phone/email with code |
| Notifications | Per event group: WhatsApp, email, push toggles; safety and money groups locked on | Toggle |
| Install | Install status and steps | → A-08 |
| Security | Signed-in devices with last active time | **Sign out of this device**, **Sign out everywhere** |
| Privacy | Download my data (request, emailed within 7 days), consents with dates | **Withdraw marketing consent**, **Delete my account** (confirm sheet explains what is kept by law, e.g. trip and money records) |
| Help | → P-11, WhatsApp support number with copy |
| About | App version, Terms, Privacy | |

### N-01 Notification centre
**Route** `/app/notifications` · List grouped Today / Earlier; each item: icon, one line, time, unread
dot; tap → the linked screen. **Mark all as read**. Empty: "You're all caught up."
