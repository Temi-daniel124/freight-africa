# DEVELOPMENT-WORKFLOW.md, Freight Africa

**Authority level: 8 of 14.** Defers to everything above it in `docs/DECISIONS.md` D028. How every
change is made, checked and accepted. It contains two **hard requirements** (§3 and §4). Breaking either
is a stop-the-line event: fix it before doing anything else.

---

## 1. The loop: PLAN → IMPLEMENT → TEST → REVIEW → CORRECT → ACCEPT

Every piece of work, however small, goes round this loop. One loop = one branch = one pull request =
one slice of a `BUILD.md` phase.

### PLAN
1. Read `docs/PROJECT-STATE.md` (current phase and next task).
2. Read the documents that govern the slice: the phase in `BUILD.md` §3, the tables and functions in
   `docs/DATA-MODEL.md` and `docs/SYSTEM-LOGIC.md`, the rows in `docs/ROLES-AND-PERMISSIONS.md`, the
   screen spec in `docs/planning/`, and `DESIGN_SYSTEM.md` for anything visual.
3. Write a short plan in the task list: the migrations, functions, RLS policies, routes, components,
   text keys and tests the slice needs, and its acceptance criteria.
4. If a document is silent or two documents conflict, the higher document wins (D028). If the answer
   is still unclear and the choice matters to the product or to money, ask the founder. Never invent
   product rules.

### IMPLEMENT
Order inside a slice: **migration → database functions and RLS → generated types → server code
(actions, route handlers, providers) → UI → text in `src/messages/en.json`**.
- Small commits with clear messages (`feat(booking): quote screen`, `db: loads and stops tables`).
- No placeholder logic left behind: no `TODO` without a matching item in `PROJECT-STATE.md`.
- UI follows `DESIGN_SYSTEM.md` exactly, including §20 Craft standard.

### TEST
- Locally (no Docker): `npm run lint`, `npm run typecheck`, `npm test` (Vitest), `npm run e2e`
  (Playwright against `npm run dev`, which uses the remote database), screenshot tests.
- In CI (hosted runner, with Docker): pgTAP and RLS tests on a fresh Supabase stack built from the
  migrations, drift check, build (§4).
- Required tests by change type are in §6.

### REVIEW
Before asking for acceptance, read the whole diff as a reviewer would:
- **Correctness:** matches the documents; edge cases from `SYSTEM-LOGIC.md` handled.
- **Security:** `SECURITY.md` checklist (RLS on every new table, no secret in client code, webhook
  signatures verified, input validated with zod).
- **Design:** the `DESIGN_SYSTEM.md` §19 checklist and §20 craft checks: screenshots at 375, 768, 1280
  and 1440 px, every state (loading, empty, error, offline, success), 200% zoom, keyboard only.
- **Money, auth, RLS, codes or state machines:** also get an independent review by a separate agent
  that did not write the code, given only the diff and the governing documents.

### CORRECT
Fix every finding. Re-run the tests. Repeat REVIEW until there are no findings left. Findings are never
"noted for later" unless the founder agrees and they are logged in `PROJECT-STATE.md`.

### ACCEPT
A slice is accepted when all of these are true:
- [ ] The acceptance criteria written in PLAN are met.
- [ ] CI is green on the pull request (all jobs, including `author-check` and `database`).
- [ ] The Vercel preview deployment is **Ready** (not Blocked) and was checked on a phone-sized screen.
- [ ] Database changes are applied to the remote project (§4.3) and `migration list` shows local and
      remote in step.
- [ ] `docs/PROJECT-STATE.md` is updated (phase table, current task, session log).
- [ ] The pull request is merged with a rebase merge (§5) and the production deployment is Ready.

---

## 2. Session ritual (summary)

Every Claude Code session starts and ends the same way. The full version is in `CLAUDE.md` §2.

**Start:** read `docs/PROJECT-STATE.md` → `node scripts/check-git-identity.mjs` →
`node scripts/check-supabase-target.mjs` → `git status` and `git pull` → continue the current task.

**End:** commit and push → update `docs/PROJECT-STATE.md` (phase, next task, one log line) → push that.

---

## 3. HARD REQUIREMENT A: every commit is authored as Temi-daniel124

**Why.** Vercel checks the author of every commit before it deploys. On the Hobby plan only the account
owner can trigger deployments, and the email in the local Git client must match an email verified on
the owner's GitHub account. A different author (or a `Co-authored-by` line naming someone else) blocks
the deployment. This happened before (D024).

**The identity, exactly:**

