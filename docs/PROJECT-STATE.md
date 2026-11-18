# PROJECT-STATE.md, Freight Africa

**Authority level: 7 of 14.** The living record of where the project stands. Claude Code reads it at the
start of every session and updates it at the end (`CLAUDE.md` §2). It records facts about progress; it
never overrides a higher document.

**Last updated:** 15 Nov 2026, by Claude Code (launch page accepted on freight-africa.com).

---

## 1. Status at a glance

| Area | Status |
| --- | --- |
| Planning and specifications | **Done** (all documents in this repository) |
| Repository | Private `Temi-daniel124/freight-africa`; CI green (`author-check`, `app`, `database`, `drift`) |
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
| 1 | Foundations: auth, organisations, roles, RLS, tokens, ledger, settings, audit | In progress | Slices 1 (groundwork), 2 (sign-in) and 3 (profiles, consents, role step) done |
| 2 | Supply: owner and driver onboarding, Didit, trucks, documents, catalogue, verification queue | Not started | |
| 3 | Booking and money: quotes, loads, payments, escrow, releases, refunds, receipts | Not started | Needs Bachs keys and API docs |
| 4 | The trip: load board, offers, trips, driver flow, trip mode, codes, receiver pages, notifications, live map | Not started | Needs WhatsApp setup |
| 5 | Problems: disputes, SOS, cancellations, waiting, breakdowns, fraud flags, strikes | Not started | |
| 6 | Growth: return loads, agents, discounts, offers, ratings, tiers | Not started | |
| 7 | Website and SEO | Not started | Needs photography |
| 8 | Hardening and launch: security review, low-end phone tests, restore drill, playbooks, go live | Not started | Admin screens are built inside each phase |

## 3. Current task

**Next task:** the redesign gates (founder brief, 17 Nov 2026): each gate is built to a design target the founder approves first (docs/design/targets/gate-N), compared side by side at 320/375/768/1280/1440, then stopped for approval. **Gate 1 (sign-in, A-01 and A-02) approved 18 Nov 2026** on PR #24 (branch feat/gate-1-sign-in, includes short-screen spacing for 1366x768 and 1280x600). Gate 2 (header and landing hero) next, then Gate 3 (rest of the landing page) and Gate 4 (signed-in app look); after all four are approved and CI passes again (issue #22, picomatch), merge and continue with Phase 1 slice 4 (organisations and members).

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
