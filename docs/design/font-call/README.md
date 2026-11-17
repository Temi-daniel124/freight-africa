# Plus Jakarta Sans or Manrope: the final call (D034)

Each image shows the same screen twice: **Plus Jakarta Sans on the left** (live), **Manrope on the right**.
Captured 17 Nov 2026 from the dev server at 375 px (phone) and 1280 px (laptop).

- `hero-375-…` and `hero-1280-…`: the launch page hero
- `sign-in-375-…` and `sign-in-1280-…`: the redesigned sign-in

The Manrope here is the comparison build from `/dev/fonts`: its naira sign is drawn by us and it lacks
some Hausa and Igbo letters. Choosing Manrope means building its full subset (like
`scripts/fonts/build-jakarta.py`) and changing the `src` line in `src/app/fonts/brand-font.ts`.
