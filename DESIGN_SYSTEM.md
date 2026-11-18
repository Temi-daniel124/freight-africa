# DESIGN_SYSTEM.md, Freight Africa

**Authority level: 14 of 14.** Lives at the repository root. It is the detailed source for everything
visual: colour, type, shape, elevation, motion, imagery, components and the website's look. Higher
documents win only where they state a visual rule explicitly; otherwise this file decides. The screen
specs in `docs/planning/` take every visual detail from here.

It describes **what the product looks and moves like, and why**. It contains no drawings; every
decision is in words, tokens and rules a designer or developer can apply directly.

---

## 0. Direction

### 0.1 The idea: "the road and the green"

Freight Africa is about one thing: goods moving safely down a road, and money moving only when they
arrive. The visual language takes its character from that world, not from generic software:

- **Freight Green** from the logo is the colour of trust and of every main action.
- **The road line**: the dashed centre line that runs through the logo's road becomes the product's
  signature shape. It's the trip progress line, the loading animation, section dividers on the
  website, and the edge of empty states. Nobody else's app has it.
- **Road-marking yellow**, the colour painted on Nigerian highways, is the one warm highlight, used
  sparingly for offers, "new" labels and the moving dash on the progress line.
- **Real places, real trucks**: photography of Nigerian roads, parks and markets, never stock images of
  American highways.
- **Calm, not loud**: plenty of white space, one clear action per screen, motion that confirms rather
  than decorates.

The feel to aim for: a well-run logistics company that is also a pleasure to use. Confident and warm,
never flashy or "techy".

### 0.2 What to avoid (the generic AI-design checklist)

Reviewers reject any screen that shows these:

- Purple-to-blue gradients, neon glows, glassmorphism panels, floating blobs.
- Rainbow card colours (each card a different bright colour, as in some component demos).
- Every card with the same heavy shadow and radius, so nothing stands out.
- Big hero text with no real content under it; a hero that fills the screen and pushes the action
  below the fold.
- Emoji used as icons or section markers.
- Stock photos of white trucks on empty American interstates, people in hard hats pointing at laptops,
  handshakes in offices.
- Fake logos ("Trusted by…") or invented testimonials.
- Decorative animation on screens where people do work (booking, paying, driving).
- More than one filled button competing on a screen.

### 0.3 Light theme only

The product ships in **light theme only**. There are no dark-mode tokens and no theme switch; the
`dark:` classes in component code are removed when components are added.

**One safety exception, recommended:** the driver's trip screen keeps a **night look** (dim green-black
background, light text) after sunset, because a bright white screen in a dark cab dazzles the driver
and hurts night vision. It applies only to the Drive and Trip tabs while a trip is live. It is not a
general dark theme. (Recorded as D022; the founders may remove the exception.)

---

## 1. Colour

### 1.1 Tokens

| Token | Hex | Role |
| --- | --- | --- |
| `--green-900` | #083826 | Pressed state of primary buttons; headings on tinted backgrounds |
| `--green-700` | **#0C5034** | **Freight Green.** Primary buttons, links, active tab, logo |
| `--green-500` | #2F7A57 | Hover on links; icons on tinted surfaces |
| `--green-100` | #DCEBE2 | Selected chips, active nav background, money-held banner |
| `--green-50` | #EEF5F0 | Secondary button fill, subtle section backgrounds |
| `--road-yellow` | #F2C230 | Highlights only: offer badges, "new" pills, the moving dash on the progress line. Never text on white, never a button |
| `--road-yellow-100` | #FDF3D0 | Background for offer badges |
| `--ink` | #0F1A14 | Main text |
| `--ink-2` | #4A5A51 | Secondary text, labels |
| `--ink-3` | #7A887F | Placeholder and disabled text (only for non-essential text) |
| `--line` | #E2E8E3 | Borders, dividers |
| `--line-strong` | #C9D3CC | Input borders, focus base |
| `--paper` | #F6F8F5 | App background behind cards |
| `--surface` | #FFFFFF | Cards, sheets, inputs |
| `--info` | #1E5FBF on #E5EEFB | In transit, information |
| `--warning` | #B4530B on #FDEEDC | Waiting, needs attention, tracking paused |
| `--danger` | #B42318 on #FDE7E5 | Problems, errors, SOS, destructive actions |
| `--success` | #157347 on #E3F4EA | Done, paid, delivered (distinct from brand green: brighter and used with a check icon) |

Night look (driver trip screens only): background #0E1712, surface #16211B, text #E7EFE9, primary button
stays #0C5034 with a #7FC4A2 outline for visibility.

### 1.2 Rules

- **Contrast:** body text on `--paper` or `--surface` at least 7:1 (`--ink` is about 16:1); secondary
  text at least 4.5:1 (`--ink-2` passes). White on Freight Green is about 9.5:1.
- **Freight Green means "do this" or "this is ours".** It is never used for status. Delivered and paid
  use `--success`, which always comes with a check icon and a word.
- **Status is never colour alone.** Every status chip has a word; important ones have an icon.
- **Road yellow is rare.** At most one yellow element visible on a screen.
- **Neutrals carry a slight green tint** (the greys above) so the app feels cohesive, not cold.

---

## 2. Typography

### 2.1 Typeface

**Plus Jakarta Sans** for everything (D034), self-hosted as `src/app/fonts/JakartaFA.woff2` through
`next/font/local` (`src/app/fonts/brand-font.ts`): one variable file of about 20 KB with weights 400–800,
including the naira sign and the Hausa, Yoruba and Igbo letters. No second typeface. Fallback stack:
`-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`, with
`adjustFontFallback` so text doesn't jump when the font arrives.

- Weights used: 400, 500, 600, 700. 800 only for the money hero. Never synthesise bold or italic
  (`font-synthesis: none`).