| Field | Value |
| --- | --- |
| Git `user.name` | `Temi-daniel124` |
| Git `user.email` | `temmydaniel124@gmail.com` |
| GitHub account | `Temi-daniel124` (that email verified on it) |
| Vercel account | Hobby account signed in with that GitHub account |
| Commit trailers | **No** `Co-authored-by:` lines, ever |

### 3.1 One-time setup (Phase 0, inside the repository folder)

```bash
git config user.name "Temi-daniel124"
git config user.email "temmydaniel124@gmail.com"
git config core.hooksPath .githooks
```

These are set **in the repository** (no `--global`), so other projects on the laptop are not affected.

### 3.2 Verify before the first commit of every session

```bash
node scripts/check-git-identity.mjs
```

It checks the effective `user.name` and `user.email`, that `core.hooksPath` is `.githooks`, and the
author of the last commit. It prints `OK` or explains what to fix. **No commit is made until it prints
OK.**

### 3.3 Automatic guards

| Guard | Where | What it does |
| --- | --- | --- |
| `.githooks/pre-commit` | Laptop | Runs `check-git-identity.mjs`; refuses the commit on a mismatch |
| `.githooks/commit-msg` | Laptop | Refuses any message with a `Co-authored-by:` line |
| `author-check` job | GitHub Actions (`ci.yml`) | Fails the pull request or push if any commit's author is not `Temi-daniel124 <temmydaniel124@gmail.com>` or contains a `Co-authored-by:` line |
| Claude Code setting | `.claude/settings.json` | Turns off Claude Code's own commit and PR attribution lines |

### 3.4 If a wrong commit slips through

- **Not pushed yet:** `git commit --amend --reset-author --no-edit` (last commit), or for several:
  `git rebase -r <base> --exec "git commit --amend --reset-author --no-edit"`.
- **Pushed to a feature branch:** fix as above, then `git push --force-with-lease`.
- **On `main`:** never force-push `main`. Make the next commit correctly; if Vercel blocked that
  deployment, redeploy the latest correct commit from Vercel.
- **Vercel shows "Blocked":** check the commit author first (`git log -1 --format="%an <%ae>"`), then
  that the Vercel account is linked to the `Temi-daniel124` GitHub account.

---

## 4. HARD REQUIREMENT B: no local Docker, no `supabase start`

**Why.** Docker Desktop alone used about 2.34 GB of memory and 6.44 GB of disk on the laptop before
Postgres even started (D025). So the laptop never runs Docker. Everything that needs Docker runs on
GitHub's hosted runners, which Supabase officially supports for `supabase db start` and `supabase test
db`.

### 4.1 What runs where

| Command | Needs Docker? | Laptop | CI |
| --- | --- | --- | --- |
| `npx supabase login` / `link --project-ref czlowhaycaivpgimcefk` | No | ✓ | ✓ |
| `npx supabase migration new <name>` | No | ✓ | |
| `npx supabase migration list --remote` | No | ✓ | ✓ |
| `npx supabase db push --remote --dry-run` / `db push` | No | ✓ (pre-launch) | ✓ (`migrate.yml`) |
| `npx supabase gen types typescript --project-id czlowhaycaivpgimcefk` | No | ✓ | ✓ |
| `npx supabase start` / `db start` / `db reset` (local) | **Yes** | **Never** | ✓ (`db start`) |
| `npx supabase test db` (pgTAP, RLS tests) | **Yes** | **Never** | ✓ |
| `npx supabase db diff` (including `--remote`) | **Yes** (shadow database) | **Never** | ✓ (drift check) |
| `npx supabase db pull` / `db dump` | **Yes** | **Never** | ✓ (`backup.yml`) |

**About `db diff`.** The founder's note mentions `db diff` against the remote project. The Supabase CLI
builds a temporary "shadow" database in Docker to compute any diff, even with `--remote`, so `db diff`
can't run on the laptop. Instead, migrations are **written by hand** as SQL files, and CI runs
`db diff --remote` on every push to `main` to prove the remote project matches the migration files.

### 4.2 Making a schema change on the laptop

```bash
npx supabase migration new loads_and_stops          # creates supabase/migrations/<timestamp>_loads_and_stops.sql
# write the SQL by hand: tables, constraints, indexes, RLS enable + policies, grants, triggers, functions
# write or extend pgTAP tests in supabase/tests/  (allowed AND denied cases)
git push                                              # CI builds a fresh database from all migrations and runs the tests
```

Migration rules:
- One concern per migration; file names say what they do.
- Every new table: `alter table … enable row level security;` plus its policies **in the same file**.
- New objects in `public` grant nothing by default: write explicit `grant`s for each role that needs the
  table or function, including `service_role` for server code that uses the secret key.
- Money columns are `bigint` kobo; time is `timestamptz`; IDs are `uuid default gen_random_uuid()`.
- Migrations are forward-only. A mistake is fixed by a new migration, never by editing an applied one.
- Destructive changes (drop or rename a column or table, change a type with data) use
  expand-and-contract over two releases and need the founder's approval (D027, D029).

### 4.3 Applying it to the remote project

**Before launch (D029):** once the pull request's `database` job is green. The laptop only holds the
database password during a session it was supplied for; otherwise run the `migrate` workflow, which uses
the GitHub secrets:

```bash
node scripts/check-supabase-target.mjs               # must print OK for czlowhaycaivpgimcefk
npx supabase db push --remote --dry-run                       # shows exactly which migrations will run
npx supabase db push --remote
npx supabase migration list --remote                          # local and remote columns must match
npx supabase gen types typescript --project-id czlowhaycaivpgimcefk --schema public > src/lib/supabase/database.types.ts
```

Then commit the regenerated types and merge the pull request in the same session, so `main` and the
remote database never disagree for long. If a pull request is abandoned after its migration was
pushed, write a reversing migration.

**After launch:** the laptop never pushes migrations. They run only through the `migrate` workflow
(`.github/workflows/migrate.yml`, started by hand after merge), which re-checks the project ref.

### 4.4 The CI workflow (stub, full file in `.github/workflows/ci.yml`)

```yaml
  database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase db start          # Docker runs here, on GitHub's runner
      - run: supabase test db           # pgTAP and RLS tests in supabase/tests/

  drift:                                # on push to main only
    runs-on: ubuntu-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
      PROJECT_REF: czlowhaycaivpgimcefk
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref "$PROJECT_REF"
      - run: supabase db diff --remote --schema public > drift.sql && test ! -s drift.sql
