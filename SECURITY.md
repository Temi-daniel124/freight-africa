# SECURITY.md, Freight Africa

**Authority level: 13 of 14.** How Freight Africa protects money, personal data, accounts and its
infrastructure. Every pull request is reviewed against the checklist in §16. Where this document and a
higher one differ, the higher one wins, except that a security control may only be **weakened** with
the founder's written approval recorded in `docs/DECISIONS.md`.

---

## 1. The Supabase project guard (D026)

| | |
| --- | --- |
| **The only project** | **Freight Africa** |
| Project ref | `czlowhaycaivpgimcefk` |
| Project URL | `https://czlowhaycaivpgimcefk.supabase.co` |
| Realtime | `wss://czlowhaycaivpgimcefk.supabase.co` |
| **Never touched** | **Orayn_Main**, an unrelated project in the same Supabase organisation |

Rules:
- No tool (CLI, MCP, Management API, SQL, dashboard) is ever pointed at any project other than
  `czlowhaycaivpgimcefk`. Orayn_Main is not read, listed for action, linked, queried, changed, paused,
  restored or backed up.
- `scripts/check-supabase-target.mjs` runs before every `link`, `db push` and type generation, and at the
  start of every session. CI workflows hard-code the ref and refuse to run with any other.
- `.mcp.json` defines a Supabase MCP server scoped to this project only (`?project_ref=czlowhaycaivpgimcefk`).
  Org-wide Supabase tools, if present, are called with `project_id: "czlowhaycaivpgimcefk"` explicitly.
- `NEXT_PUBLIC_SUPABASE_URL` must equal `https://czlowhaycaivpgimcefk.supabase.co` in every environment;
  `src/lib/env.ts` refuses to start otherwise.

## 2. Secrets

- Never committed. `.env*` files are git-ignored except `.env.example`, which has names only.
- Never printed in chat, logs, error messages, issues, pull requests or screenshots.
- Live in: Vercel environment variables (app), GitHub Actions secrets (CI), the laptop's `.env.local`
  (development), Supabase Vault (secrets the database needs, such as `JOBS_SECRET` for `pg_net`).
- Provider keys are created with the least access available (Resend: sending only, one domain).
- Rotation: on any suspected leak, immediately, and at launch for every development key. Rotation after
  launch needs the founder's approval (D027) but a leak is rotated first and reported after.

### 2.1 Environment variables