- Emails can't load web fonts; they use the fallback stack.
- Any new character in the interface must exist in the subset (see `src/app/fonts/README.md`).

Numerals use tabular figures (`font-variant-numeric: tabular-nums`) for money, plates, codes, times and
any column of numbers.

### 2.2 App scale

| Token | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| `display` | 34 / 40 | 700 | Money hero (amount to pay, payout received) |
| `title-1` | 26 / 32 | 700 | Screen titles |
| `title-2` | 20 / 26 | 700 | Section and card titles |
| `body-lg` | 17 / 26 | 500 | Driver screens, important lines |
| `body` | 15 / 22 | 400 | Default text |
| `label` | 13 / 18 | 600 | Field labels, chips, tab labels, table headers |
| `caption` | 12 / 16 | 500 | Timestamps, helper text |

- Letter spacing: `display` −0.02em; titles −0.012em; body 0; labels and captions +0.005em; all caps
  only for very short labels, +0.06em.
- Line length for reading text: 60 to 70 characters.
- Headings use `text-wrap: balance`.
- Never below 12 px. Text scales with the phone's text-size setting to at least 200% without breaking.

### 2.3 Website scale

| Token | Phone | Desktop | Weight |
| --- | --- | --- | --- |
| `hero` | 40 / 44 | 64 / 68 | 700, −0.025em |
| `h2` | 28 / 34 | 40 / 46 | 700, −0.02em |
| `h3` | 20 / 26 | 24 / 30 | 700 |
| `lead` | 17 / 26 | 20 / 30 | 400 |
| `body` | 16 / 26 | 17 / 28 | 400 |

---

## 3. Shape

| Element | Radius | Note |
| --- | --- | --- |
| **Buttons (all sizes)** | **45 px** (renders as a full pill at every button height) | The founders' choice. Pills read as tappable and soften the interface |
| Chips, segmented tabs, badges, toggles | 999 px (pill) | |
| Inputs and selects | 16 px | Slightly squarer than buttons so fields don't look like buttons |
| Cards | 24 px | |
| Small cards inside cards (list rows, inner tiles) | 16 px | **Nested radius rule:** inner radius = outer radius − padding (a 24 px card with 8 px padding gets 16 px inner corners) |
| Bottom sheets | 28 px top corners | |
| Dialogs (desktop) | 28 px | |
| Images in cards | Same as the card's inner radius | |
| Maps | 20 px when inside a card; square when full screen | |

Borders are 1 px `--line` by default, 1.5 px `--line-strong` for inputs, 2 px `--green-700` for the
selected state of a selectable card.

---

## 4. Elevation and surfaces

Three levels only, so elevation means something:

| Level | Token | Shadow | Use |
| --- | --- | --- | --- |
| 0 | flat | none, 1 px `--line` border | Most cards and list rows |
| 1 | raised | `0 1px 2px rgba(15,26,20,.06), 0 8px 24px -12px rgba(12,80,52,.18)` | The one card that matters most on a screen (money card, current trip), sticky bars |
| 2 | floating | `0 12px 40px -8px rgba(15,26,20,.22)` | Sheets, dialogs, the raised centre tab, toasts |

- The app background is `--paper`; cards are `--surface`. That small difference does most of the work,
  so shadows can stay light.
- No glass, no blur panels in the app. On the website only, the navigation bar over the hero image may
  use a frosted white (`rgba(255,255,255,.72)` with a 12 px backdrop blur) because it sits on a photo.

---

## 5. Spacing, grid and breakpoints

- **4-point scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.
- Phone side padding 16; gap between cards 12; padding inside cards 16 (20 on desktop).
- **Breakpoints:** phone below 600; tablet 600 to 1023; desktop 1024 and up; wide 1440 and up.
- **App desktop:** sidebar 240 to 260, content up to 1200 wide, 12-column grid with 24 gutters;
  detail screens 8 + 4 columns (main + side panel).
- **Website:** content up to 1200, text blocks up to 680; sections separated by 96 (desktop) or 64
  (phone).
- **Touch targets** at least 48 × 48; main buttons 56 tall (64 on driver screens).
- Respect phone safe areas (notch, home bar) with `env(safe-area-inset-*)`.

---

## 6. Icons, imagery and brand motifs

### 6.1 Icons

**Lucide only**, 1.75 px stroke, 20 px in dense UI, 24 px default, 28 px on driver screens. The
component code you collected imports four icon libraries (react-icons, Hugeicons, Lucide and others);
replace every icon with its Lucide equivalent when adding a component. One set keeps the style
consistent and the app smaller. Icons always sit beside a text label on buttons and tabs.

### 6.2 Photography

- **Subjects:** Nigerian trucks (flatbeds, covered trucks, tippers) on real roads; truck parks such as
  Ojota, Kano and Onitsha; loading scenes at markets and warehouses; drivers and owners at work, shown
  with dignity; goods being checked at delivery.
- **Light:** warm daylight, early morning or late afternoon; avoid harsh noon shadows and night shots.
- **Treatment:** natural colour, slightly warm; on the website hero a soft green-to-transparent gradient
  at the bottom (from `rgba(8,56,38,.65)` to transparent) keeps white text readable.
- **Source:** a day's shoot at a truck park and a market with a phone camera is enough, costs nothing
  but time, and looks real. Get written permission from everyone recognisable, and blur number plates
  and company names on trucks that aren't ours. Free libraries (Unsplash, Pexels) only for filler, and
  only images actually taken in Nigeria or West Africa.
- **Formats:** AVIF with WebP fallback via `next/image`; hero images 1920 px wide at most 250 KB; card
  images 800 px at most 80 KB.

### 6.3 Illustration

