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

One PWA. After sign-in, `/app` redirects to the shell for the person's active role (the last used,
stored in `profiles.last_active_org_id`).

| Shell | Base route | Bottom tabs on phone (side nav on desktop) |
| --- | --- | --- |
| Shipper | `/app/ship` | Home · Trips · **Book** (centre, raised) · Payments · More |
| Transporter owner | `/app/haul` | Home · Loads · Trips · Earnings · More |
| Owner-driver | `/app/haul` | Home · Loads · **Drive** · Earnings · More |
| Driver | `/app/drive` | Trip · Next load · History · Me |
| Agent | `/app/agent` | Home · People · **Invite** (centre, raised) · Earnings · Me |
| Staff | `/admin` | Left sidebar only (desktop first; works on tablet) |

**Top bar (all app shells):** organisation avatar and name (tap → account switcher A-09), page
title, notification bell with unread count (→ notification centre N-01).

**Back behaviour:** the phone's back button and the top-left arrow go to the previous screen in the
same tab. Flows with steps (booking, onboarding) keep the step in the URL so refresh does not lose
progress.

## 3. Visual language

All visual decisions (colour, type, shape, elevation, icons, imagery, motion, the website's look and
the component library) live in `DESIGN_SYSTEM.md`, which this file defers to. In short: light theme
only (with a night look on live driver trip screens), Figtree, Freight Green for every primary action,
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

- **Real time:** trip screens, load board, payouts and chat update live (Supabase Realtime). No pull
  to refresh needed; pull to refresh still works.
- **Deep links:** every WhatsApp and email message links to the exact screen (`/app/ship/trips/{id}`).
  If not signed in, sign-in returns to that link afterwards.
- **Permissions:** a screen or action the person's sub-role can't use is hidden, not disabled. A
  direct link to it shows "You don't have access to this. Ask your account owner."
- **Install prompt:** shown once per device after the first completed action for shippers; required
  step for drivers and owner-drivers (A-08).
- **Push permission:** asked only at a moment that explains it ("Get told when a truck accepts"),
  never on first load.
- **Location permission:** asked only by drivers at **Go to pickup**, with a pre-screen explaining
  why and that location is used only during trips.
- **Session:** stays signed in for 30 days on a phone; staff 12 hours.
- **Accessibility:** WCAG 2.2 AA contrast; all inputs labelled; status never shown by colour alone;
  focus visible; screen reader labels for icons; text scales to 200% without losing content.
