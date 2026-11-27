# Combined brief (founder, 25 Nov 2026)

The full text of the combined prompt. Claude Code reads this file at the start of every session that continues the combined brief. Slices 1 to 4 and 5a, 5b are merged (see PROJECT-STATE.md).

```text
Freight Africa only. Same rules as always (identity check, Supabase target check, no Docker, one dev server, don't touch the other session). Start with /clear done; read docs/PROJECT-STATE.md first.

This is a big run. Work through it in the slice order at the end, one branch and PR per slice. If your context gets long, write "Next task" in PROJECT-STATE.md precisely and stop cleanly. I'll start a new session with "continue the combined prompt".

0. READ FIRST: THE MOCKUPS ARE NOW THE DESIGN
The founder approved exact mockups for every role. They are in:
- docs/design/reference/sender-mockups
- docs/design/reference/owner-mockups (includes the v1.1 "Messages from drivers" screens)
- docs/design/reference/driver-mockups
- docs/design/reference/admin-mockups
- docs/design/reference/agent-mockups

Each folder has a README.md (the rules and the screen table), canvas.json (the screen list and sizes), screens/*.html (open them in a browser), assets/fa.css (the tokens and components) and, where relevant, pdf/.

Read every README in full before writing any UI code. The rules for building to them:
- The mockups win over DESIGN_SYSTEM.md, design-direction.md and the ux-*.md files wherever they differ: layout, spacing, type sizes and weights, radii, colours, copy and which screens exist. Update DESIGN_SYSTEM.md to match them (for example: primary button 56 px pill, cards 24 px radius, weights 500–600 only, paper #F5F5F1).
- Copy the copy. Use the words in the mockups, moved into src/messages/en.json. Don't invent or "improve" text.
- The sample people and numbers in the mockups are sample data only. Use them for /dev previews and the demo seed, never hard-coded in real screens.
- Every screen in each README table gets built, with every state shown.
- Phone is drawn at 390 px and desktop at 1440 px (fluid). In between you design nothing new: follow the same patterns (desktop sidebar from lg, phone tabs below it).

1. MERGE WHAT'S WAITING (I approve these; when your permission check asks, I'll allow it)
- Merge #73. Rebase #74 on main, keeping one copy of the shared message line, and merge it. Merge #75.
- Run migrate.yml, regenerate the types (the command in PROJECT-STATE "Next task") and remove the "as never" / "as unknown as" casts.

2. SECURITY GAP: AUTHENTICATOR LOCK
Wrong authenticator codes at sign-in need our own lock, like the PIN:
- 5 wrong codes lock two-step sign-in for that account until an email code is confirmed;
- the same email alert as the PIN lock, with the "lock my account" link.
Reuse the fresh-check counter as you planned. The staff screen for this is admin-mockups X00j. Add pgTAP and unit tests, do the independent review, then merge.

3. RECORD THE DECISIONS IN docs/DECISIONS.md
Use the next free D-numbers (D047 onward if free). Write each in plain words with the date, 25 Nov 2026.
- Offers (sender-mockups README):
  - The sender books at our price, or offers their own price, which is paid now and held. There is a minimum (a setting; 80% in the mockups).
  - Owners accept the offer, or reply once with their price.
  - The sender then pays the difference, offers again once (1 hour window), or declines.
  - If there's no agreement in 24 h, the sender raises the price, changes the day, or gets a full refund.
  - Every load is still paid before a truck goes.
- Bachs hosted checkout:
  - Pay sends the sender to Bachs's own hosted page.
  - On return the sender sees "Confirming your payment", then "Finding your truck". A failed payment shows a screen saying nothing was taken.
  - We never draw or imitate Bachs's page. The account-number screen is gone.
  - Until the Bachs keys arrive, use the demo provider (D039), which behaves the same way.
- Drafts:
  - "Save as draft" replaces "pay later". The confirmation says the order isn't placed, no truck is held, and price and availability can change.
  - Drafts live in Trips → Drafts, with "Pay for several".
  - No "pay by 6 pm to keep Thursday" wording anywhere.
- Mockup-first: docs/design/reference/<role>-mockups is the visual authority for app screens. Add it to the D028 order, directly under DECISIONS.md, for UI questions only.
- Driver → owner messages:
  - Drivers never see the owner's phone number. They message the owner with a reason plus text or a voice note.
  - The owner reads and replies in "Messages from drivers"; the reply reaches the driver's Notifications.
  - This is not live chat; live chat is still Launch 2. SOS never goes through messages.
- Real install detection:
  - Tapping Install, or the browser reporting "accepted", only moves to a waiting state.
  - "Installed" is recorded only when the app runs in standalone display mode and that installed app checks in with the server.
  - On iPhone the home-screen app starts signed out, so it asks for a one-time 6-digit setup code (valid 30 min).
- Agents:
  - They join only from a link Freight Africa staff send; there is no role card at sign-up. Then they choose a PIN and sign in with phone + PIN.
  - Share rate and length come from settings, never hard-coded.
  - While WhatsApp is off, invites by number, reminders and "check and pay" messages go by SMS and email. "Share on WhatsApp" uses the phone's own share sheet.
- Staff: two-step sign-in is required for every staff account (authenticator plus 10 backup codes), and staff sessions last 12 hours.

4. DESIGN FOUNDATION (the first rebuild slice; everything else builds on it)
- Breakpoints. src/app/globals.css resets the breakpoints and defines only sm 600, lg 1024 and xl 1440, so the 66 md: classes never apply.
  - Add --breakpoint-md: 48rem.
  - Add a unit test that the theme defines sm, md, lg and xl.
  - Add a check:layout rule: from 768 px, no button or text block is wider than 560 px unless it's inside a table, a map or a list row.
- Tokens. Port assets/fa.css (the sender's version plus the console section in admin-mockups/assets/fa.css) into Tailwind theme tokens:
  - colours, including the status pairs blue, amber, green, grey and red;
  - radii, shadows, spacing and type scale.
- Components, built once and shared, matching the mockups exactly:
  - basic controls: buttons (primary pill, secondary, small, red SOS), cards, status pills, filter chips, segmented control, underline tabs, fields with focus ring, switches;
  - phone layout: phone tab bars (sender with the raised Book circle, owner, driver, agent with the raised Invite circle), bottom sheet;
  - desktop layout: desktop sidebar plus top bar for the app, and the staff console sidebar plus top bar (grouped, folding groups, role-filtered);
  - overlays and feedback: centred dialog, toast;
  - entry: PIN boxes and docked keypad;
  - data display: KPI tiles, dense table, the check-mark success animation, empty states.
- Motion. Use the motion library at 60 fps:
  - sheet and dialog in and out;
  - the success check pop-and-draw;
  - SOS press-and-hold ring (2 s);
  - number changes;
  - list "new" pill instead of reshuffling.
  Respect prefers-reduced-motion.
- Font. Headings show a gap before commas ("truckloads ,"). Check the comma glyph in JakartaFA.woff2 and the negative heading letter-spacing, and fix it so every comma and full stop sits tight against its word. Use weights 500 and 600 only.
- Slides and Welcome:
  - Give the onboarding illustrations one fixed box, so titles, text and dots don't jump between slides.
  - On desktop, put the illustration in the left half and the text or card on the right (max 440 px).
  - Keypad screens become a centred card (max 420 px) on desktop, and the physical keyboard works.
  Match sender-mockups exactly.

5. REBUILD EVERY ROLE TO ITS MOCKUPS
For every screen in a README table, in this order, one or more slices per role:
- the real screen at its real route, every state drawn (loading, empty, error, offline, success where the mockups show them);
- a /dev preview with the mockup's sample data, so it can be checked without signing in.
Build in role order: sender, then owner, then driver, then admin, then agent.

5a. Sender (sender-mockups)
- Onboarding, setup, unlock, locked, install.
- Booking:
  - several goods items per booking;
  - day chips with how many trucks are free, and the nearest suggestions when a day is full;
  - Offer your own price, with the minimum and the chance meter;
  - owner replies, pay the difference;
  - no truck after 24 h: raise, change day or refund.
- Paying: Bachs hosted checkout, then the Confirming, Failed and Finding your truck screens.
- Drafts and Pay for several.
- Trips: trip detail, tracking, delivered and rating, report a problem, cancel with timed undo.
- Account and settings: team and invite, saved places, security, notifications, business profile, help, settings, Switch account explained.
- Desktop: the full-height live order panel on Book.
- PDFs: the receipt and the statement. Match pdf/receipt-template.pdf and pdf/statement-template.pdf, including the watermark.
- Money work (offers held, differences, partial refunds) goes through the double-entry ledger in kobo, idempotent, with pgTAP tests and the independent money review.

5b. Truck owner (owner-mockups, v1.1)
- Setup, home, the load board, load detail.
- Offers: accept, or reply once with a price.
- Trips: trip page with the payout card, change driver, reply to a problem, report a problem, cancel with strike, rate the sender.
- The Drive tab, which appears when "I drive my own truck" is on.
- Money: earnings, payouts, bank account.
- Fleet: trucks, GPS tracker, drivers and invites, papers, track record, team, load alerts.
- Messages from drivers (O19d, O19e, OD11b), with entry points in More and on desktop Drivers.
- PDFs: the payout statement and payout advice, matching pdf/.

5c. Driver (driver-mockups, v1.1)
- Joining:
  - invite link, ID check, licence (number and expiry read from the photo), PIN;
  - install, with the real install detection from section 3 (DV05, DV05b–e: waiting, not installed, iPhone steps with setup code, installed);
  - GPS test with emergency contact.
- The trip, one 68 px button per step: go to pickup, "I've arrived" (only inside the pickup area), loading photos with seal and count, loading code, start trip, directions, delivery photo, delivery code, "anything wrong?", complete.
- Safety and offline:
  - SOS press-and-hold 2 s, then the red help-coming screen;
  - dark screen at night (Auto / Always / Never);
  - every action time- and place-stamped, queued offline and sent in order;
  - typing disabled while moving (voice notes allowed);
  - non-urgent notifications wait until the truck stops.
- Rules: no money anywhere; the driver never holds codes; calls only to the pickup and receiver contacts during a live trip.
- Me: Message the owner (DV32b, DV32c).
- Desktop: view-only, with a QR code to open the trip on the phone.

5d. Staff console on admin.freight-africa.com (admin-mockups)
- Getting in: X00a–X00k, with two-step required and the lock from section 2.
- Role-filtered navigation exactly as in ux-admin 1.5. A blocked link shows X00k.
- Screens: My work, Overview, notifications, profile, live map, SOS (with the 2-minute escalation and sound until acknowledged), trips, trip page and its dialogs, loads and matching, verification, disputes, fraud, company, support inbox, agents, escrow, payouts, refunds, reconciliation against Bachs, approvals, catalogue, lanes, fees, messages, website, settings, reports, staff and on-call, audit log, playbooks, and the field agent phone app.
- Every change to money, status or access opens a dialog with:
  - the effect in one sentence;
  - a required reason, written to the audit log;
  - a second approval where SYSTEM-LOGIC §10 says so.
  Nobody can approve their own request. Opening ID images is logged. Staff never see codes.

5e. Agent (agent-mockups)
- Joining by staff link, choose PIN, setup, Home, Invite (share, QR, by phone number, invite several on desktop).
- People and person detail, with reminders limited to 1 per person per day and 3 per step.
- Booking for a sender: the sender checks, edits and pays through Bachs; the booking expires after 7 days.
- Earnings, share detail, notifications, help, Me, and stop being an agent.
- The statement PDF, matching pdf/agent-statement-template.pdf.
- Keep the agent programme switched off in production (settings.agents_enabled = false) until its Phase 6 acceptance. The screens and /dev previews are built now.

5f. Honesty rule for screens whose backend belongs to a later phase
Some screens (for example parts of disputes, fraud, agents and reports) need backend work planned for Phases 4 to 6. For those:
- build the screen and its /dev preview with sample data;
- keep it hidden in production behind a feature flag;
- list it in PROJECT-STATE as "UI built, backend Phase N".
Never show sample data or fake success in production.

6. MESSAGING WHILE WHATSAPP IS OFF
Everything the mockups send by text goes by:
- SMS, through the configured SMS provider, or the demo provider (D039) if none is set;
- email through Resend;
- in-app and push notifications.
Keep the WhatsApp templates "On hold" in the console. Don't build any WhatsApp sending.

7. PDFs
Generate every PDF server-side from the mockup templates, so they look identical:
- sender receipt and statement;
- owner payout statement and payout advice;
- agent statement.
Each has the faint centred mark (5% opacity) plus a diagonal "FREIGHT AFRICA" watermark (-32°, about 4.5%), A4, and page numbers. Add a test that each renders and that the amounts in it match the ledger.

8. FINISH PHASE 3
- Payout and refund retry timing.
- The "no truck after 24 hours" choice (now the raise / change day / refund screen).
- Batch payment ("Pay for several").
- The daily reconciliation run against Bachs (or the demo provider).
- PageSpeed, or local Lighthouse, for /auth and sender Home.
- Update docs/acceptance/phase-3.md.
Money changes get the independent review as always.

9. PROVE IT MATCHES
- Run check:layout on every /dev preview at 320, 375, 768, 1024, 1280 and 1440 px, including the long-name business and a long email.
- Add npm run check:mockups. For each mockup screen, it screenshots the mockup HTML and our /dev preview at the same size (390 for phone screens, 1440 for desktop) and writes them side by side to docs/acceptance/mockup-compare/<role>/<screen>.png. Fix anything that visibly differs: spacing, type, weight, radius, colour, alignment or copy.
- Note any deliberate difference in docs/acceptance/mockup-compare/DIFFERENCES.md, with the reason. A deliberate difference is one that a decision or a security rule requires. There should be very few.

SLICE ORDER (one branch and PR per slice; merge when CI is green and the review is done):
1. Merges and types (section 1).
2. Authenticator lock (section 2).
3. Decisions (section 3).
4. Foundation (section 4).
5. Sender, split into: onboarding and auth, booking and offers, Bachs and drafts, trips, account and settings, PDFs.
6. Owner.
7. Driver, including install detection and the offline queue.
8. Staff console.
9. Agent.
10. Messaging (section 6).
11. Phase 3 finish (section 8).
12. check:mockups and fixes (section 9).

Working rules for speed (unchanged):
- One branch and PR per slice; merge when CI is green and the review is done.
- Update PROJECT-STATE.md after every merged slice.
- Before your context gets long, write "Next task" precisely.
- Don't start Phase 4.

STOP when all slices are merged and live, or when truly blocked.

Report in plain language:
- what's live and what isn't (including every "UI built, backend Phase N" item);
- the links to the mockup-compare folders;
- a "try it" table with the /dev preview link for one key screen per role, the Bachs demo checkout, the offer flow, the authenticator lock, driver install detection and the SOS hold.
```
