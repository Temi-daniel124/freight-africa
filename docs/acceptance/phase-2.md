# Phase 2 (Supply): built, awaiting the founder's review, 24 Nov 2026

Checked by Claude Code against `BUILD.md` §3 Phase 2, on main after #59. The founder reviews the phase
with the demo accounts (D038); the walkthrough is in the session report and below.

## Acceptance criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| An owner can go from sign-up to verified with a truck and a driver using Didit's sandbox | Met with the demo provider; Didit waits for the founder's account | T-ON-01 to T-ON-04 (#50, #51), Add a truck with papers (#52 to #54), driver invite, licence and PIN (#55 to #57). Identity checks run through `VerificationProvider`; the demo provider (staff decide, D039) stands in until Didit's keys and workflows exist (PROJECT-STATE §4). Tested end to end on production with the demo accounts: identity, truck plus three papers to "Ready for loads", driver PIN and licence |
| Expired documents block load acceptance | Met at the truck level; loads arrive in Phase 4 | A truck is active only with its three required papers approved and in date; the 07:00 job marks expired papers and pauses the truck; drivers need an in-date licence (`refresh_driver`). Load acceptance (Phase 4) will require an active truck and an active driver |
| The verification queue approves and rejects with reasons and an audit trail | Met | Identity checks, trucks, papers and bank accounts: Approve, or Reject with a reason the person reads; every decision is in `audit_log`; staff opening an ID photo is logged with the reason |
| A driver can't see any money table (pgTAP) | Met | `160_driver_no_money`: no bank accounts, ledger accounts, ledger entries or approvals; `see_money` false |

## Not built yet (Phase 2 items in BUILD.md)

- **Plate reading from the photo (Tesseract.js)** and reading paper expiry dates: plates and dates are typed for now.
- **GPS tracker registration (T-18).**
- **Truck inspection tasks** for field agents.
- **Didit** itself (sessions and webhook), until the founder's account exists.

These come first in the next session, before Phase 3.

## Also decided in Phase 2

D040 (repository public until production), D041 (optional sender ID check, Verified sender badge),
D042 (the driver's PIN unlocks the app, never signs in).