Simple flat line illustrations in Freight Green and `--ink` with road-yellow accents, for: truck type
chips, goods chips, empty states, onboarding slides and the welcome screens. Consistent 2 px stroke,
rounded joins, no gradients, no 3D in illustrations. One illustrator style throughout.

### 6.4 Brand motifs

- **Road line:** a dashed line (dash 12, gap 10, 3 px, rounded caps) in `--line-strong`, with the
  "travelled" part solid Freight Green and the current position marked by a road-yellow dash. Used for
  the trip progress line, step progress in onboarding and booking, website section dividers and the
  loading indicator (dashes moving along the line).
- **Africa outline:** the continent from the logo as a very faint watermark (4% opacity) in the website
  hero and the welcome screens. Never inside the app's working screens.
- **Truck silhouette:** the logo's truck, small, as the marker on maps and on the progress line.

---

## 7. Buttons and the hierarchy of actions

### 7.1 The five kinds

| Kind | Look | When |
| --- | --- | --- |
| **Primary** | Freight Green fill, white 600-weight text, 45 px radius, 56 tall, full width on phones | The one thing this screen is for. **Exactly one per screen** |
| **Secondary** | `--green-50` fill, Freight Green text, same shape and height | A real second option of lower importance (Save and pay later, Offer a different price) |
| **Tertiary** | Text only, Freight Green, 600 weight, underline on hover | Small optional actions (Edit, See all, Change) |
| **Destructive** | Text only in `--danger`, or a `--danger` outline when it must stand alone | Cancel trip, Remove, Delete. A filled red button appears **only** inside the confirm sheet that follows |
| **Icon button** | 48 px circle, `--surface` with 1 px `--line`, icon in `--ink` | Directions, Chat, Call, Copy |

Rules:
- Primary and secondary never look alike: different fill and colour, so the main action is never
  mistaken for a secondary one.
- The primary button's label states the result and the amount: "Pay ₦1,030,000", "Accept for ₦950,000".
- On phones the primary button sits at the bottom, above the tabs, in a sticky bar with a 1 px top
  border. On desktop it sits at the end of the content or at the bottom of the side panel, right-aligned
  in forms, never stretched across 1200 px.

### 7.2 States

| State | Primary | Secondary |
| --- | --- | --- |
| Default | #0C5034 | #EEF5F0 / text #0C5034 |
| Hover (desktop) | #0A4530, lift 1 px | #DCEBE2 |
| Pressed | #083826, scale 0.97 | #CFE3D7, scale 0.97 |
| Focus | 3 px outline #2F7A57 at 2 px offset | same |
| Loading | Label replaced by three road-line dashes moving left to right; width stays the same | same |
| Disabled | #C9D3CC fill, #7A887F text, and a line under the button saying why ("Add the vet certificate to continue") | same |
| Success (after money actions) | Morphs to `--success` fill with a check and the past-tense result ("Payment received") for 1.2 s, then moves on | — |

---

## 8. Cards

Every card is `--surface`, 24 px radius, 16 px padding, 1 px `--line` border, level 0 unless stated.

| Card | Purpose | Anatomy and treatment |
| --- | --- | --- |
| **Money held** | Reassure that money is safe | `--green-100` background, no border; lock icon, one sentence ("₦630,000 held safely. Released when delivered."), amount in 700 weight |
| **Money card** | Payout or price breakdown | Level 1; label-amount rows with tabular numbers; total row separated by a 1 px line and set in `title-2` |
| **Trip card** (lists, Home) | A trip at a glance | Route on line 1 (600), status chip right-aligned; line 2 the next step; line 3 money held or next payout in `--ink-2`; a thin road-line progress bar along the bottom edge |
| **Load card** (load board) | Help owners decide | Route in `title-2`; pickup time and goods with icon; **"You get ₦950,000"** in `display`-sized bold on the right (phones: below); badges row; shipper line in `caption` |
| **Truck card** | A truck's state | Photo top (16:9, inner radius), plate in 700 tabular, availability chip, papers status |
| **Action row** (Needs your action) | One thing to do | Flat row inside a card: icon in a 40 px tinted circle, one line, a small secondary button on the right |
| **Selectable card** (truck type, goods, plan-style choices) | Pick one | 1 px border; selected: 2 px Freight Green border animated into place, check circle top right |
| **Promo card** (Home carousel) | Announcements, tips, offers | Photo or illustration on the left or top, one headline, one line, one tertiary link; road-yellow badge if it's an offer |
| **Status banner** | Something that changes the screen's meaning | Full width, colour by meaning (info, warning, danger), icon, one or two sentences, optional tertiary action |

No coloured stripes along card edges, no rainbow card colours, no shadows on every card.

---

## 9. Forms and inputs

- **Text inputs:** 56 tall, 16 px radius, 1.5 px `--line-strong` border, `--surface` fill, label above
  in `label` style, helper text below in `caption`. Focus: 2 px Freight Green border and a 4 px
  `--green-100` ring. Error: `--danger` border, message below with an icon.
- **Phone input:** fixed "+234" prefix inside the field, formats as you type.
- **Money input:** "₦" prefix, thousands separators as you type, tabular numerals.
- **Code input (6 digits):** six 56 × 64 boxes, 16 px radius, `title-1` digits, auto-advance.
- **Chips:** pill, 40 tall, 1 px border; selected: `--green-100` fill, Freight Green text, check icon.
  Picture chips (truck types, goods): 104 × 112 tiles, 20 px radius, illustration above label.
- **Toggles:** 52 × 32 pill; on = Freight Green.
- **Steppers** (counts, tonnes): the pill stepper with rolling digits (see §17).
- **Sliders:** 6 px track, Freight Green fill, 28 px thumb with a 1 px border and level-1 shadow.
- **Bottom sheets** for pickers on phones; popovers on desktop.
- **Never** ask for typing where a chip, picker, camera or lookup can do it.

---

## 10. Navigation