| Name | Where | Public? | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel, `.env.local` | Yes | `https://czlowhaycaivpgimcefk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel, `.env.local` | Yes | Browser client (RLS applies) |
| `SUPABASE_SECRET_KEY` | Vercel, `.env.local` | **No** | Server-only admin client; bypasses RLS |
| `NEXT_PUBLIC_SITE_URL` | Vercel, `.env.local` | Yes | Absolute links |
| `JOBS_SECRET` | Vercel, Supabase Vault | No | Authenticates `pg_net` calls to `/api/jobs/dispatch` |
| `CODE_HMAC_SECRET` | Vercel | No | Loading and delivery codes |
| `TRACK_TOKEN_SECRET` | Vercel | No | Receiver and pickup tracking links |
| `BACHS_API_KEY`, `BACHS_WEBHOOK_SECRET`, `BACHS_BASE_URL` | Vercel | No | Payments |
| `DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET`, `DIDIT_WORKFLOW_OWNER`, `DIDIT_WORKFLOW_DRIVER` | Vercel | No | Identity checks |
| `SMILE_ID_PARTNER_ID`, `SMILE_ID_API_KEY` | Vercel | No | Fallback identity checks |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | Vercel | No | WhatsApp Cloud API |
| `RESEND_API_KEY`, `EMAIL_FROM` | Vercel | No | App emails (`app-email` key) |
| `SMS_PROVIDER_API_KEY`, `SMS_SENDER_ID` | Vercel | No | SMS backup (optional) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Vercel | Public / **No** | Web Push |
| `ORS_API_KEY` | Vercel | No | Routes and arrival times |
| `TRACCAR_WEBHOOK_SECRET` | Vercel | No | Hardware tracker forwarding |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | Vercel | Yes / **No** | Errors and source maps |
| `SUPABASE_ACCESS_TOKEN` | GitHub secret, laptop session only | No | CLI and Management API |
| `SUPABASE_DB_PASSWORD` | GitHub secret, laptop session only | No | `link`, `db push`, `db dump` |
| `SUPABASE_PUBLISHABLE_KEY` | GitHub secret | Yes | Backup workflow health ping |
| `BACKUP_PASSPHRASE` | GitHub secret, founder offline copy | No | Encrypts nightly dumps |

The Resend key used as Supabase's SMTP password is stored only inside Supabase Auth settings.

### 2.2 Keys in code

- `src/lib/supabase/admin.ts` (secret key) starts with `import "server-only"` and is used only in
  route handlers, server actions and jobs that genuinely need to bypass RLS; each use has a comment
  saying why.
- No `NEXT_PUBLIC_` variable ever holds a secret.

## 3. Authentication

- Supabase Auth: email one-time codes (through Resend SMTP), WhatsApp codes (through our own
  function, rate-limited), Google sign-in. No passwords stored by us.
- Staff: two-step sign-in (TOTP) required; 12-hour sessions; the admin console refuses a session
  without a verified second factor (`aal2`).
- Users: long-lived refresh on their own phone, with "Sign out of all devices" in settings; sensitive
  actions (bank account change, team role change) need a fresh code.
- Sign-in and code endpoints are rate-limited per phone, email and IP (§10).
- Redirect URLs restricted to the domain, `localhost:3000` and the project's Vercel previews.

## 4. Authorisation and RLS

- RLS is enabled on **every** table in exposed schemas, in the same migration that creates it. Default
  deny; each policy matches a row in `docs/ROLES-AND-PERMISSIONS.md`.
- Internal functions live in a non-exposed `private` schema. `security definer` functions set
  `search_path = ''` and check the caller's rights themselves.
- Money, trip-state and code functions are callable only from server code (granted to
  `service_role`, revoked from `anon` and `authenticated`), except where a function exists to be
  called by users and does its own checks.
- Append-only tables (`trip_events`, `audit_log`, ledger entries) have triggers that refuse update and
  delete.
- pgTAP tests prove allowed and denied access for every role (`ROLES-AND-PERMISSIONS.md` §10); CI
  blocks merging when one fails.
- Supabase security advisors are checked after every migration; findings are fixed, not ignored.

## 5. Money safety

- Double-entry ledger in kobo; every posting balances to zero inside one transaction.
- Every external money call (collection account, payout, refund) has an idempotency key stored before
  the call; retries reuse it.
- Payouts go only to the bank account whose name matched the verified owner; a changed bank account
  holds payouts for 24 hours and notifies the owner on all channels.
- Two-person approval for the items in `ROLES-AND-PERMISSIONS.md` §8.
- Daily reconciliation of the ledger against Bachs; any difference raises an alert to finance.
- Test keys only before launch; switching to live needs the founder (D027).

## 6. Webhooks

For Bachs, Didit, WhatsApp and Traccar:
- Read the **raw** body; verify the provider's signature (HMAC with the webhook secret) with a
  constant-time comparison before parsing.
- Reject events older than the provider's tolerance (5 minutes where a timestamp is signed).
- Store the provider's event ID with a unique constraint; a repeat is acknowledged and ignored.
- Respond fast; heavy work is queued for the dispatcher.
- Never trust amounts or statuses from the webhook alone where the provider offers a verification
  call; confirm the transaction by API before funding a load.

## 7. Codes and tracking links

- Loading and delivery codes: 6 digits, derived with HMAC (`CODE_HMAC_SECRET`), stored hashed,
  accepted only inside the stop's geofence (with a staff override that is logged), 5 attempts then
  locked, expire with the stop.
- Tracking links: random tokens signed with `TRACK_TOKEN_SECRET`, scoped to one stop, showing only the
  minimal data in `ROLES-AND-PERMISSIONS.md` §5, expiring 72 hours after the stop completes.

## 8. Storage and files

- Buckets `trip-media`, `documents`, `avatars` are **private**; files are served through short-lived
  signed URLs (minutes) after a permission check. Only `public-site` is public.
- Uploads: type and size checked on the client and the server (images JPEG/PNG/WebP, PDFs for
  documents, size limits from settings); images re-encoded and compressed on the phone.
- Evidence photos keep their capture time and location inside our system; copies shown to other
  parties strip location metadata.

## 9. Web security headers

Set in `next.config.ts` (and nonce-based CSP in middleware):
- `Content-Security-Policy`: `default-src 'self'`; scripts `'self'` with a nonce; `connect-src 'self'`
  `https://czlowhaycaivpgimcefk.supabase.co` `wss://czlowhaycaivpgimcefk.supabase.co`, Sentry, the
  route service and map tiles; `img-src 'self' data: blob:` plus Supabase storage and map tiles;
  `frame-src` only Didit; `worker-src 'self' blob:`; `frame-ancestors 'none'`; `object-src 'none'`.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), geolocation=(self), microphone=(), payment=()`

## 10. Abuse and rate limits

Without paid services, limits are enforced in Postgres (a `rate_limits` table and a
`check_rate_limit(key, limit, window)` function) and checked in route handlers:
sign-in codes, code attempts, tracking pings, booking creation, agent reminders, webhook endpoints by
IP, and receiver problem reports. Limits are settings. Suspicious patterns raise fraud flags
(`SYSTEM-LOGIC.md`).

## 11. Personal data (Nigeria Data Protection Act 2023)

- Collect only what a feature needs; identity images stay with Didit where possible and we store the
  result and reference.
- Privacy notice and consent at sign-up; purpose stated for location tracking (only in trip mode).
- Phone numbers and emails never readable by other users except through `trip_contacts()` (D018).
- Staff access to identity images, full bank numbers or NIN is logged with the reason.
- Retention: location pings summarised after 12 months; closed accounts anonymised after the legal
  retention period for financial records; evidence kept while a dispute or claim can be raised.
- People can download their data and ask for deletion from settings; requests are handled within the
  law's time limits.
- A personal-data breach is reported to the Nigeria Data Protection Commission within 72 hours and to
  affected people without delay where the risk is high.

## 12. Backups and recovery

- Supabase Free has no automatic daily backups, so `backup.yml` runs nightly: `db dump` of roles,
  schema and data on the GitHub runner, encrypted with `BACKUP_PASSPHRASE` (AES-256 via gpg), kept as
  a workflow artifact for 30 days. It also pings the project so it isn't paused for inactivity.
- GitHub turns off scheduled workflows after 60 days without repository activity; the session ritual
  keeps the repository active, and the admin console shows the last backup time.
- A restore drill runs in Phase 8 and then every quarter: restore the latest dump into a CI database
  and run the full pgTAP suite.

## 13. Dependencies and the supply chain

- npm with a committed lockfile; `npm ci` in CI; `npm audit --audit-level=high` blocks merging.
- Dependabot alerts on; updates made by Claude Code as `Temi-daniel124` (no bot pull requests, D024);
  only approved packages (`docs/TOOLING-POLICY.md`).
- GitHub Actions pinned to major versions from trusted publishers (`actions/*`, `supabase/setup-cli`).

## 14. Logging and audit

- `audit_log` records every staff action, every money action, role changes, setting changes, and
  sensitive data views: who, what, when, before and after.
- Application logs and Sentry never contain secrets, codes, full bank numbers, NIN or identity images.
  Phone numbers and emails are masked.

## 15. Incidents

1. **Contain:** revoke or rotate the affected key; switch off the affected feature with its setting
   (payments, payouts, agents, sign-ups all have switches).
2. **Assess:** what data or money is affected, from `audit_log`, ledger and provider dashboards.
3. **Tell:** the founder at once; affected users and the regulator as §11 requires.
4. **Fix and learn:** a fix through the normal loop, a test that would have caught it, and a short
   write-up added to `docs/DECISIONS.md` if a rule changes.

Security reports from outside go to the founder's email (temmydaniel124@gmail.com) until a dedicated
address exists.

## 16. Pull request security checklist

- [ ] New tables have RLS enabled and policies, with pgTAP allowed and denied tests.
- [ ] No secret in client code, logs, fixtures, screenshots or commits; new env vars added to
      `.env.example`, §2.1 and `src/lib/env.ts`.
- [ ] Input validated with zod on the server; output never includes another user's contact details.
- [ ] Webhooks verify signatures on the raw body and are idempotent.
- [ ] Money changes post balanced ledger entries with idempotency keys.
- [ ] Files are private and served through signed URLs.
- [ ] Only `czlowhaycaivpgimcefk` referenced; Orayn_Main never mentioned in code or config.
- [ ] Supabase security advisors clean after the migration.
