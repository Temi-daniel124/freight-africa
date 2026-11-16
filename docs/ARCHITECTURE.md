# ARCHITECTURE.md, Freight Africa

**Authority level: 4 of 14.** Defers to `docs/DECISIONS.md`, `docs/PRODUCT.md` and `docs/DATA-MODEL.md`
(with `docs/SYSTEM-LOGIC.md`). Describes the system's parts, where they run, how they talk to each
other, the environments and accounts, and the repository layout.

---

## 1. The system in one picture, in words

- **One Next.js app** (App Router, TypeScript) on **Vercel** serves the public website, the installable
  PWA for every role (shipper, owner, driver, agent, staff) and the server-side API routes for
  webhooks and background work.
- **Supabase** (project **Freight Africa**, ref `czlowhaycaivpgimcefk`,
  `https://czlowhaycaivpgimcefk.supabase.co`) provides Postgres (the data and the money ledger), Auth,
  Storage (photos and documents), Realtime (live trips, load board, chat) and `pg_cron` for scheduled
  jobs. Business rules that move money or change trip state live in Postgres functions
  (`DATA-MODEL.md` §13).
- **External services:** Bachs (payments and payouts), Didit (identity checks; Smile ID as fallback),
  Meta WhatsApp Cloud API (messages and sign-in codes), Resend (email, including Supabase Auth email
  via SMTP), a Nigerian SMS provider (backup only), Web Push (VAPID, free), OpenStreetMap tiles with
  MapLibre (maps), OpenRouteService or self-hosted OSRM (routes and arrival times), Traccar
  (optional, for hardware GPS trackers), Sentry (errors).
- **GitHub** holds the code and runs CI on hosted runners: app checks, database tests with Docker,
  drift checks, migrations and backups (D025).

No other Supabase project is ever involved. The unrelated **Orayn_Main** project in the same
organisation is never touched (D026).

## 2. Components and responsibilities

| Part | Runs on | Responsibility |
| --- | --- | --- |
| Public website (`/`, `/routes/*`, `/help/*`…) | Vercel, server-rendered and static | Marketing, SEO, quotes, waitlist |
| PWA app shells (`/app/ship`, `/app/haul`, `/app/drive`, `/app/agent`) | Vercel; installed on phones and desktops | Every user-facing screen in `docs/planning/` |
| Receiver tracking (`/track/[token]`) | Vercel | Token-gated page with minimal data (`SYSTEM-LOGIC.md` §5.4) |
| Admin console (`/admin`, on `admin.freight-africa.com`, D033) | Vercel | Staff screens (`ux-admin.md`) |
| Route handlers (`/api/*`) | Vercel serverless functions (Node runtime) | Webhooks (Bachs, Didit, WhatsApp, Traccar), the job dispatcher, uploads signing, push subscription |
| Postgres + RLS + functions | Supabase | Data, ledger, state machines, access rules |
| `pg_cron` jobs | Supabase | Pure-SQL jobs run in the database (tracking states, expiries, auto-release, tiers) |
| Job dispatcher | `pg_cron` + `pg_net` calls `POST /api/jobs/dispatch` every minute with `JOBS_SECRET` | Sends queued notifications, executes queued payouts and refunds through providers, retries |
| Storage buckets | Supabase | `trip-media`, `documents`, `avatars`, `public-site` (only the last is public) |
| Realtime | Supabase | Trip timeline, load board, payouts, chat, admin live map |
| Service worker | Browser (Serwist) | Offline shell, cached data, queued actions, Web Push |

Why the dispatcher is called from the database: Vercel's Hobby plan limits cron schedules, while
`pg_cron` runs every minute for free. Work that needs only SQL stays in SQL; work that needs an outside
API goes through the dispatcher, which reads queue tables (`notifications`, `payouts`, `refunds`) and
processes them idempotently.

## 3. Key flows

### 3.1 Payment in

1. Shipper taps **Pay** → server action creates a `payments` row and asks Bachs (through the
   `PaymentProvider` interface) for a one-time collection account.