### 10.1 Phone bottom tabs

Built from the **continuous tabs** component (§17), adapted:

- A white bar, 72 px tall plus the safe area, 1 px `--line` top border, level 2 shadow.
- Each tab: icon (24 px) above label (13 px, 600). Active tab: Freight Green icon and label, and a
  `--green-100` pill behind the icon that **slides** between tabs with the continuous-tabs spring.
  Inactive: `--ink-2`.
- **Raised centre action** where a role has one (Book for shippers, Invite for agents, Drive for
  owner-drivers): a 60 px Freight Green circle with a white icon, raised 16 px above the bar with a level
  2 shadow, label under it. It doesn't slide; it's always a button.
- Badges: a red dot or count at the icon's top right, with a 2 px white ring.
- Tabs hide during booking, full-screen maps and the photo viewer, and slide back in on exit.

### 10.2 Desktop sidebar and top bar

- Sidebar `--surface`, 1 px right border. Items 44 tall, 12 px radius, icon + label; active item
  `--green-100` background with a Freight Green label. The role's main action sits at the top as a
  primary pill button.
- Top bar `--surface`, 64 tall, 1 px bottom border; search as a 44 px pill input with "⌘K" hint
  (command search, §17).

### 10.3 In-page tabs and segmented controls

Pill segmented control (continuous tabs styling, light only) for Trips tabs, Earnings tabs, Owners /
Senders, and the website's "I send goods / I own trucks" switch.

### 10.4 Moving between screens

- Pushing deeper (list → detail): new screen slides in from the right 24 px with a fade, 240 ms;
  back reverses it. Uses the browser View Transitions API where supported, otherwise Motion.
- Switching tabs: crossfade 150 ms, no slide.
- Sheets: rise from the bottom with a spring; drag down to close; the background dims to
  `rgba(15,26,20,.32)`.
- The browser's own back gesture and button always work.

---

## 11. Feedback

