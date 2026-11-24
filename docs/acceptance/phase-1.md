# Phase 1 acceptance, 24 Nov 2026

Checked by Claude Code against `BUILD.md` §3 Phase 1 "Accept when", on main at the merge of #44.

| Criterion | Result | Evidence |
| --- | --- | --- |
| A person can sign up | Met | Email-code sign-in live on app.freight-africa.com since 16 Nov (#8, #9); founder signed in 24 Nov |
| Create a shipper or transporter organisation | Met in the database; screens in Phase 2 | `create_organization()` with pgTAP in `040_organizations` (61 tests); demo businesses created by `scripts/seed-demo.mjs`. The sign-up screens that call it (A-04, T-ON) are Phase 2's first slices, as BUILD.md orders them |
| Invite members with each sub-role | Met | Invites for every shipper and transporter sub-role in the database (#29) and the Team and accept-invite screens (#40) |
| Switch accounts | Met | Account switcher (A-09) in the shell (#40), `my_accounts()` and `set_active_org()` tested |
| Staff sign in with two-step sign-in | Met | X-00 screens (#42): invite, authenticator with backup codes, code step, lost-phone path, staff code. Tested live with a demo staff account: aal2 after the code; a second authenticator refused at aal1 ("AAL2 required to enroll a new factor"); backup codes refused at aal1; console pages need aal2 |
| ROLES §2, §3, §7 rules that exist so far have pgTAP tests | Met | 297 pgTAP tests in 13 files, all green in CI (`database` job) |
| A ledger posting that doesn't balance is refused | Met | `070_ledger`: "an unbalanced posting is refused" (23514) |
| The dispatcher processes a queued test notification exactly once | Met | 23 Nov: one test email, sent once (pg_cron → pg_net → /api/jobs/dispatch) |
| Shells pass screenshot review | Met | Gate 4 approved by the founder on 24 Nov (#37); sanity screenshots of the shells with demo accounts at 375 and 1440 px on 24 Nov |

Also done in Phase 1 on 24 Nov: the founder is the first super admin; D037 (money settings, sole super
admin re-enters the code); the role step opens the role's app with "Finish setting up" (#41); demo
accounts for every role (#43).

**Result: Phase 1 accepted.**
