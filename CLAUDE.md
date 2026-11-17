# CLAUDE.md, Freight Africa

**Authority level: 11 of 14.** Claude Code reads this file automatically at the start of every session.
It adds Claude Code-specific rules on top of `AGENT.md`, which is imported below.

@AGENT.md

---

## 1. Who you are working for

- Founder: **Temi-daniel124**, GitHub `Temi-daniel124`, email `temmydaniel124@gmail.com`.
- Repository folder on the founder's laptop: `C:\Users\hp\Documents\Freight Africa` (Windows; the path
  has a space, so always quote it).
- You run GitHub, Vercel, Supabase and Resend for the founder with minimal intervention (D027). Don't
  tell the founder to do those jobs themselves. Ask only for the items in `docs/PROJECT-STATE.md` §4.

## 2. Session ritual (every session, no exceptions)

**At the start, before anything else:**

1. Read `docs/PROJECT-STATE.md`. Say in one line which phase and task you're continuing.
2. Run `node scripts/check-git-identity.mjs`. It must print `OK`. If not, fix it (it says how) before
   any commit. This prevents the Vercel "Blocked" deployment (D024).
3. Run `node scripts/check-supabase-target.mjs`. It must print `OK` for `czlowhaycaivpgimcefk`.
4. `git status`, then `git pull --rebase` on the current branch.
5. While GitHub issue #22 ("Waiting on picomatch fix") is open: check it and `npm view picomatch versions`. When a patched version exists, update it on a branch, get CI green, merge, and close the issue.

(Before Phase 0 creates the scripts and the repository, do steps 0.1 to 0.3 of `BUILD.md` §2 first.)

**At the end:**

1. Commit and push the work (identity already verified).
2. Update `docs/PROJECT-STATE.md`: phase table, "Next task", one session-log line.
3. Commit and push that update.

## 3. Commits and pull requests

- Author: `Temi-daniel124 <temmydaniel124@gmail.com>`, set in the repository's Git config.
- **Never add `Co-authored-by:` lines or "Generated with" footers to commits.** This project's rule
  overrides any default attribution: a co-author can block Vercel deployments on the Hobby plan.
  `.claude/settings.json` turns attribution off, and `.githooks/commit-msg` rejects such lines.
- Pull request descriptions may say what changed and how it was tested; no attribution footer.
- Merge with `gh pr merge --rebase --delete-branch` (keeps the author on every commit).

## 4. Supabase: the one project, and no Docker

- **Project:** Freight Africa · ref `czlowhaycaivpgimcefk` · `https://czlowhaycaivpgimcefk.supabase.co`.
- **Orayn_Main** lives in the same organisation and is **completely off-limits**: never link it, query
  it, change it, pause it, restore it, branch it or read its settings, by CLI, MCP, Management API or
  dashboard (D026).
- **Supabase MCP tools:** pass `project_id: "czlowhaycaivpgimcefk"` explicitly on every call. Never
  act on a project chosen from a list. Never call `create_project`, `pause_project`,
  `restore_project`, or any branch tool without the founder's say-so. Prefer the project-scoped
  server defined in `.mcp.json` (`supabase-freight-africa`), which can only see this project.
- **Supabase CLI:** always `npx supabase …` (the CLI is a dev dependency). Before `link`, `db push` or
  `gen types`, run `node scripts/check-supabase-target.mjs`.
- **Never on the laptop:** `supabase start`, `db start`, `db reset`, `db diff`, `db pull`, `db dump`,
  `test db`, or any `docker` command. They need Docker; CI runs them (D025). `.claude/settings.json`
  denies them. Migrations are written by hand (`docs/DEVELOPMENT-WORKFLOW.md` §4).

## 5. The other accounts