| Pattern | Look and behaviour |
| --- | --- |
| **Toast** | Dark ink pill (#0F1A14, white text) at the bottom above the tabs (desktop: bottom left), level 2, slides up, stays 4 s; one optional action ("Undo") |
| **Banner** | Status banner card (§8) at the top of the content |
| **Empty state** | Line illustration (120 px), one sentence, one primary or secondary button; the road line runs beneath the illustration |
| **Skeleton** | `--line` blocks in the content's shape with a slow shimmer (1.6 s) from left to right; never a spinner alone for more than 300 ms |
| **Inline error** | `--danger` text with an icon under the field; what happened and how to fix it |
| **Success moment** | Reserved for money and milestones (payment received, advance paid, balance paid, truck approved): a check mark that draws itself, the amount counting up (NumberFlow), a short vibration on phones. Never confetti |
| **Offline** | A `--warning` strip under the top bar: "You're offline. We'll send your changes when you're back." |

---

## 12. Motion

### 12.1 Principles

1. **Motion explains.** Something moves to show where it came from, where it went, or that something
   happened. If it explains nothing, it doesn't move.
2. **Work screens are calm.** Booking, paying, driving and admin screens use only short, functional
   motion. Expressive motion (parallax, 3D, scroll stories) belongs on the website and the first-launch
   welcome screens.
3. **Fast.** Most transitions finish in under 300 ms; nothing blocks input while animating.
4. **Kind to cheap phones.** See 12.4.

### 12.2 Tokens

| Token | Value | Use |
| --- | --- | --- |
| `instant` | 100 ms ease-out | Colour and hover changes |
| `quick` | 150 ms ease-out | Tab crossfades, chip selection |
| `standard` | 240 ms cubic-bezier(.2,.8,.2,1) | Screen push, card expand |
| `gentle` | 400 ms cubic-bezier(.2,.8,.2,1) | Banners appearing, content reveals on the website |
| `spring-ui` | stiffness 260, damping 24, mass 0.9 | Buttons morphing, tabs sliding, sheets |
| `spring-soft` | stiffness 140, damping 22, mass 0.8 | Number rolling, large cards |
| `stagger` | 40 ms per item, at most 6 items | Lists appearing on first load |

The component code you collected uses springs with low damping (bounce around 0.55). Use the tokens
above instead: a little settle feels polished, a big bounce feels like a toy on a money screen.

### 12.3 What moves, where

| Where | Motion |
| --- | --- |
| Buttons | Press scales to 0.97; primary morphs to the success state after money actions |
| Tabs | Active pill slides (spring-ui) |
| Lists | First load staggers in (fade + 8 px rise); live updates insert with a height animation and a brief `--green-50` highlight |
| Trip progress line | The travelled part grows; the yellow dash glides to the new position |
| Map truck marker | Moves smoothly between location points; rotates to heading |
| Money amounts | Roll to the new value (NumberFlow) |
| Status chips | Crossfade colour and text |
| Codes accepted | Boxes turn green one after another (30 ms apart), then the check draws |
| Sheets and dialogs | Spring up; background dims |
| Website | Hero entrance, scroll story, parallax, 3D (§13) |

### 12.4 Performance and accessibility rules

- **Reduced motion:** wrap the app in `MotionConfig reducedMotion="user"`. When the phone asks for
  reduced motion: no parallax, no 3D, no scroll scrubbing, no slideshow movement (show the first image),
  no video (show the poster); transitions become simple fades.
- **Blur is expensive.** Many of the collected components animate `filter: blur()`. On phones and in
  the app, replace blur transitions with opacity and a small translate. Blur stays allowed on the desktop
  website.
- Animate only `transform` and `opacity` in the app. No animating width/height on long lists.
- Use Motion's `LazyMotion` with `domAnimation` and the `m` component to keep the bundle small.
- Budget: the app's first screen interactive within 3 s on a mid-range Android on 4G (Moto G class);
  JavaScript for the first screen under 170 KB compressed.
- Pause anything animated that's off screen or in a background tab.

---

## 13. Public website

### 13.1 Look

The website is where the brand can be most expressive: large photography, the road line running
between sections, scroll-driven storytelling, and one 3D moment. It stays light, airy and fast.

### 13.2 Header

Built to the approved Gate 2 target, `docs/design/targets/gate-2/` (founder, 18 Nov 2026); the target wins
over this summary.

- **Shape:** a **solid white pill** (nothing shows through it), fixed, 28 px from the top on desktop
  (12 px on phones), at most 1200 px wide with 40 px side insets (12 px on phones); 64 px tall (56 px on
  phones), fully round ends, padding 8 px (6 px on phones), the `--shadow-pill` shadow, a little deeper
  after 80 px of scrolling.
- **Desktop:** logo left; **How it works, Routes, Pricing, Questions** centred (15 px semibold, a green-50
  pill on hover); right: **Sign in** (to `app.freight-africa.com/auth`) and **Join the waitlist**.
- **Phones:** logo, a 44 px round menu button (opens the bottom sheet with the links, Sign in and Join),
  and **Join the waitlist**.

### 13.3 Home page, section by section

1. **Hero** (Gate 2 target, 18 Nov 2026; supersedes the description below where they differ): an inset
   rounded photo (16 px margin and 32 px radius on desktop, 8 px and 24 px on phones; 680 px tall, 560 px
   on phones) with the `hero-fade` dark fade on the text side; the badge, headline (`type-hero-xl`) and
   lead (`type-hero-lead`); the slideshow's progress bars and pause button; the **waitlist bar** on the
   photo's bottom edge (I send goods / I own trucks, Your route, Your WhatsApp number, Join the waitlist;
   it hands the sign-up to `/waitlist`, prefilled); and the proof row under it. On phones the bar stacks
   into a card under the headline. Its states are on `/dev/landing-states`. New tokens: `--radius-field`
   (14), `--radius-tray` (18), `--radius-hero` (32), `--shadow-bar`, and the utilities `hero-fade`,
   `type-hero-xl`, `type-hero-lead`, `grid-cols-waitlist`, `object-photo`.
   The earlier description, kept for the parts it still governs (photos, slideshow timing):
   **Hero** (based on Hero-32). Full-bleed background, **at most 88% of the screen height on desktop
   and 80% on phones**, so the next section peeks and invites scrolling.
   - **Background, choose one:** (a) a **slideshow** of 4 photographs (truck on the Lagos–Ibadan
     expressway at dawn; a loaded flatbed at a Kano park; goods being checked at an Onitsha market;
     a driver handing over at a warehouse), crossfading every 6 s with a very slow zoom (scale 1.00 to
     1.06 over 6 s); or (b) a **faint background video**: 12 to 20 seconds, looping, muted, no sound
     track, 1280 × 720, under 1.5 MB (H.264 MP4 and WebM), dimmed by the green gradient.
     The video loads only on desktop or fast connections (`navigator.connection.effectiveType` 4g and
     `saveData` off) and after the first paint; everyone else gets the slideshow. A poster image shows
     instantly in both cases.
   - **Until our own shoot** the slideshow uses 4 licensed photographs taken in Nigeria (credits in
     `public/photos/CREDITS.md`, number plates blurred). Image 1 is preloaded (AVIF/WebP, at most
     250 KB at 1920 px, 120 KB at 828 px for phones); images 2 to 4 load after first paint. The
     slideshow pauses when the tab is hidden, shows only image 1 with reduced motion, and has a 44 px
     pause/play button in the hero's bottom-left corner (it moves for more than 5 s, WCAG 2.2.2). A
     green gradient (`rgba(8,56,38,.78)` at the text side to `.35`) keeps white text at 4.5:1 or more
     on every image; check each image, not just the first.
   - **Faint Africa outline** watermark at 4% white behind the headline.
   - **Headline** (hero size, white): "Move full truckloads across Nigeria." **Line 2** (lead): "Pay once.
     Your money is held safely until the goods arrive."
   - **Quote box** inside the hero, a white level-2 card: From · To · What (top goods chips) and the
     primary pill **See price**. The price appears in the same card. This is the real action; the
     hero exists to frame it.
   - **Secondary action:** a tertiary link with a play icon, **Watch how it works (1 min)**, opening
     the explainer video in a dialog (the Hero-32 play pattern).
   - **Entrance:** headline words rise and fade in, 40 ms apart; the quote card rises 24 px; total under
     800 ms. No blur on phones.
2. **Proof strip.** Three statements with icons on `--surface`: Verified truck owners · Money held until
   delivery · Live tracking. No fake logos. When real business customers agree, their logos can be
   added in greyscale.
3. **How it works: a scroll story.** A sticky section: on the left, four steps (Book · A verified truck
   accepts · Track it · Confirm with a code); on the right, a phone frame showing the matching app
   screen. As the user scrolls, the road line on the left fills and the truck marker moves down it; each
   step's screen slides in. On phones the same four steps stack, each with its screenshot, and the road
   line runs down the left edge.
4. **Your money is safe: the escrow story.** The escrow diagram from the blueprint, drawn as an animated
   illustration: the payment drops into a green "held" vault, then flows out in two parts as the truck
   icon reaches "Loaded" and "Delivered". It plays once when 40% visible.
5. **For senders / For truck owners.** A segmented switch (continuous tabs) toggles two columns of
   benefits, each with a photo, three benefits and a primary button (**Get a price** / **Join as a truck
   owner**).
6. **Our routes.** A stylised map of Nigeria (flat, light green land, white roads) with the four
   corridors drawn as Freight Green road lines that draw themselves on scroll. Hover or tap a corridor:
   a card with "Lagos → Kano · 2 to 3 days · from ₦X" and **See route**.
