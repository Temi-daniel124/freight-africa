# ux-conventions.md, Freight Africa

**Annex to `docs/PLATFORM-SCOPE.md` (authority 6 of 14).** Visual rules come from `DESIGN_SYSTEM.md`. Defers to `DECISIONS.md`, `DATA-MODEL.md`, `SYSTEM-LOGIC.md` and
`PLATFORM-SCOPE.md`. Shared rules for every screen in the other UX blueprints. A screen spec only
lists what differs from these conventions.

## 1. How to read the screen specs

Each screen has:

- **ID** (`S-04`), **route**, **who** can open it, **features** it delivers (`F-xx`).
- **Layout**: what sits on the screen, top to bottom on a phone.
- **Actions table**: every tappable thing, what it does, and where it goes.
- **States**: loading, empty, error and any special states.
- **Rules**: logic specific to the screen (with references to `SYSTEM-LOGIC.md`).

"→ S-05" means navigate to that screen. "Sheet" means a bottom sheet over the current screen.
"Toast" means a short message at the bottom that disappears after 4 seconds.

## 2. App shells and navigation

One PWA, on `app.freight-africa.com`; the staff console is on `admin.freight-africa.com` (D033). After sign-in, `/app` redirects to the shell for the person's active role (the last used,
stored in `profiles.last_active_org_id`).

| Shell | Base route | Bottom tabs on phone (side nav on desktop) |
| --- | --- | --- |
| Sender | `/app/ship` | Home · Trips · **Book** (centre, raised) · Payments · More |
| Truck owner | `/app/haul` | Home · Loads · Trips · Earnings · More |
| Truck owner with **I drive my own truck** on | `/app/haul` | Home · Loads · **Drive** · Earnings · More |
| Driver | `/app/drive` | Trip · Next load · History · Me |
| Agent | `/app/agent` | Home · People · **Invite** (centre, raised) · Earnings · Me |
| Staff | `/admin` | Left sidebar only (desktop first; works on tablet) |

**Top bar (all app shells):** the person's avatar (tap → account switcher A-09), page title (Home shows
the greeting), notification bell with unread count (→ notification centre N-01). The bar never
overflows: the desktop search pill shrinks first (minimum about 240 px, then a search icon button) and
the switcher name truncates.

**Look (D045):** phone layouts first, like a native app; desktop arranges the same cards in columns
inside the sidebar and top bar, never a separate design. From 768 px, forms and details open in a right
panel (440 to 480 px, header with title and close, actions pinned at the bottom, Esc closes, focus
trapped, scrim); short yes/no confirmations are a small centred dialog; bottom sheets are phone only.
Single-column list pages are capped at about 880 px wide from 1024 px. Route, plate and reference never
wrap; secondary lines truncate with an ellipsis. Touch targets are at least 44 px below 1024 px.

**Back behaviour:** the phone's back button and the top-left arrow go to the previous screen in the
same tab. Flows with steps (booking, onboarding) keep the step in the URL so refresh does not lose
progress.

## 3. Visual language

All visual decisions (colour, type, shape, elevation, icons, imagery, motion, the website's look and
the component library) live in `DESIGN_SYSTEM.md`, which this file defers to. In short: light theme
only (with a night look on live driver trip screens), Inter (D032), Freight Green for every primary action,
45 px pill buttons, 24 px cards, Lucide icons, the road-line motif, calm motion on work screens.

## 4. Components

Button kinds, cards, inputs, chips, navigation, toasts, banners, empty states, skeletons and success
moments are specified in `DESIGN_SYSTEM.md` §7 to §11, and the Watermelon UI component map is in §17.
Two rules matter most for the screen specs here:

- **Exactly one primary button per screen**, labelled with the result and the amount where money
  moves. Secondary actions use the secondary or tertiary style and can never be mistaken for it.
- **Destructive actions** are text links or outlines; a filled red button appears only inside the
  confirm sheet that follows, which states the consequence and the money effect.

## 5. Words

- Use the plain-words list: sender/receiver, delivery note, return load, waiting charge, money held
  safely, how heavy, time on the road.
- Buttons are verbs with the result: "Pay ₦1,030,000", "Enter delivery code", "Send invite".
- Success toasts state what happened in the past tense: "Payment received", "Invite sent".
- Every amount a person pays or receives is shown before they commit.
- Numbers: "₦1,030,000", "600 bags", "30 tonnes", "Tue 12 Nov, 2:30 pm", "in 2 h 15 min".
- Language: English only at launch (D017). All copy still lives in one English message file keyed
  by screen, never typed into components or images, so other languages can be added later.

## 6. Global behaviours

- **Real time:** trip screens, load board and payouts update live (Supabase Realtime). No pull
  to refresh needed; pull to refresh still works.
- **Deep links:** every WhatsApp and email message links to the exact screen (`/app/ship/trips/{id}`).
  If not signed in, sign-in returns to that link afterwards.
- **Permissions:** a screen or action the person's sub-role can't use is hidden, not disabled. A
  direct link to it shows "You don't have access to this. Ask your account owner."
- **Install prompt (D045):** on a phone's first visit, after the slides, a small card slides up (3
  times at most, 7 days apart); a sidebar item on desktop; a required step for drivers and truck
  owners who drive (A-08).
- **Push permission:** asked only at a moment that explains it ("Get told when a truck accepts"),
  never on first load.
- **Location permission:** asked only by drivers at **Go to pickup**, with a pre-screen explaining
  why and that location is used only during trips.
- **Session (D044):** stays signed in on a known device; the app locks after `app_lock_minutes`
  (15) and the PIN opens it; a new device needs email (or phone) and PIN. Staff 12 hours, always with
  the authenticator code.
- **Chat** between trip parties comes in Launch 2 (D045); trip screens have Call only.
- **Accessibility:** WCAG 2.2 AA contrast; all inputs labelled; status never shown by colour alone;
  focus visible; screen reader labels for icons; text scales to 200% without losing content.
