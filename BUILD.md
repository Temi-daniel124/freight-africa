# BUILD.md, Freight Africa

**Authority level: 12 of 14.** The build plan: Phase 0 (bootstrap) step by step with exact commands,
then phases 1 to 8 in the fixed order of `docs/PLATFORM-SCOPE.md` §6 (D014), each with acceptance criteria.
Every phase is built as a series of slices through the loop in `docs/DEVELOPMENT-WORKFLOW.md` §1.
Progress is recorded in `docs/PROJECT-STATE.md` §2.

---

## 1. Lifecycle

```
Phase 0 Bootstrap ─► 1 Foundations ─► 2 Supply ─► 3 Booking & money ─► 4 The trip
   ─► 5 Problems ─► 6 Growth ─► 7 Website & SEO ─► 8 Hardening & launch
```

- Phases run in this order; a phase starts when the previous one's acceptance criteria are met.
- The admin console screens for each area are built **in the same phase** as the feature they control
  (for example, the verification queue in Phase 2, money pages in Phase 3).
- If a phase waits on a founder item (`PROJECT-STATE.md` §4), build everything around it against the
  provider interface with a test double, and ask for the item early.

---

## 2. Phase 0: Bootstrap (first session)

Goal: an empty but real product: repository, scaffold, CI green, Vercel deploying, Supabase linked,
Auth email sending through Resend, and the design foundation in place. Commands are written for the
founder's Windows laptop (PowerShell) in `C:\Users\hp\Documents\Freight Africa`.

### 0.1 Check the tools

```powershell
node -v      # needs v24 (LTS). If missing or older: winget install OpenJS.NodeJS.LTS
git --version   # if missing: winget install Git.Git
gh --version    # if missing: winget install --id GitHub.cli   (or use the GitHub connector)
```

### 0.2 Start the repository and fix the commit identity (D024)

```powershell
cd "C:\Users\hp\Documents\Freight Africa"
git init -b main
git config user.name "Temi-daniel124"
git config user.email "temmydaniel124@gmail.com"
git config core.hooksPath .githooks
node scripts/check-git-identity.mjs        # must print OK
```

### 0.3 Check the Supabase target (D026)

```powershell
node scripts/check-supabase-target.mjs     # before linking it prints "not linked yet" and passes
```

### 0.4 Scaffold Next.js beside the repository, then move it in

`create-next-app` refuses a folder that already has files, so it runs in a temporary sibling folder.

```powershell
cd "C:\Users\hp\Documents"
npx create-next-app@latest fa-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
robocopy fa-scaffold "Freight Africa" /E /XD .git node_modules /XF README.md .gitignore CLAUDE.md AGENTS.md
Remove-Item -Recurse -Force fa-scaffold
cd "C:\Users\hp\Documents\Freight Africa"
npm install
```

Then in `package.json`: set `"name": "freight-africa"`, `"private": true`,
`"engines": { "node": ">=24" }`, and these scripts:

```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "eslint .",
"typecheck": "tsc --noEmit",
"test": "vitest run",
"e2e": "playwright test",
"format": "prettier --write ."
```