7. **The 3D moment** (desktop, fast connections only): a low-poly 3D model of the Freight Africa truck on
   a short stretch of road. It turns slowly with the mouse (within 15°) and the road scrolls under it as
   the page scrolls. Built with three.js and a compressed glTF model (under 400 KB with Draco), loaded
   only when the section approaches the screen and the browser is idle. Everyone else sees a high-quality
   rendered still of the same model. If budget is tight, ship the still first; the section works without
   the 3D.
8. **Pricing.** Based on the changeable pricing section: a switch for **Senders / Truck owners** instead
   of monthly/yearly; the fee steps and the worked example. Numbers roll when switching (NumberFlow).
9. **What people say** (Testimonials-1). **Only real quotes from real customers, with their written
   permission.** At launch there are none, so this section is hidden until there are at least three.
   Never invented names or quotes.
10. **Questions** (FAQ-2) with categories (Booking, Payments, Trucks and drivers, Safety). FAQPage
    structured data.
11. **Final band.** Freight Green background, white headline "Book your first truck today," and a white
    pill button with green text **Get started**; the road line runs across the band.
12. **Footer.** Routes, company links, legal, the support WhatsApp number as text with copy, social
    links.

### 13.4 Other website pages

- **For truck owners, For agents:** based on Hero-31 (split hero with text left and photo right, staggered
  entrance), then benefits, how payment works for them, requirements, FAQ, final band.
- **Route pages:** a compact hero with the corridor drawn on a small map, the price range table, time
  on the road, quote box prefilled, FAQ.
- **Pricing, How it works, Safety, Help:** the same section styles; no 3D, no video.

### 13.5 Website performance

- Largest content (the hero image or poster) visible within 2.5 s on a mid-range phone on 4G.
- Hero image preloaded; slideshow images 2 to 4 load after the first paint.
- No layout shift: every image and video has fixed dimensions.
- 3D and video are progressive extras; the page is complete without them.

---

## 14. First launch, sign-in and onboarding

### 14.1 Launch screen (installed app)

When the installed app opens: `--surface` background, the submark logo centred at 96 px, and the road
line drawing itself beneath it (600 ms). It disappears as soon as the first screen is ready; never held
for show.

### 14.2 Welcome screens (first launch only, skippable)

Three full-screen slides, each with a line illustration (top 55%), a title, one line, and dots. **Skip**
top right on every slide; on the last, the primary **Get started**. Swipe between slides; the road line
connects the three illustrations so it appears to continue from slide to slide.

| Slide | Senders (default) | Owners and drivers (when arriving from an owner link or invite) |
| --- | --- | --- |
| 1 | "Book a truck in a minute." Verified truck owners on four routes | "Find loads for your truck." Loads are paid before you move |
| 2 | "Your money is held safely." It's released only when your goods arrive | "Get paid fast." Advance when loaded, the rest minutes after delivery |
| 3 | "Track every kilometre." Live location and a delivery code for your receiver | "One button for the whole trip." Big, simple and works offline |

Not shown again after sign-in, or when the app is opened from a deep link.

### 14.3 Sign-in and sign-up

Built to the approved Gate 1 target, `docs/design/targets/gate-1/` (founder, 18 Nov 2026); the target wins
over this summary.

- **Desktop (from 1024 px):** two columns inside a 16 px frame. Left: an inset deep-green panel
  (`--color-green-900`, radius `--radius-sheet`, the `panel-glow` soft light and a faint road line), with
  the white logo top-left, a live trip card and the "Your payment is held" card offset below it
  (decorative, `aria-hidden`, no real data), and the approved line at the bottom. No photo. Right: a
  "Back to the website" pill top-right, the form centred at 400 px, a footer with the help email on the
  left and © on the right.
- **Form:** "No password needed" pill, the title (`type-signin`, 36/42, 28/34 on phones), the lead
  (`type-signin-lead`), a 56 px email field with a mail icon (`text-control`, 16 px), **Send code →**, the
  10-minute line, and the terms below a divider.
- **Phone and tablet:** the green band (296 px) with the logo and the trip card only; the form rises over
  it as a white sheet with 28 px top corners.
- **Code screen:** six boxes (56 px, 64 px from 1024 px, digits `type-code-digit`); a filled box is
  green-tinted, the current box has the focus ring; "Change" beside the address; "Didn't get it? Check
  spam, or" with the resend countdown; the code is checked as soon as the last digit goes in. Every
  state is on `/dev/sign-in`.
- **Tokens added for it:** `--text-control` (16/24), `--text-body-sm` (14/18), `--text-micro` (11/14),
  `--shadow-panel-card`, `--tracking-plate`, and the utilities `panel-glow`, `type-signin`,
  `type-signin-lead`, `type-code-digit`.

### 14.4 Onboarding

- **Progress:** the road line across the top of each step, travelled part solid green, a small truck
  marker at the current step.
- **One question per screen** for short forms (based on the progressive input stack, §17): the
  answered fields stack above, slightly smaller, so people see their progress.
- **Camera steps** (ID, plate, papers): full-screen camera with a white guide frame and a short
  instruction at the top; after capture, the read result appears in a sheet for confirmation.
- **Success** at the end of setup: the checklist items tick one after another and the truck marker
  drives to the end of the road line.

---

## 15. Images and carousels inside the app

The app is a tool, so imagery is used where it helps people recognise things, never as decoration over
work:

- **Truck photos** on truck cards, load cards (shipper sees the truck once assigned) and trip screens,
  so people can recognise the truck at the gate.