2. Bachs calls `POST /api/webhooks/bachs` when money arrives. The handler verifies the signature,
   records the event (idempotent on the provider reference), and calls `fund_load()` in Postgres.
3. `fund_load()` posts the ledger entries, sets the load to `funded`, and queues load alerts.

### 3.2 Money out

1. A verified code calls `release_advance()` or `release_balance()`, which post ledger entries and
   insert `payouts` rows (`queued`), each with an idempotency key.
2. The dispatcher sends each queued payout to Bachs with the same idempotency key and records the
   result; Bachs' status webhook confirms `paid` or `failed`; failures retry on the schedule in
   `SYSTEM-LOGIC.md` §7.5.
3. A daily reconciliation compares the ledger with Bachs.

### 3.3 Tracking

Driver phones in trip mode batch location points to `POST /api/tracking` (authenticated, rate-limited),
which inserts into `location_pings` and evaluates geofences, code timing and deviations. Traccar
forwards hardware tracker positions to `POST /api/webhooks/traccar`. `pg_cron` updates tracking states
every minute.

### 3.4 Messages

Everything outbound goes through one `notify()` service: it writes `notifications` rows per channel;
the dispatcher sends them (WhatsApp first, SMS if WhatsApp fails and SMS is enabled, email copy,
push). Delivery webhooks update the rows.

### 3.5 Identity checks

The app creates a Didit session server-side, opens Didit's verification in the app, and Didit calls
`POST /api/webhooks/didit` with the result, which updates `verification_sessions` and `profiles`.

## 4. Environments and accounts

| Thing | Value |
| --- | --- |
| Supabase project | **Freight Africa**, ref `czlowhaycaivpgimcefk`, URL `https://czlowhaycaivpgimcefk.supabase.co` |
| Supabase project never to touch | **Orayn_Main** (same organisation) |
| GitHub | Private repository `Temi-daniel124/freight-africa` (created by Claude Code) |
| Commit author | `Temi-daniel124 <temmydaniel124@gmail.com>` (D024) |
| Vercel | Project `freight-africa`, production branch `main`, preview deployments for pull requests |
| Domain | `freight-africa.com` (DNS at GoDaddy); app and site on the apex and `www` |
| Email | Resend, verified sending domain `mail.freight-africa.com`; sender `Freight Africa <no-reply@mail.freight-africa.com>` |
| Supabase Auth email | Custom SMTP through Resend (`smtp.resend.com`, port 465, user `resend`, password = Resend API key) |

**One database until launch (D029).** Local development connects to the remote project; previews and
production also use it until launch. After launch, migrations run only through the `migrate` workflow.

**No local Docker (D025).** The laptop never runs `supabase start`; CI runners do all Docker work.

## 5. Repository layout

