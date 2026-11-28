# Deliberate differences from the mockups

Each one is required by a decision, a security rule or a data rule (combined brief section 9).

| Screen | Difference | Reason |
| --- | --- | --- |
| P11, D08 | "Sent to verified owners" with no number; D08 has no "to 11 owners" | We don't count matched owners yet; a made-up number would be fake data (5f honesty rule). Comes with the Phase 4 load board alerts |
| P11c | "Raise by 5%" asks for ₦93,000 on ₦1,850,000, not ₦92,500 | Raises are whole thousands of naira (raise_load_price, D047 money rule) |
| P11b, D08 | Owner rating and trip count are not shown on real replies (the /dev preview shows the sample) | Ratings arrive with Phase 6; no fake stars |
| P10, D04, all | The route arrow is Plus Jakarta's own → | Same as 5a: the mockup's thin arrow is a system-font fallback |
| Demo checkout | Our own dashed "Demo · no real money" card | D048: we never draw or imitate Bachs's page; this stands in until the Bachs keys arrive |
| P14b, D09, P14c | Driver and owner show initials, not a photo | No driver photos are stored yet (Phase 4 onboarding photo); never a stock face |
| P14b, D09 | Loading code, Call driver / Call owner, delivery photos, rating and "Report a problem" are shown only in /dev/trips | UI built, backend Phase 4 (codes, calls during a live trip D018, photos), Phase 6 (ratings), Phase 5 (problem reports) |
| P12, D05 | "Arrives Sat 28 Nov, about 2 pm" reads "Pick-up …" | No arrival estimate is computed until Phase 4 tracking |

## Slices 7–12 (28 Nov 2026)

- Compare images for every role are in this folder: `sender/`, `owner/`, `driver/`, `admin/`, `agent/` (made with `npm run check:mockups -- <role>` against a local server while Vercel builds were rate limited).
- Signed-in screens show the demo accounts' own data (for example "Sani Abubakar", "Ibrahim Musa"), not the mockups' sample names; layouts match.
- Staff My work and Overview show only what the database holds today: the SOS strip, tracking-lost items, Assigned/Unassigned tabs, on-call hours and playbooks join with their backends (Phase 4/5). The red SOS indicator in the top bar is hidden until SOS exists (Phase 5).
- Driver Me: no star rating (ratings are Phase 5) and the phone line falls back to the email for accounts without a phone.
- Desktop sign-in buttons are wider than 560 px by design (the split sign-in panel, sender mockups A-01 desktop).