- **Driver photo** (from the identity check) on trip screens and the receiver's page.
- **Goods and truck-type illustrations** on chips and pickers.
- **Home announcement carousel** (shipper, owner, agent Home only): a row of promo cards **below** Needs
  your action and Live trips, never above them. 1 to 4 cards: launch offers, safety tips ("How the
  delivery code protects you"), new routes, a short video guide. Swipe on phones, arrows on desktop;
  auto-advance every 7 s, paused when touched or when reduced motion is on. Each card has one tertiary
  link. Managed by staff in the Admin console's website content section.
- **No carousels** on driver screens, payment screens, the load board or any admin page.
- **Empty states** use the line illustrations.

---

## 16. Making a PWA feel like an app

| Area | Rule |
| --- | --- |
| Display | `display: standalone`; theme colour #0C5034 for the status bar on Android; `--paper` background colour so the launch is seamless |
| Icons | Use the logo kit's icons (192, 512, maskable 512, Apple touch 180) |
| Viewport | `viewport-fit=cover`; layouts use `100dvh`, not `100vh`, so the browser bar doesn't cut content |
| Safe areas | Tabs, sticky buttons and sheets add `env(safe-area-inset-bottom)` |
| Overscroll | `overscroll-behavior-y: contain` on the app shell so the page doesn't bounce like a website; pull to refresh is our own, on lists only |
| Selection and taps | `user-select: none` on navigation and buttons (not on content); `-webkit-tap-highlight-color: transparent`; every tappable element has its own pressed state |
| Transitions | Screen transitions as in §10.4; no full-page white flashes between routes |
| Haptics | `navigator.vibrate` for confirmations on Android (short 15 ms for success, two pulses for errors); silently skipped where unsupported |
| Offline | The app shell and last data load offline (service worker); the offline strip explains what works |
| Install | The install prompts in A-08; after install, the app opens directly to the role's home |
| Updates | When a new version is ready: a toast "A new version is ready" with **Refresh**; never during a trip or payment |
| Keyboard (desktop) | Command search on ⌘K / Ctrl K; Escape closes sheets and dialogs; visible focus everywhere |
| Text | System text-size settings respected; no zoom blocking |

---

## 17. The Watermelon UI components: where each one goes

The components you collected are installed with the shadcn CLI from the Watermelon registry
(`npx shadcn@latest add https://registry.watermelon.sh/r/<name>.json`). For the blocks listed without a
URL (`hero-32`, `hero-31`), use the full registry URL; the bare names may resolve to a different
registry. Check each component's licence on watermelon.sh before shipping.

**Adaptation applied to every component:**
1. Remove all `dark:` classes (light only).
2. Replace colours with the tokens in §1 (no greys like #F4F4F4 buttons for primary actions; no purple,
   cyan or rainbow card colours).
3. Replace icons with Lucide (§6.1) and remove the other icon packages.
4. Apply the radius rules (§3) and motion tokens (§12.2); remove blur transitions in the app (§12.4).
5. Replace demo text (survey steps, "ETH", "Haven", "Watermelon") with our real copy.
6. Replace demo images hosted on `assets.watermelon.sh` with our own images.
7. Remove `alert()` and `console.log` from demo handlers.
8. Wire state to real data: any component that runs on a timer (for example the run-action button's
   steps every 1.2 s) must instead follow real events.

| Component | Where it's used | How it's adapted |
| --- | --- | --- |
| **Morphing button** | Website and app "Tell me when you cover this route" (off-corridor quotes); the pre-launch waitlist | Bell icon → Lucide bell; expands to a phone-number field (not email) with a Freight Green **Notify me** |
| **Run action button** | Payment status on S-06 (Waiting for your transfer → Payment received → Finding a truck); identity check progress | Steps driven by real webhooks, never a timer; success state uses `--success` |
| **Split button** | Agent Invite (Truck owner / Sender); statement download (PDF / Spreadsheet); Book again (this lane / change details) | Main button keeps the primary or secondary style it replaces; never for destructive choices |
| **Timed undo action** | Low-risk removals only: delete a saved place or receiver, decline an offer, withdraw an owner's counter, remove an invite | Red only on the countdown chip; **never** for cancelling trips, refunds or anything with money (those use confirm sheets) |
| **Stepper** | Tonnes on S-03 (with the slider), "how many affected / out of how many" in problem reports, number of drop-offs | Rolling digits kept; buttons 48 px; light neutrals from §1 |
| **Minimal carousel** (expanding cards) | Owner Home "Your trucks" summary on desktop; agent Earnings summary cards | Cards use `--surface` with a coloured icon circle, not solid colour fills; expanded card shows details and one action |
| **Pricing widget** | The **Change truck** sheet on S-03 and the truck-type picker: options with an animated selected border and rolling price difference | Monthly/yearly switch removed; currency NGN; "Popular" badge becomes "Suggested" |
| **Progressive input stack** | Short onboarding forms (shipper setup, agent "about you"), invite by phone number, add a driver | One field per step; toggle steps keep the pill switch |
| **Range selection slider** | Load board filter (pickup distance, minimum pay), load alerts minimum pay, reports date ranges | Rolling numbers in NGN; thumbs 28 px |
| **Show QR** | Agent QR code (G-02a); desktop "Continue on your phone" during ID checks; field agent on-the-spot onboarding | Logo in the centre of the code; brightness raised while open |
| **Slot picker** | Loading day and time on S-04; truck availability dates | Slots are the four time windows; past slots disabled |
| **Layered progressive disclosure** | Price breakdown ("Details"), "What's included", trip details sheet (D-15), dispute evidence | Plus icon → Lucide chevron; layers open in place |
| **Changeable pricing section** | Website pricing page and pricing section on the home page | Switch = Senders / Truck owners |
| **Reveal copy** | Account number on S-06 Pay; invite links; delivery and loading codes for shippers; staff backup codes | Copies and confirms "Copied"; codes stay hidden until tapped on shared screens |
| **Command search** | Admin global search; desktop app search (⌘K) for shippers and owners | Results grouped by Trips, Loads, People, Places |
| **Continuous tabs** | **Mobile bottom navigation** (as you suggested) and every segmented control | Adapted per §10.1: icons above labels, sliding green pill, flat white bar (no gradient or inner shadows), raised centre action |
| **Hero-32** | Website home hero | Background slideshow or faint video (§13.3), our headline, quote card, "Watch how it works" play link |
| **Hero-31** | For truck owners and For agents pages | Split layout, our photography; "Trusted by" line removed until real |
| **FAQ-2** | Website FAQ and the help centre | Categories from §13.3 |
| **Navigation-5** | Website header | Links and buttons from §13.2 |
| **Testimonials-1** | Website testimonials | Hidden until there are at least three real, permitted quotes |

**Libraries these bring in:** `motion` (import from `motion/react`), `@number-flow/react`,
`react-use-measure`, and shadcn's base components. They assume **Tailwind CSS v4** (classes such as
`perspective-midrange` and `w-84` are v4). Map Tailwind's theme to the tokens in this file in one
`globals.css` `@theme` block so every component reads the same colours, radii and fonts.

