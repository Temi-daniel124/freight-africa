# Agent mockups (v1, for review)

These are all the agent screens from `ux-agent.md`, phone first, with desktop versions for agents who manage many people. When the founder approves the screens, build them to match exactly.

- Live canvas: https://claude.ai/artifact/4oS9AxjhMN1rm9XYLQAmt6. It has 6 pages: joining, home and invite, people and booking for senders, earnings with help and Me, desktop, and the statement PDF.
- Put this folder at `docs/design/reference/agent-mockups/`. `assets/fa.css` is the shared stylesheet, including the console classes it reuses (`.kpi`, `.tabx`, `.fltr`, `.tbl.d`).
- `pdf/agent-statement-template.pdf` is the monthly statement, with the same watermark as the other PDFs.

## Sample data

- Agent: Hauwa Bello in Kano (Dawanau market and Dakata truck park). Invite link `freight-africa.com/i/HAU4K7Q2`.
- She was invited by Yakubu Danjuma, Freight Africa field staff.
- She has brought 9 owners and 5 senders; 11 are active. This matches the admin console (X19).
- People she brought: Musa Haulage Ltd, Garba & Sons, Danjuma Trucks (stuck at the bank account step), Kano Line Ltd (truck photo rejected), Ilorin Haulage (not counted: already on Freight Africa), Sahel Grains (sender), Dawanau Traders (sender, stuck).

## Rules these screens follow

- **Joining (D043, D044):**
  - Agents aren't on the sign-up role step. They join only from a link that Freight Africa staff send (GI01).
  - The link proves the phone number, so next the agent chooses a PIN (GI02). After that, sign-in is phone plus PIN.
  - Setup steps: about you, the agreement, ID check, bank account, then ready.
  - **Inviting works before the ID and bank account are done.** Earnings wait until they are.
- **The deal:** the 1% share for 6 months comes from `settings.agent_share_bps` and `agent_share_months`. Screens read these; they're never hard-coded.
- **What the agent can't see:** prices, payments, payouts, codes, and the phone numbers of drivers, receivers and pickup contacts. Agents see names, status, trip counts and their own shares only.
- **WhatsApp is off for now:**
  - "Share on WhatsApp" uses the phone's own share sheet, from the agent's own WhatsApp.
  - Invites by phone number, reminders and the "check and pay" message are sent by Freight Africa **by SMS and email**.
  - Reminders: at most 1 a day and 3 per step.
  - Call and WhatsApp on the person page open the agent's own phone apps.
- **Booking for a sender (G06):**
  - The same four steps as the sender's booking, with a banner on every step.
  - The last step sends the booking to the sender, who checks it, edits it, and pays through Bachs (D048). Nothing is booked until they pay.
  - The booking expires after 7 days.
  - Freight Africa never takes money from the agent on someone else's behalf.
- **Money:**
  - A share is paid when its trip closes.
  - A share is void when a problem on that trip is upheld.
  - A failed payment shows the bank's reason and what to do next.
  - The totals add up across Home, Earnings and the statement.
- **Statuses:** Paused agent account (G01c): inviting is blocked, and earnings already made are safe. If the whole programme is paused, every agent sees one line saying so.

## Screens

| File | Screen |
|---|---|
| GI01, GI02 | Invite from staff, choose PIN |
| GON01–GON05 | About you, how you earn (agreement), ID check, bank account, ready |
| G01, G01b, G01c | Home; first visit; account paused and programme paused |
| N01 | Notifications |
| G02, G02b, G02a | Invite (owner or sender, share, QR code, by phone number); already on Freight Africa; full-screen QR code |
| G03, G04, G04c, G04b | People; owner stuck in sign-up with Send a reminder; reminder sent; sender with trips and your share |
| G06a, G06b, G06c | Book for a sender: the Where step with the banner, send to check and pay, bookings for senders |
| G05, G05b, G08 | Earnings: shares, payments (with a failed one), share detail (void) |
| G07, G07b, G09, G10 | Me, stop being an agent, help, support conversation |
| GD01–GD06 | Desktop: Home, Invite (including invite several people), People table with bulk reminders, Earnings with statements, Bookings for senders, Settings and notifications |
| GDOC-Statement | Monthly statement PDF |
