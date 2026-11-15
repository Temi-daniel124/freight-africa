# PROJECT-STATE.md, Freight Africa

**Authority level: 7 of 14.** The living record of where the project stands. Claude Code reads it at the
start of every session and updates it at the end (`CLAUDE.md` §2). It records facts about progress; it
never overrides a higher document.

**Last updated:** 15 Nov 2026, by Claude Code (launch page revised: D031, D032).

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
| Domain | `freight-africa.com` and `www` added to Vercel; waiting for the founder's GoDaddy DNS records (Vercel A/CNAME, plus ImprovMX MX and SPF for `hello@`) |
| Launch | Not launched; one database environment (D029) |

## 2. Build phases

The phases are defined in `BUILD.md` §3. Update this table as work progresses.

| Phase | Name | Status | Notes |
| --- | --- | --- | --- |
| 0 | Bootstrap: repo, scaffold, accounts linked, CI green | Done | Domain DNS waits on the founder |
| 0L | Launch page: pre-launch home, waitlist, privacy and terms (D030) | Revised (D031, D032); founder review | Right after Phase 0; needs DNS to share on freight-africa.com |
| 1 | Foundations: auth, organisations, roles, RLS, tokens, ledger, settings, audit | Not started | |
| 2 | Supply: owner and driver onboarding, Didit, trucks, documents, catalogue, verification queue | Not started | |
| 3 | Booking and money: quotes, loads, payments, escrow, releases, refunds, receipts | Not started | Needs Bachs keys and API docs |
| 4 | The trip: load board, offers, trips, driver flow, trip mode, codes, receiver pages, notifications, live map | Not started | Needs WhatsApp setup |
| 5 | Problems: disputes, SOS, cancellations, waiting, breakdowns, fraud flags, strikes | Not started | |
| 6 | Growth: return loads, agents, discounts, offers, ratings, tiers | Not started | |
| 7 | Website and SEO | Not started | Needs photography |
| 8 | Hardening and launch: security review, low-end phone tests, restore drill, playbooks, go live | Not started | Admin screens are built inside each phase |

## 3. Current task

**Next task:** launch page acceptance (`BUILD.md` §2A): founder's GoDaddy DNS (Vercel and ImprovMX records), ImprovMX account so `hello@freight-africa.com` forwards to Gmail, one real sign-up from a phone, PageSpeed Insights on `https://freight-africa.com` (mobile 90+, LCP under 2.5 s; the photo hero scores 65–81 in local Lighthouse on this laptop, so measure on Vercel), Web Analytics switched on. Then Phase 1.

## 4. Things only the founder can do

Providers require the account owner personally for these. Claude Code prepares everything else and asks
for these at the moment they're needed, with exact steps.

| Item | Needed by | Why it needs the founder |
| --- | --- | --- |
| Supabase database password (or reset it in the dashboard) for `supabase link` | Phase 0 | Set when the project was created; only the owner has it |
| Supabase CLI login (one browser approval) and a personal access token from supabase.com/dashboard/account/tokens (for CI and the SMTP script) | Phase 0 | Account authorisation |
| DNS records at GoDaddy for Vercel (apex A record and `www` CNAME; Claude Code reads the exact values from Vercel) and for ImprovMX (MX and SPF) | Before the launch page is shared | GoDaddy access |
| ImprovMX free account (sign up with the Gmail address, add `freight-africa.com`, alias `hello` → Gmail) | Before the launch page is shared | Account in the founder's name, confirmed from the Gmail inbox |
| Google OAuth client (Google Cloud console) for "Continue with Google" | Phase 1 | Google account ownership; until then, email and WhatsApp codes work |
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

- 15 Nov 2026 · Copy tweaks: hero switch has no visible label (named 'Who's joining' for screen readers); waitlist role 'I'm joining as' with A sender / A truck owner / An agent, stacked on phones; step 1 card says 'Tomorrow morning' and shows the price line as a label · DNS (Vercel + ImprovMX), PageSpeed on freight-africa.com, then Phase 1.
- 15 Nov 2026 · Launch page revised (D031, D032): Inter subset, floating pill header, 4-photo Nigerian slideshow (plates and adverts blurred, credits recorded, white text 4.78:1 or better on every photo), copy from launch-page-copy.md with no rates or amounts, font-coverage test, corridor arrows as icons · DNS (Vercel + ImprovMX), ImprovMX account, PageSpeed on Vercel, then Phase 1.
- 15 Nov 2026 · Phase 0 finished: Supabase linked and migrations applied, CI and drift green, Resend SMTP, domains added, design foundation and gallery · Launch page built with waitlist backend, screenshots reviewed at 5 widths, Lighthouse 93+ (CPU-calibrated) · DNS, contact email, real sign-up test, then Phase 1.

- 9 Nov 2026 · Launch page moved forward to right after Phase 0 (D030) · Finish Phase 0, then the launch page.
- 9 Nov 2026 · Supabase project ref corrected to czlowhaycaivpgimcefk (Freight Africa, eu-west-1, verified) · Governance documents created; scope document named docs/PLATFORM-SCOPE.md (full platform, D014) · Start Phase 0.
