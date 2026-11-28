# Closing brief (founder, 28 Nov 2026): close Phases 1–3 against the mockups before Phase 4

Claude Code reads this file at the start of every session that continues it (with `combined-brief.md`
and `PROJECT-STATE.md`). Progress is recorded in PROJECT-STATE §3.

```text
continue: close Phases 1–3 against the mockups before Phase 4. Read docs/briefs/combined-brief.md and PROJECT-STATE first. Don't stop until everything below is merged and live, unless truly blocked. Never stop because the context is long.

1. FOUNDER DECISIONS (record in DECISIONS.md, 28 Nov 2026)
- VAT: no VAT line on PDFs or prices for now. Add a setting vat_on_service_fee (off, money setting, D037) so it can be switched on later.
- PDFs show "Freight Africa" and hello@freight-africa.com; no postal address until I give one (a setting, empty for now).
- Help: hide the Call button until a setting support_phone is filled in. Email stays.
- Open load board: show the sender's business name and Verified sender badge, as the mockups do; never a phone number or exact address before booking.
- Allow yourself the Vercel env step: add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (from .env.local) to production and preview. I'll approve the permission prompt.

2. COMPARISON COVERAGE MUST BE 100%
check:mockups produced 100 images for 278 mockup screens, and some are wrong. Fix the tool and the screens so that:
- Every screen in every README table (sender 77, owner 64, driver 42, admin 60, agent 35) has a compare image in docs/acceptance/mockup-compare/<role>/, made against the LATEST build (a fresh preview of main, or a local server on main). No image may show "We can't find that page": DV13, DV14 and DV17 do now, because they were taken against an old preview.
- The compare script picks the state each mockup shows (empty, first visit, with a trip, night, etc.) with ?preview= or /dev sample data, not whatever the demo account happens to have.
- For every screen that is not built, or only partly built, write a line in DIFFERENCES.md: screen, what's missing, and the phase it belongs to. Then build every screen that belongs to Phases 1–3 now. At least: owner setup O01–O07 and OD00, load detail and offers O13–O13f and OD03, owner trip O15–O15f and OD05, payouts O17b, bank O17c, truck and tracker O18b/O18c, add driver O19b/O19c, messages O19d/O19e/OD11b, papers O20b and OD12, owner PDFs ODOC; driver joining DV01–DV08; staff sign-in X00a–X00j, trips X03–X03d, loads X04, company X06, verification X07–X07p, escrow X09, payouts X10, refunds X11, reconciliation X12, approvals X17/X17p, catalogue X15, lanes X16, fees X18, settings X21, staff X24, audit X25, notifications X27, profile X29; sender screens not yet compared (P01b, P01c, P08a, P08b, P08c, D03b–D03d, P12c, P14, D06, P14f, P15b, D07b, P16a, P16c, P16f, P16g, DOC-Receipt, DOC-Statement). Later-phase screens (Phase 4–6) get UI plus /dev preview, hidden in production, as the brief says.

3. FIX THESE DIFFERENCES (seen in the current compare images)
- Homes (sender P07/D02, owner O10/OD01, driver DV10): the "Finish setting up" card must not take over Home. Finish the demo accounts' setup in seed-demo.mjs so their Homes match P07, D02, O10, OD01 and DV10 exactly. Keep the setup card for real new users only, drawn as in P07b/D02c, and compare those states separately.
- Sender D02: the greeting is the page heading ("Good morning" small, name large) as in the mockup, not a line in the top bar. Current trip card: add the driver row (photo or initials, name, plate, goods, Track button).
- Owner O10/OD01: three money tiles including "Held for a problem"; Needs you; Return loads; the Gold/level card; the truck list with the truck drawings, not small icons.
- Owner Earnings O17/OD06: Held for a problem tile, month picker, PDF and Spreadsheet buttons, bank account section.
- Help P25/D13: desktop is the two-column layout (topic list left, answer right, "Still stuck?" card); phone as P25. Call button only when support_phone is set.
- Track P13: the green header card with the box picture; no tab bar on this screen (as the mockup).
- Price P09/P09b: the "Within the usual …" range pill; the goods row lists every item.
- Driver GPS DV06: map picture, the "GPS working · accurate to 12 m" confirmation, the emergency contact as one row; button text as the mockup per state.
- Agent G04: back button, person picture, Call and WhatsApp buttons.
- /app/ship/payments scrolls sideways by 27 px at one width: fix. check:layout must finish on /app/ship/places.
- Fix the "try it" links: the SOS hold at /dev/driver?screen=onroad must work on the preview link you give me.

4. PROVE IT
- Run check:layout on every screen at 320, 375, 768, 1024, 1280 and 1440. PageSpeed (or local Lighthouse) for /auth and sender Home.
- Update docs/acceptance/phase-1.md, phase-2.md and phase-3.md: each acceptance criterion met with evidence, and the full list of anything deliberately left for a later phase.
- Give me a fresh preview share link made from the latest main, valid at least 48 hours.

Same rules as always: database first in its own PR with the money review, then migrate, then screens; the independent review for money, auth and RLS; merge on green.

Report in plain language: what's live, coverage per role (compared / total), every remaining difference and why, the fresh share link, and a "try it" table per role.
```