---

## 18. Engineering notes

- **Tokens in one place:** a `@theme` block in `app/globals.css` with every colour, radius, shadow, font
  and motion token from this file; components never use raw hex values.
- **Font:** `next/font/local` for `JakartaFA.woff2` (D034), variable weight `400 800`, `display: swap`,
  preloaded, `adjustFontFallback: "Arial"`.
- **Images:** `next/image` with AVIF/WebP, fixed sizes, `priority` only on the hero image.
- **Video:** `<video muted playsinline loop preload="none" poster>`; the source is added by script after
  checking the connection and reduced-motion setting.
- **3D:** `three` plus `GLTFLoader` with Draco, imported dynamically in the website's 3D section only;
  never in the app bundle.
- **Motion bundle:** `LazyMotion` with `domAnimation`; the `m.` component everywhere in the app.
- **Icons:** `lucide-react` with per-icon imports.
- **Reduced motion:** `MotionConfig reducedMotion="user"` at the root; CSS animations wrapped in
  `@media (prefers-reduced-motion: no-preference)`.
- **Testing:** check every screen on a mid-range Android (Chrome), an iPhone (Safari, installed), and
  desktop Chrome at 1280 and 1440, at 200% text size, and with reduced motion on.

---

## 19. Review checklist (every screen, before it ships)

1. Is there exactly one primary button, and does its label say what happens (with the amount where
   money moves)?
2. Could anyone mistake a secondary action for the primary? If yes, fix the styles.
3. Is the most important information (money, status, next step) the first thing on the screen?
4. Is every status shown with a word, not only colour?
5. Are touch targets at least 48 px, and do buttons and cards use the radius rules?
6. Is there any colour, shadow, blur or animation that explains nothing? Remove it.
7. Does it work at 200% text, with reduced motion, offline, and on a cheap Android phone?
8. Are all images real, permitted and optimised?
9. Is any testimonial, logo or number shown that isn't real? Remove it.
10. Does anything in §0.2 appear? Fix it.

---

## 20. Craft standard: pixel-perfect, simple, calm

The founders' bar: every screen as clear and quietly polished as a well-made Apple app. Clarity first,
the interface stays out of the way of the content, and depth is used only to show what sits above
what. Nothing complicated or twisted.

### 20.1 Rules every screen meets

1. **Only tokens.** Every colour, size, radius, shadow, spacing value and duration comes from the
   `@theme` tokens. Arbitrary values (`w-[13px]`, `#3a3a3a`) are not allowed; if a value is truly
   needed, add it as a token here first.
2. **The 4-point grid.** Every dimension, padding, gap and offset is a multiple of 4. Text sits on a
   4-point baseline; rows of mixed text sizes align on the first baseline.
3. **Crisp edges.** Borders are whole pixels. No element is positioned on a half pixel (watch
   centring with odd widths and `translate(-50%)`); round to whole pixels.
4. **Optical alignment.** Icons sit visually centred with their labels (Lucide icons beside 15 px text
   usually need a 1 px downward nudge, applied once in the Icon component, not per screen). Play and
   arrow icons inside circles are nudged towards their visual centre.
5. **Consistent gaps.** Icon to label 8; label to field 8; field to helper 6 (the one exception to the
   4-point rule, defined as a token); between fields 20; between sections 32 (phone) or 48 (desktop).
6. **One primary action** (§7) and a clear reading order: title, the key fact, details, actions.
7. **Real content everywhere.** Designs and builds use realistic Nigerian names, routes, plates and
   naira amounts at their longest likely lengths ("Dawanau International Grains Market, Kano"), never
   lorem ipsum. Long text wraps or truncates with a full-text tooltip; nothing overflows.
8. **Every state designed.** Default, hover, pressed, focus, disabled, loading, empty, error, offline
   and success for every interactive component and screen.
9. **Images never stretch.** Fixed aspect ratios with `object-fit: cover` and a focal point.
10. **Simplicity test.** If removing an element doesn't lose information or a needed action, remove
    it.

### 20.2 How it is checked

- **Component gallery:** every component has a page at `/dev/components` (development builds only)
  showing all its states with real copy.
- **Screenshots at four widths:** 375, 768, 1280 and 1440 px, captured by Playwright for every screen
  and compared against approved baselines (`toHaveScreenshot`, maximum 0.1% pixel difference). A
  changed baseline needs the founder's approval in the pull request.
- **Zoom review:** each new screen is reviewed at 200% browser zoom and at 200% text size for alignment
  and clipping.
- **The review checklist in §19** is completed for every screen in its pull request description.
- **Real devices:** a mid-range Android phone and an iPhone with the app installed, before a screen is
  accepted.
