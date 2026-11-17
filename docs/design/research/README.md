# Design research: sign-in, landing page and app look (17 Nov 2026)

Done before the redesign gates (founder brief, 17 Nov 2026). Every site was opened in Chrome; full-page
captures were taken at 1440 px. Numbers in brackets refer to the numbered callouts on each image. We take
principles, never layouts, copy, photos or code. Visual rules still come from `DESIGN_SYSTEM.md`, public
wording from `docs/planning/launch-page-copy.md` (D031).

## The founder's references

### RealDom — `realdom.jpg`
Nigerian rental marketplace; the closest cousin to us (verified supply, money, trust).
1. **One promise in a small pill above the headline** ("No agent fees. Ever."). One line, one claim.
2. **Inset rounded hero photo**, full width minus a gutter, so the page has a frame.
3. **The main tool sits on the hero's bottom edge**, half on the photo, half on the page. It ties the
   promise to the action and stops the hero from being a poster.
4. **Proof row directly under the tool**: three big figures with tiny captions.
5. **Real product cards**: naira amounts, specs on one line, place, a "Verified" badge on the photo.
6. **The cost shown upfront as a clean breakdown** (line items, a total), with the zero line coloured.

*For us:* pill = "Launching soon on four routes"; the tool = a route card (From, To, Truck type, Join the
waitlist); the proof row must hold no fee numbers or absolutes (D031), so it uses process facts (four
routes, verified owners, money held) rather than "100%". The breakdown idea becomes a **stage
breakdown** of where the money is (held, part released at loading, final after delivery), never amounts
or shares.

### Japa9ja — `japa9ja.jpg`
Relocation paperwork service.
1. **Calm, honest copy**: says what they do and, in the footer, what they are not. Short sentences.
2. **A whole section on "a different way to pay"** (pay afterward), dark green band, one paragraph and
   one honest caveat on the right.
3. **Numbered steps** (01–05) in a light row, each a title and two lines.

*For us:* a dedicated "different way to pay" section: pay once, held, released as goods move, with the
final payment only after delivery is confirmed. The honest caveat line is our §6 notice ("Prices,
charges and payout timing are shown in full in the app before you confirm…").

### Logistra (Framer template) — `logistra.jpg`, `logistra-steps-faq-cta.jpg`
1. **Small eyebrow pills** ("• WHO WE ARE") above every section heading.
2. **Inset rounded hero photo** with the headline on it; the second action is a quiet outline button.
3. **Headline left, short muted paragraph right**, on the same baseline: one section pattern, repeated.
4. The same pattern again: the page reads as a system, not a collage.
5. (second image) Numbered process cards with the first one filled; a two-column FAQ (title left,
   questions right); a closing card centred on a photo.

*For us:* the one section pattern for Gate 3 (eyebrow pill, headline left, paragraph right). A very
restrained palette: one deep green, paper, one accent used rarely. Not taken: their dark full-bleed
"difference" band with four identical icon cards (generic).

### Logiten (Framer template) — `logiten.jpg`, `logiten-steps.jpg`
1. **A numbered card in the hero** ("Services 01/04") with one action.
2. Condensed all-caps headline (not for us: our type is Plus Jakarta Sans, sentence case).
3. (second image) **Numbered process steps** down a thin vertical rule, each with a photo.
Also a **strong closing call to action** on a truck photo.

*For us:* the hero's route card takes the idea of one compact card with one action. Numbering belongs
to the How it works steps, not the hero, where a counter would only add noise. The closing call to
action sits on a real truck photo.

## Sign-in and landing pages of financial products

| Site | Image | What we take | What we avoid |
| --- | --- | --- | --- |
| Stripe sign-in | `stripe-signin.jpg` | One card, labels above fields, one filled button, other methods as outlined buttons under an "or" rule | The decorative gradient |
| Revolut sign-in | `revolut-signin.jpg` | Strong title, phone first, a second way in placed **beside** the form, not above it | Dark theme (we are light only, D022) |
| Revolut home | `revolut-home.jpg` | A real person in a real photo, a short headline, one button, one product card laid over the photo | Huge headline crowding the photo |
| Moniepoint home | `moniepoint-arrival.jpg` | Plain benefit headline; Nigerian audience | **What not to do:** on arrival a promotion and a cookie wall cover the page (1, 2) |
| Kuda home | `kuda-home.jpg` | Header as floating pills, one flat brand colour | A giant wordmark instead of a message. Kuda has no web sign-in (app only; `web.kuda.com` does not resolve) |

## Template marketplaces and component libraries

- **Framer, fintech category** (`framer-fintech.jpg`): the strongest templates show the *product*
  (a real card with real numbers) rather than abstract shapes. The weakest are interchangeable: phone
  mock-ups, glows, "seamless" copy. The logistics and fintech category links in the old URL scheme
  return "Page not found"; the Fintech category is now under Software.
- **Webflow, logistics and fintech** (`webflow-logistics.jpg`): photography-led logistics templates;
  most repeat the same hero-plus-three-cards structure. Confirms the need for one deliberate pattern.
- **Watermelon UI** (`watermelon.jpg`): open-source React components; useful as a checklist of states
  (loading, empty, toast). Its dark, neon look is not ours.
- **Apple Human Interface Guidelines, Layout** (`apple-hig-layout.jpg`), principles only, no SF Pro or
  SF Symbols: order content by importance, top and leading side first; align to make scanning easy and
  indent to show hierarchy; group related items with space, containers or rules; use progressive
  disclosure; keep controls visually distinct from content; respect safe areas; support large text by
  letting side-by-side items stack. Apple Design Resources: templates and grids, used here only as the
  idea of a fixed grid with consistent spacing.
- **Mobbin**: skipped (paid).

## Rules we take into the gates

1. **One focal point per screen.** Hero: pill → headline → route card on the photo's bottom edge →
   proof row. Sign-in: title → one field → one button.
2. **Photography is real and lightly treated.** No heavy green wash; a neutral dark gradient only where
   white text sits, and only as strong as contrast needs (4.5:1).
3. **One section pattern** for the whole landing page: eyebrow pill, headline left, short paragraph
   right, then the content.
4. **Product, not decoration.** Show the live product cards (naira, plates, "Verified") instead of
   icons in boxes.
5. **Honest money copy** (D031): describe stages, never amounts, shares or absolutes.
6. **Nothing covers the page on arrival, nothing fades in from blank.** Content is visible on first
   paint; motion is small and off under reduced motion.
7. **Restrained palette:** green for actions and the brand, paper and white for surfaces, road yellow
   only as a tiny accent.