Our `.gitignore`, `README.md` and `CLAUDE.md` are kept (excluded from the copy, along with any
`AGENTS.md` the scaffold makes; this repository's agent manual is `AGENT.md`). Check that
`tsconfig.json` has `"strict": true`.

### 0.5 Install the approved dependencies (`docs/TOOLING-POLICY.md` §2)

```powershell
npm install @supabase/supabase-js @supabase/ssr zod @tanstack/react-query react-hook-form @hookform/resolvers motion @number-flow/react react-use-measure lucide-react maplibre-gl @serwist/next serwist web-push resend @sentry/nextjs server-only date-fns date-fns-tz qrcode
npm install -D supabase vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom @playwright/test prettier prettier-plugin-tailwindcss @types/web-push @types/qrcode
npx shadcn@latest init
npx playwright install chromium
```

`tesseract.js` and `three` are added later, in the phases that use them.

### 0.6 Link Supabase (no Docker, D025)

```powershell
npx supabase init                          # creates supabase/config.toml; answer "no" to editor settings
npx supabase login                         # founder approves once in the browser
$env:SUPABASE_DB_PASSWORD = "<founder supplies>"   # for this session only, never written to a file
npx supabase link --project-ref czlowhaycaivpgimcefk
node scripts/check-supabase-target.mjs     # must print OK
npx supabase migration list                # empty, no error
```

When Claude Code first uses the project-scoped Supabase server from `.mcp.json`, the founder approves
its sign-in once in the browser.

Get the API keys for `czlowhaycaivpgimcefk` (Supabase connector `get_publishable_keys` with that
`project_id`, or the Management API) and write `.env.local` from `.env.example`:
`NEXT_PUBLIC_SUPABASE_URL=https://czlowhaycaivpgimcefk.supabase.co`, the publishable key and the secret
key. Generate `JOBS_SECRET`, `CODE_HMAC_SECRET` and `TRACK_TOKEN_SECRET` with
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.

### 0.7 First migration and first test

```powershell
npx supabase migration new foundation_extensions
```

Contents: enable `pg_cron`, `pg_net` and `pgcrypto`; create the private schema for internal functions;
set the database time zone handling (`timestamptz` everywhere). Add `supabase/tests/000_smoke.test.sql`
(a pgTAP test that checks the extensions exist). It is pushed to the remote project only after CI's
`database` job is green (step 0.9).

### 0.8 First commit and the GitHub repository

```powershell
node scripts/check-git-identity.mjs
git add -A
git commit -m "chore: bootstrap Freight Africa"
gh api user --jq .login                    # must print Temi-daniel124
gh repo create Temi-daniel124/freight-africa --private --source . --remote origin --push
```

Add the Actions secrets (values never printed):

```powershell
gh secret set SUPABASE_ACCESS_TOKEN        # personal access token, from the founder (PROJECT-STATE §4)
gh secret set SUPABASE_DB_PASSWORD
gh secret set SUPABASE_PUBLISHABLE_KEY
gh secret set BACKUP_PASSPHRASE            # generate a long random value; also give it to the founder to keep offline
```

### 0.9 CI green, then push the migration

```powershell
gh run watch                               # ci.yml: author-check, app, database must all pass
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list                # local and remote match
```

### 0.10 Vercel

1. Confirm the Vercel account is signed in through GitHub `Temi-daniel124`.
2. Create the project **freight-africa** from the GitHub repository (Vercel connector, or
   `npx vercel link --yes --project freight-africa` then `npx vercel git connect`). Framework: Next.js.
   Production branch: `main`.
3. Add the environment variables from `.env.example` for Production, Preview and Development (values
   from `.env.local`; `NEXT_PUBLIC_SITE_URL` is `https://freight-africa.com` in Production and the
   preview URL in Preview).
4. Trigger a deployment from `main` and confirm its state is **Ready**, not **Blocked**. If blocked,
   follow `docs/DEVELOPMENT-WORKFLOW.md` §3.4.

### 0.11 Resend as Supabase Auth's email sender

1. With the Resend connector, confirm `mail.freight-africa.com` is **verified**.
2. Create an API key named `supabase-auth-smtp` with **sending access only**, restricted to that domain.
   Create a second key `app-email` the same way for the app's own emails (`RESEND_API_KEY` in Vercel).
3. Run the script (it only ever targets `czlowhaycaivpgimcefk`):

```powershell
$env:SUPABASE_ACCESS_TOKEN = "<token>"
$env:RESEND_SMTP_KEY = "<supabase-auth-smtp key>"
node scripts/configure-auth-smtp.mjs
```

It sets: custom SMTP on, host `smtp.resend.com`, port `465`, user `resend`, password = the key, sender
`Freight Africa <no-reply@mail.freight-africa.com>`, the site URL, and the allowed redirect URLs
(`https://freight-africa.com/**`, `https://www.freight-africa.com/**`, `http://localhost:3000/**`, and the
project's Vercel preview pattern, which you read from Vercel and pass as `PREVIEW_URL_PATTERN`).

4. Test: sign up with the founder's email on the preview deployment; the code email must arrive from
   `no-reply@mail.freight-africa.com` and show as delivered in Resend's logs.
5. Supabase sets a low limit (30 emails per hour) after custom SMTP is saved. Leave it until launch;
   raise it in Phase 8.

### 0.12 Domain

Add `freight-africa.com` and `www.freight-africa.com` to the Vercel project, read the exact DNS records
Vercel asks for, and give the founder click-by-click GoDaddy steps with those values
(`PROJECT-STATE.md` §4). Verify both domains show **Valid Configuration**. Never remove or change the
existing Resend records for `mail.freight-africa.com`.

### 0.13 Design foundation

1. Tokens: one `@theme` block in `src/app/globals.css` with every colour, radius, shadow, spacing and
   type token from `DESIGN_SYSTEM.md` §1 to §5 (light theme only; buttons radius 45px).
2. Figtree through `next/font/google`; Lucide icons.
3. Brand: wire `public/brand/web` (favicon, apple touch icon, 192/512 icons, maskable icon, Open Graph
   image) into `src/app/icon.svg`, `apple-icon.png`, `favicon.ico`, `manifest.ts` and the root
   metadata. `src/components/brand/Logo.tsx` renders the SVGs from `public/brand/svg`.
4. `/dev/components` gallery (development and preview only): buttons (all variants and states), inputs,
   cards, list rows, bottom navigation, sheets, toasts, empty states, skeletons.
5. Playwright screenshot tests for the gallery at 375, 768, 1280 and 1440 px.
6. `.claude/settings.json`, `.mcp.json`, hooks, workflows and scripts from the starter files are in
   place and committed.

### Phase 0 acceptance

- [ ] Private repository `Temi-daniel124/freight-africa` exists; every commit authored by
      `Temi-daniel124 <temmydaniel124@gmail.com>`; no `Co-authored-by` lines.
- [ ] `ci.yml` green: `author-check`, `app`, `database`; `drift` green on `main`.
- [ ] Vercel production deployment of `main` is **Ready**; a pull request gets a **Ready** preview.
- [ ] `check-supabase-target.mjs` prints OK; `migration list` matches; Orayn_Main untouched.
- [ ] A Supabase Auth email arrived through Resend from `no-reply@mail.freight-africa.com`.
- [ ] Design tokens, font, logo, icons and manifest in place; gallery screenshots reviewed.
- [ ] `backup.yml` ran once by hand and produced an encrypted artifact.
- [ ] `docs/PROJECT-STATE.md` updated.

---

## 3. Phases 1 to 8

Scope for each phase is in `docs/PLATFORM-SCOPE.md` §4, screens in `docs/planning/`, tables and rules in
`docs/DATA-MODEL.md` and `docs/SYSTEM-LOGIC.md`, access in `docs/ROLES-AND-PERMISSIONS.md`.

### Phase 1: Foundations
Auth (email code, WhatsApp code when ready, Google when the OAuth client exists), profiles,
organisations and members with sub-roles, account switcher, staff members and two-step sign-in for
staff, RLS framework and helper functions, settings table with every value from `SYSTEM-LOGIC.md`,
the ledger (accounts, entries, posting function, balance checks), audit log, tokens for tracking
links, notifications table and `notify()`, job dispatcher (`pg_cron` + `pg_net` → `/api/jobs/dispatch`),
`en.json` text system, app shells with bottom navigation for each role, sign-in and onboarding entry.

**Accept when:** a person can sign up, create a shipper or transporter organisation, invite members
with each sub-role, and switch accounts; staff sign in with two-step sign-in; every
`ROLES-AND-PERMISSIONS.md` §2, §3 and §7 rule that exists so far has pgTAP tests; a ledger posting that
doesn't balance is refused; the dispatcher processes a queued test notification exactly once; shells
pass screenshot review.

### Phase 2: Supply
Owner and owner-driver onboarding, driver invitations and onboarding, Didit sessions and webhook
(Smile ID behind the same interface), trucks with photos, plate reading (Tesseract.js), documents with
expiry reminders, trackers registration, truck types and goods catalogue, bank account with name check,
the staff verification queue and truck inspection tasks.

**Accept when:** an owner can go from sign-up to verified with a truck and a driver using Didit's
sandbox; expired documents block load acceptance; the verification queue approves and rejects with
reasons and an audit trail; a driver can't see any money table (pgTAP).

### Phase 3: Booking and money
Quotes from lane prices and settings, booking flow with multiple drop-offs, saved places and receivers,
`PaymentProvider` with Bachs (collection accounts, webhooks, payouts, refunds), `fund_load()`,
`release_advance()`, `release_balance()`, fees and discounts, refunds and charges, receipts and
statements, value limits by tier, admin money pages, approvals, daily reconciliation.

**Accept when:** using Bachs test mode, a booking is paid by transfer, funded by webhook exactly once
even when the webhook repeats, and every naira is accounted for in the ledger; the worked example in
`docs/PRODUCT.md` §7 produces exactly ₦1,030,000 / ₦400,000 / ₦550,000 / ₦80,000; refunds and two-person
approvals work; card payments exist but are switched off (D020).

### Phase 4: The trip
Load board (Realtime, Gold early access), accept and counter-offer, assignment and driver
confirmation, trip states, driver flow with trip mode (Wake Lock, batched locations, offline queue),
loading and delivery codes (HMAC, geofence, attempts), photos and seal, receiver and pickup pages
(`/track/[token]`), phone visibility through `trip_contacts()`, WhatsApp, email, SMS backup and push
notifications, tracking states and gap escalation, live map for staff.

**Accept when:** a full trip runs end to end on two real phones (shipper and driver) on the preview
deployment: book, pay, accept, confirm, load with code, advance queued, travel with tracking, deliver
with code, balance queued, ratings; numbers appear and disappear exactly as `ROLES-AND-PERMISSIONS.md`
§6 says; a tracking gap escalates at 15, 30 and 60 minutes.

### Phase 5: Problems
Disputes with evidence and partial holds, SOS, cancellations and the cancellation fee, waiting charges,
breakdowns and truck swaps, route deviation and long-stop alerts, fraud flags and strikes, staff
playbooks for every worst case in `SYSTEM-LOGIC.md`.

**Accept when:** every worst case listed in `SYSTEM-LOGIC.md` has a test or a scripted run-through that
ends in the documented outcome, and the money in each ends where the rules say.

### Phase 6: Growth
Return loads (Next load), agents (invites, attribution, reminders, earnings, payouts, switch), volume
discounts and launch offers, promotions, ratings, track record and tiers with their benefits.

**Accept when:** an agent's referral earns the right share for six months and stops; tier changes
recalculate advances, commission and early access; turning `agents_enabled` off hides the role
everywhere.

### Phase 7: Website and SEO
Public pages from `docs/planning/ux-public-and-auth.md` and `DESIGN_SYSTEM.md` §13: home with hero, route
pages per corridor, pricing, how it works, help centre, legal pages, waitlist and quote widget;
metadata, `sitemap.ts`, `robots.ts`, Open Graph images, structured data; real photography.

**Accept when:** Lighthouse on a mid-range phone profile scores 90+ for performance, accessibility,
best practices and SEO on the home and route pages; every page passes screenshot review at all four
widths.

### Phase 8: Hardening and launch
Security review against `SECURITY.md`, an independent review of money, auth and RLS code, tests on a
low-cost Android phone over a slow 3G profile, backup restore drill (restore a `backup.yml` dump into a
CI database and run the tests), load test of the dispatcher, staff playbooks complete, Bachs and Didit
switched to live (founder approval), Auth email limit raised, Vercel plan moved to Pro before paid trips,
launch checklist below.

**Launch checklist:**
- [ ] All phases accepted; no open findings.
- [ ] Live keys in Vercel Production only; test keys removed from Production.
- [ ] `migrate.yml` is the only path for database changes from now on (D029).
- [ ] Monitoring: Sentry alerts, nightly backups, reconciliation report, WhatsApp limit in admin.
- [ ] Founder signs off on fees and settings in the admin console.
