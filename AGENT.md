# AGENT.md, Freight Africa

**Authority level: 10 of 14.** The operating manual for any AI agent working in this repository
(Claude Code first). It defers to every document in `docs/` and summarises how to behave; where it
repeats a rule, the higher document is the source.

---

## 1. Mission

Build **Freight Africa**: a prepaid, escrow-protected marketplace for full truckloads on four Nigerian
corridors, as one installable web app for shippers, truck owners, drivers, agents and staff
(`docs/PRODUCT.md`). Build the **full platform** in the order in `BUILD.md` (D014), every feature at
launch, and make it **pixel-perfect, simple and calm**, never generic or AI-looking (`DESIGN_SYSTEM.md`).

You work for the founder, **Temi-daniel124** (temmydaniel124@gmail.com). You operate GitHub, Vercel,
Supabase and Resend end to end on the founder's behalf (D027). Don't hand those jobs back to the
founder; ask only for the items listed in `docs/PROJECT-STATE.md` §4, at the moment they are needed.

## 2. The documents and their order of authority (D028)

When two documents disagree, the one higher in this list wins.

| # | Document | Holds |
| --- | --- | --- |
| 1 | `docs/DECISIONS.md` | Final decisions D001 onwards |
| 2 | `docs/PRODUCT.md` | What the product is, users, money, trip flow |
| 3 | `docs/DATA-MODEL.md` (+ annex `docs/SYSTEM-LOGIC.md`) | Tables, functions, states, rules, edge cases |
| 4 | `docs/ARCHITECTURE.md` | System parts, environments, repository layout |
| 5 | `docs/ROLES-AND-PERMISSIONS.md` | Who can see and do what |
| 6 | `docs/PLATFORM-SCOPE.md` (+ annexes `docs/planning/*.md`) | Every feature and every screen |
| 7 | `docs/PROJECT-STATE.md` | Where the build stands; next task |
| 8 | `docs/DEVELOPMENT-WORKFLOW.md` | The loop; commit identity; Docker-free database work |
| 9 | `docs/TOOLING-POLICY.md` | Allowed packages and services |
| 10 | `AGENT.md` | This manual |
| 11 | `CLAUDE.md` | Claude Code session rules |
| 12 | `BUILD.md` | Phases, steps, acceptance criteria |
| 13 | `SECURITY.md` | Secrets, access, data protection |
| 14 | `DESIGN_SYSTEM.md` | Every visual rule |

Exception: for visual questions, `DESIGN_SYSTEM.md` is the detailed source; higher documents override
it only where they state a visual rule explicitly.

## 3. Non-negotiables

1. **Prepaid, always.** No trip runs without the shipper's full payment held in escrow (D001).
2. **Money is exact.** Kobo as `bigint`; every movement is a balanced double-entry ledger posting made
   inside a Postgres function with an idempotency key. No floating point, no money maths in the browser.
3. **Security on the server.** RLS on every table; permissions from `ROLES-AND-PERMISSIONS.md`; the
   interface hides, the server enforces.
4. **Drivers never see money** (D003). **Phone numbers only during a live trip** (D018).
5. **Commit identity:** every commit authored by `Temi-daniel124 <temmydaniel124@gmail.com>`, with no
   `Co-authored-by` lines; verified before each session's first commit (D024).
6. **No Docker on the laptop.** No `supabase start`, `db reset`, `db diff`, `db pull`, `db dump` or
   `test db` locally; those run in GitHub Actions (D025).
7. **Only the Freight Africa Supabase project** (`czlowhaycaivpgimcefk`). The **Orayn_Main** project in
   the same organisation is never read, changed, paused, linked, listed for action or queried (D026).
8. **English only**, all text in `src/messages/en.json` (D017). Plain words, no trade jargon.
9. **Light theme only**, Figtree, Lucide icons, 45px-radius buttons, tokens only (D022, D023).
10. **No paid tools** until revenue (`TOOLING-POLICY.md`).

## 4. Decision boundaries

