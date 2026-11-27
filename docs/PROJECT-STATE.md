# PROJECT-STATE.md, Freight Africa

**Authority level: 7 of 14.** The living record of where the project stands. Claude Code reads it at the
start of every session and updates it at the end (`CLAUDE.md` §2). It records facts about progress; it
never overrides a higher document.

**Last updated:** 27 Nov 2026, by Claude Code (combined brief slice 5a merged; next 5b, booking and offers).

---

## 1. Status at a glance

| Area | Status |
| --- | --- |
| Planning and specifications | **Done** (all documents in this repository) |
| Repository | **Public** `Temi-daniel124/freight-africa` until production is complete, then private again (D040); CI green (`author-check`, `app`, `database`, `drift`) |
| Code | Next.js 16 app: design foundation, `/dev/components` gallery, launch page (home, waitlist, privacy, terms) |
| Supabase project | Created by the founder: **Freight Africa**, ref `czlowhaycaivpgimcefk`, `https://czlowhaycaivpgimcefk.supabase.co`. Linked; migrations applied through `migrate.yml`; nightly backup running |
| Vercel project | `freight-africa` on Hobby, linked to GitHub; env vars set; production and previews Ready |
| Resend | Account exists; sending domain `mail.freight-africa.com` verified. Supabase Auth sends through Resend SMTP (test email delivered); keys `supabase-auth-smtp` and `app-email` |
| Domain | `freight-africa.com` live on Vercel (Let's Encrypt certificates, auto-renewed); `www` redirects to it with a 308. `hello@freight-africa.com` forwards to the founder's Gmail through ImprovMX (MX, SPF verified; DMARC `p=none`) |
| Launch | Launch page live and accepted (15 Nov 2026); Web Analytics on. Platform not launched; one database environment (D029) |

## 2. Build phases

The phases are defined in `BUILD.md` §3. Update this table as work progresses.

| Phase | Name | Status | Notes |
| --- | --- | --- | --- |
| 0 | Bootstrap: repo, scaffold, accounts linked, CI green | Done | |
| 0L | Launch page: pre-launch home, waitlist, privacy and terms (D030) | **Accepted** 15 Nov 2026 | PageSpeed Insights mobile 98 (LCP 2.5 s, TBT 40 ms), desktop 100; real phone sign-up and confirmation email delivered |
| 1 | Foundations: auth, organisations, roles, RLS, tokens, ledger, settings, audit | **Accepted** 24 Nov 2026 | `docs/acceptance/phase-1.md`; slices 1–9, staff two-step sign-in (#42), demo accounts (#43), 297 pgTAP tests |
| 2 | Supply: owner and driver onboarding, Didit, trucks, documents, catalogue, verification queue | **Built** 25 Nov 2026 (last items in #73, #74); Didit demo until account | `docs/acceptance/phase-2.md`; demo verification provider until Didit (D039); still to build: plate reading, tracker registration (T-18), truck inspection tasks |
| 3 | Booking and money: quotes, loads, payments, escrow, releases, refunds, receipts | **Built, awaiting founder review** 25 Nov 2026 | Database and money rules live (#66); screens #67, #68; demo payment provider until Bachs (D039); ledger postings real |
| 4 | The trip: load board, offers, trips, driver flow, trip mode, codes, receiver pages, notifications, live map | Not started | In-app and email instead of WhatsApp until Meta (D039) |
| 5 | Problems: disputes, SOS, cancellations, waiting, breakdowns, fraud flags, strikes | Not started | |
| 6 | Growth: return loads, agents, discounts, offers, ratings, tiers | Not started | |
| 7 | Website and SEO | Not started | Needs photography |
| 8 | Hardening and launch: security review, low-end phone tests, restore drill, playbooks, go live | Not started | Admin screens are built inside each phase |

## 3. Current task

**Unblocked (24 Nov 2026):** GitHub Actions had stopped starting jobs on the private repository (billing); the founder had the repository made public (D040). It goes back to private when production is complete.

**Founder's combined brief of 25 Nov 2026 ("the mockups are now the design", sections 0–9, slices 1–12).** One branch and PR per slice. Resume with "continue the combined prompt".

- **Slice 1, merges and types: done.** #73 merged; #74 rebased on main (one copy of the `ocr` message) and merged as #76; #75 merged; `migrate.yml` run (20261125180000); types regenerated and the casts around `find_trip`, `fleet` and `truck_signal` removed (#77).
- **Slice 2, authenticator lock: done and live (#78, #79).** Five wrong authenticator codes in a row (sign-in, staff console or fresh check) lock two-step sign-in until an email code is confirmed at sign-in; the locking code sends the security email with the lock link; X00j at `/auth/two-step/locked`. pgTAP `240_two_step_lock` (19), unit `two-step-lock.test.ts` (6). Independent review: staff console path added, only answered wrong codes count, a lock landing during a right code ends that session. Follow-up #79 (automated review): `my_staff_role()` keeps meaning "staff" while locked; instead every database aal2 check now reads `private.session_aal()`, which says `aal1` while locked (verified on the live database: 0 functions read the raw claim, 8 rewritten). **Residual risk** (SECURITY.md §3): Supabase's MFA Verification hook, which would also count codes sent straight to Supabase Auth, needs the Teams plan; revisit before launch (Phase 8). X00j is drawn with the current auth layout; the staff-console look (deep-green left panel) comes with slice 8.
- **Slice 3, decisions: done (#80).** D047 offers, D048 Bachs hosted checkout, D049 drafts, D050 mockups first (added to the D028 order and AGENT.md), D051 driver messages, D052 install detection, D053 agents, D054 staff two-step and 12-hour sessions, D055 availability and several goods. The five mockup folders are committed.
- **Owner mockups complete (#PR):** the full owner set (64 screens, README with the v1.1 messages section, `assets/fa.css`, `pdf/`) is in `docs/design/reference/owner-mockups`; slice 6 is no longer blocked.

- **Slice 4, design foundation: done (#83).** Mockup tokens in `globals.css` (paper #F5F5F1, lines, status pairs, SOS red, radii, shadows, type at 500/600 with `font-bold` gone), the md breakpoint with `theme.test.ts`, the 560 px rule in `check:layout`; buttons, pills, chips, fields, choices, tabs, tab bars, sidebars (the staff console's filtered by role, `staffPageRoles`, pages outside the role are not found), dialog, keypad, KPI, table and progress in `/dev/components`; motion (success check, SOS hold, rolling numbers, New pill); the comma and full stop moved closer in JakartaFA (`scripts/fonts/tighten-punctuation.py`); welcome slides and Welcome with one fixed illustration box and the desktop split; DESIGN_SYSTEM §1–5 and §10 to the mockups. Checked on the preview at 1440 and 375 (a local dev server ran out of memory on the laptop).

- **Slice 5a, sender onboarding and auth: done (#85).** P01–P06c, D01, D01b: welcome slides and Welcome with the mockup art; the auth frame (paper page, Back header, button docked at the bottom; courier-and-van panel from 1024 px); code boxes; PIN screens and the locked screen (P05c); role cards (the F-10 agreements stay under them); setup with the avatar row; the install sheet restyled (placed on Finding your truck in 5c). Checked side by side at 390 and 1440 with `scripts/compare-mockups.mjs` (pairs in `scripts/mockup-pairs/sender.json`) on the preview. Deliberate differences: the code screen shows the logo mark instead of "Step 1 of 3" (it also serves returning people on a new device); Choose a PIN has no Back (the email code is behind it); the keypad keeps the Delete icon where two mockups draw a chevron; the route arrow is Plus Jakarta's own (the mockup's thin arrow is a system fallback). **UI not shown, backend Phase 4:** P06b's phone number (a profile phone must be verified, which needs WhatsApp codes); each booking still asks for its own contacts.

**Next task: slice 5b, sender booking and offers (combined brief)**, then 5c Bachs and drafts, 5d trips (with Home), 5e account and settings, 5f PDFs; one PR each, each screen against `docs/design/reference/sender-mockups` at 390 and 1440 before merging. Money sub-slices (booking, offers, drafts, payments): ledger in kobo, idempotent, pgTAP, independent money review before merging. Anything whose backend is a later phase: hidden in production and listed as "UI built, backend Phase N".
Then slices 6–12 in the brief's order (owner; driver; staff console; agent; messaging; Phase 3 finish; check:mockups).

**Founder's standing instructions (24 Nov 2026):** no more design gates; the founder reviews each phase once at the end with the demo accounts. Stop only at the end of a phase (with a "try it" walkthrough) or when truly blocked. Merge on green CI after the independent review for money, auth and RLS. Check every screen at 375, 768, 1024 and 1440 px (320 for overflow); the full six-width check:layout and check:mockups run in slice 12. If the laptop is short of memory, use the Vercel preview share link for visual checks and run tests with fewer workers; never stop programs this session didn't start. PageSpeed at the end of each phase. Update this file after every merged slice.

**Merging stacked or rebased PRs:** force-pushing a PR branch is blocked on this laptop; push the rebased commits under a new branch name and open a replacement PR (as #37 and #40 replaced #28 and #30).

**Working rules from 19 Nov 2026** (DEVELOPMENT-WORKFLOW §1A): backend slices merge on green CI after the independent review for money, auth and RLS; screen comparisons at 375 and 1440 within 2 px; browser suites one file at a time.

**Live and connected:** the job dispatcher runs every minute (pg_cron → pg_net → /api/jobs/dispatch, URL and JOBS_SECRET in Supabase Vault via `scripts/configure-jobs-vault.mjs`); a test notification was delivered exactly once on 23 Nov. Email goes out through Resend; WhatsApp trip messages, SMS and push are skipped until Phase 4.

## 4. Things only the founder can do

Providers require the account owner personally for these. Claude Code prepares everything else and asks
for these at the moment they're needed, with exact steps.

| Item | Needed by | Why it needs the founder |
| --- | --- | --- |
| Supabase database password (or reset it in the dashboard) for `supabase link` | Phase 0 | Set when the project was created; only the owner has it |
| Supabase CLI login (one browser approval) and a personal access token from supabase.com/dashboard/account/tokens (for CI and the SMTP script) | Phase 0 | Account authorisation |
| Google OAuth client (Google Cloud console) for "Continue with Google"; then `AUTH_GOOGLE=on` | Phase 1, when ready | Google account ownership; until then email codes work and the Google button is hidden |
| WhatsApp sign-in codes: needs the Meta items below, an approved authentication template, then `AUTH_WHATSAPP=on` and the Supabase Send SMS hook | Phase 4 (or sooner) | Built and switched off; cannot be tested without the WhatsApp number |
| Bachs live and test API keys, webhook secret, and API documentation | Phase 3 | Merchant account |
| Didit account, API key, webhook secret, and the two verification workflows (owner, driver) | Phase 2 | Account ownership |
| Meta Business portfolio, WhatsApp number on a new SIM, app credentials (D021) | Phase 4 | Personal Facebook login required by Meta |
| SMS provider account (optional backup) | Phase 4 | Account ownership |
| Photography shoot at a park and a market, with permission forms | Phase 7 | On-site |
| Approving destructive or money-moving actions (D027 gates) | Ongoing | Founder decision |

## 5. Risks and watch items

| Risk | Note |
| --- | --- |
| Repository public until go-live (D040) | Nothing secret or personal may ever be committed; switch back to private in Phase 8 |
| Vercel Hobby is for personal, non-commercial use under Vercel's terms | Plan to move to Vercel Pro before taking paid trips |
| Supabase free plan limits and pausing after inactivity | Nightly backup workflow keeps it active; watch database and storage size in the admin console |
| No staging database (D029) | Every migration tested in CI first; destructive changes gated |
| PWA tracking stops when the app is closed or the phone locks | Trip mode, gap alerts, optional trackers (D005) |
| WhatsApp business unverified (D021) | 250 recipients a day; email and SMS backups |
| Bachs capabilities (collection accounts, payouts, name lookup, refunds) not yet confirmed in writing | Integration checklist in D007 |

## 6. Open questions

- None. Contact email `hello@freight-africa.com` and the 12-month retention were confirmed by the founder on 15 Nov 2026.

## 7. Session log

Add one line per session, newest first: date · what was done · what's next.

- 27 Nov 2026 · Combined brief slice 5a, sender onboarding and auth (#85), checked side by side with the new compare-mockups script on the preview; standing check widths now 375, 768, 1024, 1440 (320 for overflow); JakartaFA.woff2 confirmed 20,492 bytes, nothing to fix · 5b, booking and offers.

- 26 Nov 2026 · Owner mockups complete (#82, slice 6 unblocked); combined brief slice 4, design foundation (#83): mockup tokens, components, motion, font punctuation, welcome layout · slice 5, sender.
- 25 Nov 2026 (afternoon) · Combined brief slices 1–3: #73, #76 (replacing #74), #75 merged, migrations applied, types regenerated (#77); authenticator lock with X00j, independently reviewed, plus the session_aal follow-up (#78, #79); decisions D047–D055 and the mockup folders (#80) · slice 4, design foundation.
- 25 Nov 2026 · New look, Phase 3 booking and money (database, 31 money tests, screens, Homes, tracking, finance views), D044 fresh check, Drivers page, plate and expiry reading, trackers and inspections (#65–#74); each money/auth/RLS change independently reviewed · founder merges #73 and #74; layout sweep; Phase 4.

- 24 Nov 2026 (evening) · Founder brief D043–D046: decisions and docs (#61); account types, "I drive my own truck" switch, Admin label (#62); sign-in with an email code once per device then a PIN, optional two-step, app lock for every role, phone invites and PIN links (#63), each independently reviewed with findings fixed; migrations applied; demo PIN seeded · the new look, then Phase 3.

- 24 Nov 2026 (later) · Phase 2 built and tested end to end on production with the demo accounts: catalogue (#47), identity checks with the optional Verified sender badge (D041, #48, #49), transporter setup with an encrypted payout bank account (#50, #51), trucks and papers with daily expiry checks (#52 to #54), drivers, licence and the app-lock PIN (D042, #55 to #58), bank accounts needing review (#59); every money, auth and RLS slice independently reviewed and its findings fixed; PageSpeed API quota exhausted (Lighthouse: sign-in accessibility 100, best practices fixed for a CSP prefetch error) · founder review of Phase 2; plate reading, trackers, inspections; Phase 3.
- 24 Nov 2026 · Gate 4 and slice 4 screens approved and merged (#37, #40, replacing #28 and #30); founder made first super admin and D037 money settings with sole-admin code re-entry, plus D038 (mockups, no gates) and D039 (demo providers) (#39); role step now opens the role's app with a Finish setting up card (#41); staff two-step sign-in screens (#42, review fix; tested live), demo accounts seeded (#43), shell homes per request (#45), mockups committed (#44); Phase 1 accepted; repo made public (D040); catalogue (#47); identity checks and A-04 with optional Verified sender (D041, #48, #49) ; transporter setup with bank accounts (#50, #51); trucks and papers (#52 to #54); drivers and the PIN (D042, #55 to #57) · Phase 2 slice 6, verification queue.
- 19–23 Nov 2026 · Gate 3 approved; D036 waitlist-only public site; Gates 1–3 merged and live (#24–#26); ink-3 darkened for accessibility (#27; PageSpeed before it: mobile 97/96, desktop 100/96; the API quota blocked a re-run); Gate 4 app shells built (#28, review); slice 4 organisations, members, invites (#29 live; screens #30, review); slice 5 staff and two-step sign-in (#31), slice 6 settings, approvals, audit log (#32), slice 7 ledger (#33), slice 8 notifications and dispatcher (#34, #35), each after an independent review with its fixes; dispatcher connected through Vault and accepted (one test email, sent once) · staff two-step sign-in screens.
- 19 Nov 2026 · Gate 3 landing sections built to the approved target (shared section heading; How it works cards with restyled screens; payment band with timeline card; Who it's for side by side with role links; route cards; pricing with instant switch; questions as <details>, first open; closing band; footer), text within 1 px except the mockup's .seg class clash; replaced sections removed; launch suite 29/29, auth 17/17, gallery 4/4 · awaiting Gate 3 approval.
- 18 Nov 2026 · Gate 2 header and hero built to the approved target (solid pill header, inset photo, waitlist bar handing off to /waitlist with role, route and number, proof row; bar states on /dev/landing-states), text within 1 px, CLS 0; then adaptive hero height and 1200 px tablet portraits (scripts/photos/export-portrait.py, same blurs); approved 18 Nov · Gate 3.
- 18 Nov 2026 · Gate 1 sign-in rebuilt to the founder's approved target (green panel with trip and payment cards, 36 px title, 56 px email field, code boxes with focus ring; every state on /dev/sign-in), side-by-side comparisons in docs/design/targets/gate-1/compare, text positions within 1 px; fixed: autofocused code box showed no ring, text-input colour clash, pretty-wrapping; short-screen spacing; approved 18 Nov · Gate 2.

- 17 Nov 2026 · Subdomain certificates issued, live sign-in on app.freight-africa.com verified, admin holding page; Supabase Auth settings script (Site URL app., redirect list, 10-minute codes); Turnstile paused (D035); Plus Jakarta Sans (D034); sign-in redesign and landing polish on PR #19 awaiting approval; slice 3: profiles and consents migration (trigger that cannot block sign-up, backfill, RLS, 28 pgTAP) applied by the migrate workflow, A-03 role step with consents, /app routes new people to it · Slice 4, organisations.
- 16 Nov 2026 · Before slice 3: search basics (192px icon, WebSite and fuller Organization data); D033 hosts (app. and admin. subdomains, per-host robots, cookies and manifest, security headers on signed-in pages, both domains added in Vercel, DNS records with the founder); Cloudflare Turnstile on Send code (off until keys are set; verified with Cloudflare's test keys); private font comparison page /dev/fonts with six candidates and a drawn naira sign where a font has none · Founder: DNS, Search Console, Turnstile account, font choice; then the redesign and slice 3.
- 16 Nov 2026 · Sign-in review fixes (independent review and commit security check): return paths checked after normalising, signed code cookie, lockout recovery, /auth/done, tries counted atomically (auth_code_try), 60 codes an hour per internet address. Left open: auth_code_open and auth_code_failed are unused and to be dropped; the Send SMS hook does not remember message ids (replay within 5 minutes, hook is off) · Slice 3.
- 16 Nov 2026 · Phase 1 slice 2 sign-in: /auth and /auth/code (A-01, A-02) with email codes sent through Resend, 5 codes an hour and 5 tries a code counted in the database, Google and WhatsApp built behind AUTH_GOOGLE / AUTH_WHATSAPP (off), safe return paths, temporary /app landing; tested end to end with a Resend test inbox, screenshots at 5 widths · Slice 3, profiles and onboarding entry.
- 15 Nov 2026 · Phase 1 slice 1 groundwork: generated types, src/lib/env.ts, typed browser/server/admin clients, session refresh in src/proxy.ts for /app, /admin and /auth only; share links and QR (docs/launch) with the source kept across pages · Slice 2, sign-in.
- 15 Nov 2026 · Launch page accepted on freight-africa.com: domains valid with HTTPS, www → apex 308, hello@ forwarding works, test sign-up and email verified then deleted, sitemap/robots/canonicals on https://freight-africa.com, og:url no longer points subpages at home, How it works steps no longer faded below 4.5:1, PageSpeed mobile 98 / desktop 100, Web Analytics on · Phase 1.
- 15 Nov 2026 · Copy tweaks: hero switch has no visible label (named 'Who's joining' for screen readers); waitlist role 'I'm joining as' with A sender / A truck owner / An agent, stacked on phones; step 1 card says 'Tomorrow morning' and shows the price line as a label · DNS (Vercel + ImprovMX), PageSpeed on freight-africa.com, then Phase 1.
- 15 Nov 2026 · Launch page revised (D031, D032): Inter subset, floating pill header, 4-photo Nigerian slideshow (plates and adverts blurred, credits recorded, white text 4.78:1 or better on every photo), copy from launch-page-copy.md with no rates or amounts, font-coverage test, corridor arrows as icons · DNS (Vercel + ImprovMX), ImprovMX account, PageSpeed on Vercel, then Phase 1.
- 15 Nov 2026 · Phase 0 finished: Supabase linked and migrations applied, CI and drift green, Resend SMTP, domains added, design foundation and gallery · Launch page built with waitlist backend, screenshots reviewed at 5 widths, Lighthouse 93+ (CPU-calibrated) · DNS, contact email, real sign-up test, then Phase 1.

- 9 Nov 2026 · Launch page moved forward to right after Phase 0 (D030) · Finish Phase 0, then the launch page.
- 9 Nov 2026 · Supabase project ref corrected to czlowhaycaivpgimcefk (Freight Africa, eu-west-1, verified) · Governance documents created; scope document named docs/PLATFORM-SCOPE.md (full platform, D014) · Start Phase 0.