```
freight-africa/
├─ AGENT.md · CLAUDE.md · BUILD.md · SECURITY.md · DESIGN_SYSTEM.md · README.md
├─ docs/
│  ├─ DECISIONS.md · PRODUCT.md · DATA-MODEL.md · SYSTEM-LOGIC.md · ARCHITECTURE.md
│  ├─ ROLES-AND-PERMISSIONS.md · PLATFORM-SCOPE.md · PROJECT-STATE.md
│  ├─ DEVELOPMENT-WORKFLOW.md · TOOLING-POLICY.md
│  └─ planning/ (screen specs, annexes of PLATFORM-SCOPE.md)
├─ public/
│  └─ brand/ (logo kit: svg/, png/, web/)
├─ src/
│  ├─ app/
│  │  ├─ (site)/           public website pages
│  │  ├─ (auth)/auth/      sign-in, code, onboarding entry
│  │  ├─ app/ship/ · app/haul/ · app/drive/ · app/agent/    role shells
│  │  ├─ admin/            staff console
│  │  ├─ track/[token]/    receiver and pickup contact pages
│  │  ├─ api/              webhooks/, jobs/, tracking/, push/
│  │  ├─ manifest.ts · robots.ts · sitemap.ts · icon.svg · apple-icon.png · favicon.ico
│  │  └─ layout.tsx · globals.css (design tokens in one @theme block)
│  ├─ components/
│  │  ├─ ui/               shadcn and adapted Watermelon components
│  │  └─ brand/            Logo, RoadLine, TruckMarker
│  ├─ features/            one folder per domain: booking, loads, trips, money, kyc, trucks, agents, admin…
│  ├─ lib/
│  │  ├─ supabase/         client.ts (browser), server.ts (server), admin.ts (secret key, server only),
│  │  │                    session.ts (session refresh for src/proxy.ts), database.types.ts (generated)
│  │  ├─ payments/         provider.ts (interface), bachs.ts
│  │  ├─ verification/     provider.ts, didit.ts, smile-id.ts
│  │  ├─ notify/           notify.ts, whatsapp.ts, email.ts, sms.ts, push.ts
│  │  ├─ money.ts          kobo helpers, formatting
│  │  ├─ env.ts            validated public environment variables (zod)
│  │  └─ env.server.ts     validated server secrets (zod, server only)
│  └─ messages/en.json     all user-facing text (D017)
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/          hand-written SQL migrations (D025)
│  ├─ tests/               pgTAP tests (RLS, functions, ledger)
│  └─ seed.sql             catalogue, corridors, truck types, settings
├─ tests/                  Vitest unit tests
├─ e2e/                    Playwright end-to-end and screenshot tests
├─ scripts/                check-git-identity.mjs, check-supabase-target.mjs, configure-auth-smtp.mjs, configure-auth-settings.mjs
├─ .githooks/              pre-commit, commit-msg
├─ .github/workflows/      ci.yml, migrate.yml, backup.yml
├─ .claude/settings.json   Claude Code: no attribution lines, Docker commands denied
├─ .mcp.json               Supabase MCP scoped to czlowhaycaivpgimcefk
└─ .env.example · .gitattributes · .gitignore · .nvmrc
```

## 6. Technical choices and why

| Area | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (latest stable, App Router), React, TypeScript strict | One codebase for site, PWA and API; server rendering for SEO |
| Styling | Tailwind CSS v4 with one `@theme` token block; shadcn components; adapted Watermelon UI (D023) | Matches the component library; tokens enforce the design system |
| Motion | `motion` with `LazyMotion`; `@number-flow/react` | Required by the components; kept small |
| Data access | Supabase JS client with `@supabase/ssr`; server actions and route handlers for writes | RLS enforced; secrets stay on the server |
| Validation | zod at every boundary (forms, route handlers, webhooks, env) | One schema language |
| Client state | Server components first; TanStack Query for live client data with Realtime invalidation | No global store needed |
| PWA | Serwist (service worker, offline, push) | Maintained successor to next-pwa |
| Maps | MapLibre GL + OpenStreetMap tiles; directions hand off to Google/Apple Maps | Free; drivers keep their usual navigation app |
| OCR | Tesseract.js on the phone (plates, expiry dates), always confirmed by the user | No per-photo cost |
| Errors | Sentry free plan | Know about failures before users do |
| Tests | Vitest, Playwright (including screenshot tests), pgTAP in CI | See `docs/DEVELOPMENT-WORKFLOW.md` |

Exact versions are pinned in `package-lock.json`; `docs/TOOLING-POLICY.md` governs additions.

## 7. Limits to know

| Limit | Effect | Plan |
| --- | --- | --- |
| Supabase free plan: 500 MB database, 1 GB storage, pauses after about a week without activity, no automatic daily backups | Photos and pings grow quickly; a paused project stops the app | Photos compressed on the phone; pings aggregated after 12 months; the nightly `backup` workflow also keeps the project active and stores an encrypted dump; upgrade to Pro with revenue |
| Vercel Hobby plan: personal, non-commercial use under Vercel's terms; limited cron | A commercial launch should be on Pro | Jobs run from `pg_cron`; move to Vercel Pro before taking paid trips (`docs/PROJECT-STATE.md` §5) |
| WhatsApp unverified business: 250 unique recipients per 24 hours (D021) | About 50 new trips a day | Limit shown in the admin console |
| GitHub Free private repositories: branch protection rules may not be available | `main` can't be locked by settings | The workflow in `docs/DEVELOPMENT-WORKFLOW.md` is followed instead |