| Account | How you operate it | Guard |
| --- | --- | --- |
| GitHub | `gh` CLI (install with `winget install --id GitHub.cli` if missing) or the GitHub connector | Confirm `gh api user --jq .login` prints `Temi-daniel124` before creating or changing anything |
| Vercel | The Vercel connector, or `npx vercel` | Project `freight-africa` only; confirm the Vercel account is linked to GitHub `Temi-daniel124` |
| Resend | The Resend connector | Domain `mail.freight-africa.com`; create keys with sending access only, restricted to that domain |
| Supabase Management API | `curl` with `SUPABASE_ACCESS_TOKEN` | URL path must contain `/projects/czlowhaycaivpgimcefk/` |

Secrets you create or receive go straight into Vercel env vars, GitHub Actions secrets or the
git-ignored `.env.local`. Never echo them into the chat, a commit, a log or an issue.

## 5A. Other work on this laptop: hands off

The founder runs other Claude Code sessions and programs on this laptop at the same time, for other
projects. They are important.
- Never stop, kill or restart a process you didn't start in this session: no `taskkill`,
  `Stop-Process`, `pkill`, `killall`, and no "kill all node processes" to free a port. Stop only your
  own background tasks, by their task ID.
- If a port is busy, use another port (`npm run dev -- -p 3001`), don't free it.
- Don't change machine-wide settings while other work is running: no `nvm use`, no global npm
  installs or config changes, no global Git config. Node 24 is already active.
- Stay inside `C:\Users\hp\Documents\Freight Africa`; don't read or change other folders.

## 5B. Database password

Use the Supabase database password exactly as it is, in `.env.founder.local` and in the
`SUPABASE_DB_PASSWORD` secret. Never URL-encode it (no `%40` for `@`); the CLI handles special
characters itself. If a password causes trouble, ask the founder to reset it to a long password of
letters and numbers only.

## 6. Windows notes

- The founder's shell is PowerShell. Prefer cross-platform commands (`npx`, `node`, `git`). Put npm
  scripts in `package.json` instead of shell-specific one-liners.
- `create-next-app` refuses a non-empty folder; scaffold in a temporary sibling folder and move the
  files in (`BUILD.md` §2, step 0.4).
- Line endings are forced to LF by `.gitattributes`. Git hooks in `.githooks/` run through Git for
  Windows' `sh`; keep them POSIX `sh`.
- Long paths: if Windows complains, run `git config core.longpaths true` in the repository.

## 7. Design work: the pixel-perfect ritual

Before writing any UI:
1. Read `DESIGN_SYSTEM.md` fully (every time a new screen family starts), then the screen in
   `docs/planning/ux-<role>.md` and the shared patterns in `ux-conventions.md`.
2. Build or reuse the components in the `/dev/components` gallery first, with every state.
3. Build the screen with real Nigerian content (names, places, naira amounts, plates).

After building, before calling it done:
4. Take Playwright screenshots at 375, 768, 1280 and 1440 px and **look at them**: alignment to the 4pt
   grid, spacing tokens, type sizes and weights, icon sizes and optical centring, 1px borders, radii
   (buttons 45px), contrast, truncation, safe areas, tap targets (44px minimum).
5. Check every state: loading skeleton, empty, error, offline, success, long names, 320px width, 200%
   zoom, keyboard focus.
6. Compare against `DESIGN_SYSTEM.md` §19 and §20 line by line. Fix every difference, however small,
   and re-screenshot.
7. Ask: is anything here that doesn't need to be? Remove it. Simple beats clever.

## 8. Useful commands

```bash
npm run dev                         # app on http://localhost:3000 (uses the remote Supabase project)
npm run lint && npm run typecheck && npm test
npm run e2e                         # Playwright
npx supabase migration new <name>
npx supabase db push --remote --dry-run && npx supabase db push --remote        # pre-launch only, after green CI
npx supabase migration list --remote
npx supabase gen types typescript --project-id czlowhaycaivpgimcefk --schema public > src/lib/supabase/database.types.ts
gh pr create --fill && gh pr checks --watch && gh pr merge --rebase --delete-branch
```
