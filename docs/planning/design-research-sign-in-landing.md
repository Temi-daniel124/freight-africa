# Design research: sign-in and landing page (16 Nov 2026)

**Annex to `docs/PLATFORM-SCOPE.md`.** Notes taken before redesigning the sign-in screens and polishing
the launch page. Visual rules still come from `DESIGN_SYSTEM.md`; this records what was looked at and
what we took from it.

## What was looked at

Seen live in Chrome at 1280 px on 16 Nov 2026:

| Reference | Screen | What stands out |
| --- | --- | --- |
| Stripe | Dashboard sign-in | One white card on a quiet brand backdrop. Labels above fields, one filled button, other sign-in methods as outlined buttons under an "or" rule. Nothing else on the page. |
| Stripe | Home page | A two-tone headline (dark first sentence, softer second), two buttons, then customer logos straight away. The brand colour lives in one large shape, not in every component. |
| Revolut | App sign-in | Phone number first with the country code as its own control, one button, other methods as small labelled icons, "Create account" as a quiet second button. A second way in (QR) sits beside the form, not above it. |
| Revolut | Home page | A full-bleed photograph with a real person, a short headline, one button, and a product card laid over the photo. |
| Apple | Apple Account sign-in | A single field in the centre and nothing competing with it. The page earns trust by being calm. |
| Moniepoint | Home page (Nigeria) | Dark navy hero, plain benefit headline, "Open an Account" as the one action. On arrival a promotion and a cookie notice cover the page: a reminder of what not to do. |
| Kuda | Home page | One flat brand colour, a short all-caps headline, one button. The header is two floating pills, close to our own. |
| Framer | Landing page templates | Big type, one accent colour, cards with large radii, a lot of empty space. Many look alike: dark background, glow, floating device mock-ups. |

Not seen: Squarespace's template gallery did not finish loading, and the Mobbin connector needs a paid
plan (`TOOLING-POLICY.md` rules that out). Apple's Human Interface Guidelines were used for principles
only (clarity, deference to content, depth through layering); no Apple fonts or symbols.

## What we take from it

1. **One job per screen.** Sign-in asks for one thing, then one more. No navigation, no promotions, no
   second column of choices. Other methods appear only when they are switched on.
2. **The form is not a card on desktop.** Stripe, Revolut and Apple let the form sit on the page with
   space around it. Our split layout keeps the form on plain white at a fixed, narrow width; the brand
   lives in the panel beside it.
3. **Brand in one confident place.** A real photograph, the logo, one line and three short trust points
   in the panel. The form side stays neutral so the green button is the only strong colour there.
4. **Real photographs, real people and places.** Revolut's hero works because it is a photograph, not an
   illustration. We keep the Nigerian road photographs (D031) and never use device mock-ups or glows.
5. **Say what happens next.** "We send you a code, so there's no password to remember" does the work of a
   paragraph of reassurance. Every state says what to do next in one sentence.
6. **Errors next to the thing, in words.** Under the field or the code boxes, with an icon, never colour
   alone, and always with the way out ("Get a new code").
7. **Nothing covers the page on arrival.** No pop-ups, banners or cookie walls (we set no tracking
   cookies).
8. **What makes pages look generic,** so we avoid it: gradient glows, floating screenshots, three
   identical icon cards in a row with centred text, vague headlines, and every section built the same
   way. Sections should differ in rhythm, and numbers and names should be real.

## How this shapes the sign-in screens

- **Desktop:** a rounded photo panel inset on the left (logo, the approved line, three trust points, the
  road line), and the form on white on the right, 400 px wide, vertically centred.
- **Phone:** a photo band on top with the logo and the line; the form rises over it as a white sheet
  with rounded top corners.
- **States:** empty, typing, sending, code sent, wrong code, too many tries, expired code, success,
  offline and error. All ten are on the preview-only page `/dev/sign-in`.