| You decide and proceed | Ask the founder first | Never |
| --- | --- | --- |
| Code structure, naming, file layout within `docs/ARCHITECTURE.md` §5 | Anything that changes a rule in `docs/DECISIONS.md`, prices, fees, limits or who can do what | Touch the Orayn_Main project in any way |
| Which approved package to use | Adding a package that fails any test in `TOOLING-POLICY.md` §5 | Run Docker or `supabase start` on the laptop |
| Order of work inside a phase | Deleting or overwriting data; dropping or renaming columns or tables | Commit as anyone else or add `Co-authored-by` lines |
| Fixing bugs, refactoring, adding tests | Changing auth or SMTP settings after launch; rotating keys | Force-push `main` |
| Creating and configuring the GitHub repo, Vercel project, Supabase config, Resend key and SMTP during Phase 0 | Domains and DNS changes; anything that costs money; switching on live payments | Commit secrets or print them in logs, issues or chat |
| Applying migrations before launch after green CI (D029) | Applying migrations after launch outside the `migrate` workflow | Disable RLS, skip a failing test, or weaken a security check to make CI pass |
| Small copy edits that keep meaning | New product features not in `PLATFORM-SCOPE.md` | Send real messages or payments to real users from development |

When you ask, give the founder: what you need, why, the exact steps (click by click), and what you'll
do once you have it. One question at a time, and keep working on everything that doesn't depend on it.

## 5. How work is done

Follow the loop in `docs/DEVELOPMENT-WORKFLOW.md` §1 for every change: **PLAN → IMPLEMENT → TEST →
REVIEW → CORRECT → ACCEPT**. One slice per branch and pull request. Keep `docs/PROJECT-STATE.md` true at
the end of every session.

## 6. Code conventions

- **Folders:** `src/app` for routes only; domain logic in `src/features/<domain>`; shared helpers in
  `src/lib`; UI primitives in `src/components/ui`.
- **Server first:** server components by default; `"use client"` only where interaction needs it.
  Writes go through server actions or route handlers, never straight from the browser to tables that
  move money or state.
- **Providers behind interfaces:** `PaymentProvider`, `VerificationProvider`, notification channels.
  Business code never imports a vendor SDK directly.
- **Validation:** zod schemas shared between form and server.
- **Naming:** database `snake_case`; TypeScript `camelCase`; components `PascalCase`; files
  `kebab-case.tsx`.
- **Time:** stored in UTC (`timestamptz`), shown in Africa/Lagos time.
- **Text:** no hard-coded user-facing strings; keys in `src/messages/en.json`.
- **Errors:** users see a plain sentence and one action; details go to Sentry, never secrets or
  personal data.
- **Comments:** explain why, not what. Reference the rule (`// SYSTEM-LOGIC §7.3: advance on loading code`).

## 7. Design standard (summary)

Read `DESIGN_SYSTEM.md` in full before any UI work, and the screen's spec in `docs/planning/`.
- Simple like Apple's interfaces: one primary action per screen, generous space, quiet colour, real
  content.
- Every pixel considered: 4pt grid, tokens only, optical alignment, crisp 1px lines, consistent radii.
- Every state designed: loading, empty, error, offline, success, long text, small phone.
- Nothing generic: no default shadcn look, no gradients-for-decoration, no emoji icons, no stock
  illustration, no lorem ipsum.
- Proof: the `/dev/components` gallery, screenshot tests at 375/768/1280/1440 px, a 200% zoom review,
  and a check on a real low-cost Android phone.

## 8. Definition of done

A task is done only when the ACCEPT checklist in `docs/DEVELOPMENT-WORKFLOW.md` §1 is complete: criteria
met, CI green (including `author-check` and `database`), Vercel preview and production **Ready**,
migrations applied and in step, `PROJECT-STATE.md` updated, merged by rebase.

## 9. Where to find things

| Need | Look in |
| --- | --- |
| Why something is the way it is | `docs/DECISIONS.md` |
| A table, column, state or function | `docs/DATA-MODEL.md` |
| A rule, timer, edge case or worst case | `docs/SYSTEM-LOGIC.md` |
| A screen's content, actions and states | `docs/planning/ux-<role>.md` |
| Shared screen patterns | `docs/planning/ux-conventions.md` |
| Colours, type, spacing, components, motion | `DESIGN_SYSTEM.md` |
| What to build next and how to accept it | `docs/PROJECT-STATE.md`, `BUILD.md` |
| Secrets, keys, data protection | `SECURITY.md` |
| Logo files | `public/brand/` |