```

---

## 5. Branches, pull requests and deployments

- `main` is production. Vercel deploys every push to `main`.
- Work happens on short-lived branches: `feat/<area>-<thing>`, `fix/<thing>`, `db/<thing>`,
  `docs/<thing>`, `design/<thing>`. Only the Phase 0 bootstrap commits go straight to `main`.
- Every branch push gets a Vercel preview deployment; it is checked before merging.
- Pull requests are merged with **rebase merge** (`gh pr merge --rebase --delete-branch`). Rebase
  keeps each commit's original author (`Temi-daniel124`). Squash and merge commits made on GitHub
  can take another email (such as a `noreply` address) and fail the author check.
- GitHub Free may not offer branch protection on private repositories, so this workflow is the
  protection: never merge red CI, never force-push `main`.
- Pull request description: what changed, which documents it implements, the acceptance checklist
  from §1, screenshots for UI changes, and migration names for database changes.

---

## 6. Tests required by change type

| Change | Required tests |
| --- | --- |
| New table or policy | pgTAP: RLS allowed and denied for every role in `ROLES-AND-PERMISSIONS.md` that touches it |
| Database function that moves money or changes state | pgTAP: happy path, every refusal, idempotency (same key twice = one effect), ledger balances to zero |
| Pure TypeScript logic (pricing, fees, money formatting, validation) | Vitest with real Nigerian figures |
| Route handler or webhook | Vitest: valid signature accepted, bad signature rejected, replay ignored |
| Screen or component | Playwright: the main flow; screenshot tests at 375, 768, 1280 and 1440 px; empty, loading and error states |
| Offline behaviour | Playwright with the network cut: queued action is sent when back online |

Coverage numbers aren't the goal; every rule in `SYSTEM-LOGIC.md` that a slice implements has a test
that would fail if the rule broke.

---

## 7. Environment variables during development

- `.env.local` on the laptop (never committed) holds the development values; `.env.example` lists every
  name with no values.
- Vercel holds Production, Preview and Development values; `npx vercel env pull .env.local` refreshes
  the laptop copy.
- Provider keys use test or sandbox mode until launch (Bachs test keys, Didit sandbox).
- `src/lib/env.ts` validates variables with zod at start-up; a missing variable fails loudly.

---

## 8. When something goes wrong

| Symptom | First check |
| --- | --- |
| Vercel deployment **Blocked** | Commit author and trailers (§3.4) |
| `author-check` red | Run `node scripts/check-git-identity.mjs`; fix and re-push the branch |
| `database` job red | Read the failing pgTAP assertion; fix the migration or the test, never skip the test |
| `drift` red on `main` | Someone changed the remote project outside migrations, or a migration wasn't pushed. Write a migration that matches, push it, re-run |
| `db push` asks to repair history | Stop. Read `migration list`. Never run `migration repair` without understanding which side is right |
| Project paused (free plan) | Restore it from the Supabase dashboard (Freight Africa only); check that `backup.yml` is running nightly |
