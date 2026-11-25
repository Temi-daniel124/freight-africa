# Sender mockups (v2, for review)

This is every sender screen, on phone and desktop. When the founder approves it, build the screens to match these files exactly. Don't reinterpret them, and don't invent screens that aren't here.

- Live canvas: https://claude.ai/artifact/LENY7B4BBzMjhQsUxecR9u. It has six pages: getting in, booking and paying, trips, money and account, desktop, and PDF documents.
- Put this folder at `docs/design/reference/sender-mockups/`. It replaces v1.
- Open any file in `screens/` in a browser.
  - Phone screens are 390 wide.
  - Desktop screens fill the window and were drawn at 1440 wide.
  - Tall artboards show the whole scroll.
- Shared styles are in `assets/fa.css`: the tokens and every component class. Use it as the reference for the Tailwind tokens and components.
- Sample numbers, names, bank references and `[Registered company name and RC]` are placeholders. Take real values from the code and from DECISIONS.md. The public site never shows fee numbers.

## Product decisions these screens make (record them in DECISIONS.md)

1. **Offers (inDrive-style, but prepaid).**
   - On the price step the sender picks **Book at our price** (fastest) or **Offer your own price**.
   - The offer screen gives quick chips (−5%, −8%, −10%, or type a price) and a "chance an owner accepts" meter.
   - It also says which offers owners usually accept, and enforces a minimum. The sample shows 80% of our price.
   - The sender **pays the offered amount now** and it is held. Owners accept it or reply with their price.
   - The sender then either accepts a reply and pays the difference, offers again (once per owner, with a 1 h reply window), or declines.
   - If nobody agrees in 24 h, the sender can raise the price, change the day, or get a full refund.
   - This extends the owner offers in `ux-owner.md` T-03a and `ux-shipper.md` S-07.
2. **Bachs hosted checkout.**
   - "Pay" opens **Bachs's own payment page**, like Paystack. We don't draw or imitate that page.
   - The sender returns to "Confirming your payment", then "Finding your truck".
   - The failure screen says that nothing was taken.
   - This replaces the bank-account-number screen in `ux-shipper.md` S-06.
3. **Drafts (renamed from "Save and pay later").**
   - "Save as draft" shows a check-mark confirmation: a bottom sheet on phones and a centred dialog on desktop.
   - The confirmation warns that the order isn't placed, no truck is held, and the price and availability can change.
   - Drafts live in Trips → Drafts, with "Pay for several at once".
   - Nothing anywhere says "pay by 6 pm to keep Thursday".
4. **Availability before picking a day.**
   - Each day chip shows how many trucks of that type are free ("8 free", "Full").
   - Picking a full day opens **"No flatbed is free on Sat 28"**, a sheet on phones and a dialog on desktop.
   - It offers the closest options: the next day, or another truck type with its price difference.
   - It also offers "Keep Saturday and wait" (we tell them when one frees up; nothing is charged).
5. **Several goods per booking.**
   - "What are you sending?" is a list of items, each with a description, an amount (tonnes or a count, with a stepper) and a value used for matching only.
   - "Add another item" opens a sheet on phones and a dialog on desktop.
   - The total weight shows under the list. Over one truck's capacity, the app suggests splitting the booking.
6. **Money copy.** Money is held when paid. Part goes to the owner when the goods are loaded, and the rest when the receiver confirms delivery with the code.

## Screens

| File | Screen | Notes |
|---|---|---|
| P01-Onboarding, P01b-Slide2, P01c-Slide3 | Three slides, each with a corner number | Fixed illustration box so the titles never move |
| P02-Welcome | Get started / Sign in | |
| P03-SignIn, P04-Code, P05-PIN | Email or phone, email code (first time on a device), create PIN | Keypad docked at the bottom on phones |
| P05b-Unlock, P05c-Locked | Returning unlock; locked after 5 wrong PINs | D044 |
| P06-Role, P06b-Setup | "What brings you here", then name, avatar, Myself/A business, business name, CAC (optional), phone | |
| P06c-Install | Install card, shown once after the first payment | iPhone gets 3 picture steps |
| P07-Home, P07b-HomeEmpty, P07c-Notifications | Home with a live trip; first visit; notification list | |
| P08-Book | Step 1: route (+ stop), day with availability, time, goods list, truck | |
| P08a-Place, P08b-Goods, P08c-NoTruck | Place picker; add an item; no truck that day | Sheets |
| P08d-Contacts | Step 2: who's at loading, receiver, note for the driver | |
| P09-Price, P09b-Offer | Step 3: our price, or offer your own | |
| P10-Pay, P10b-Confirming, P10c-Failed, P10d-Draft | Continue to Bachs; confirming; failed; saved as a draft | |
| P11-Finding, P11b-Counter, P11d-CounterBack, P11c-NoTruck24 | Finding a truck; owner replies; offer again; no truck after 24 h | |
| P12-Trips, P12b-Drafts, P12c-TripsEmpty | Tabs: Active, Drafts, Done, Cancelled | |
| P13-Track, P14-Tracking | Track by reference; live map with a sheet (Call only) | |
| P14b-Trip, P14c-Delivered, P14d-Report | Truck confirmed (loading code, driver, timeline, stops); delivered with rating, receipt and book again; report a problem | |
| P14e-Cancel, P14f-Undo | Cancel sheet showing the refund; 5 s timed-undo toast | |
| P15-Payments, P15b-Receipt, P15c-PaySeveral | Money held, drafts and history; receipt; pay several drafts at once | |
| P16-More, P16a-Switch | More; account switcher | Switching appears only for people in more than one business, such as a sender who also owns trucks |
| P16b-Team, P16c-Invite, P16d-Places, P16e-Security, P16f-Notif, P16g-Business, P25-Help | Team, invite, saved places and receivers, PIN and security, notification settings, business profile, help | |
| D01-SignIn, D01b-Unlock | Split sign-in with the courier and van; PIN card | |
| D02-Home, D02b-HomeNoTrip, D02c-HomeFirst, D14-Notifications | Home with a live trip; with **no** live trip (Needs you, recently delivered, book again); first visit; bell panel | |
| D03-Book (+ b, c, d) | One-page booking with a **full-height live order panel on the right**; no truck that day, add an item, offer your price | The panel is sticky at viewport height in the real app |
| D04-Pay, D04b-Draft, D04c-Confirming | Bachs handoff; draft saved (centred dialog); confirming | |
| D08-Finding, D09-Trip | Finding a truck with owner replies; trip detail | |
| D05-Trips, D06-Tracking | Trips with the right detail panel; live tracking | |
| D07-Payments, D07b-Receipt | Payments; receipt page | |
| D10-Team, D11-Places, D12-Settings, D13-Help | Team with the invite panel on the right; saved places; settings; help | |
| DOC-Receipt, DOC-Statement | A4 PDF templates, see `pdf/` | |

## PDFs (receipt and statement)

- Templates are in `pdf/`, plus the DOC artboards.
- Generate them server-side from HTML with the same layout:
  - A4, 56/64 px margins, Plus Jakarta Sans embedded;
  - the logo top left and the document title top right;
  - a 2 px green rule under the header.
- **Watermark** on every page:
  - the Freight Africa mark, centred, 460 px wide, at 5% opacity;
  - "FREIGHT AFRICA" set diagonally at −32°, 92 px, weight 700, #0C5034 at 4.5% opacity.
  - Both sit behind the content.
- The receipt shows Freight Africa's legal details, who it's billed to, the trip, the line items (truck and driver, service fee, VAT on the fee), the total in a deep-green box, the Bachs reference and the delivery confirmation.
- The statement shows four totals, then one row per trip (date, trip, route, status, freight, fee plus VAT, total), then the month total and a footnote.

## Tokens and motion

The tokens are the same as v1:

- **Fonts:** Plus Jakarta Sans, weights 500 and 600 only, with headings tracked −0.025 to −0.045em.
- **Colours:** paper #F5F5F1, white cards, deep green #083826, primary #0C5034.
- **Primary buttons:** 56 px pills; one per screen.

Motion uses the `motion` library at 60 fps (transform and opacity only):

- **Pages:** fade and rise over 220 ms.
- **Sheets:** slide up on a spring; desktop dialogs scale from 0.96 with a fade.
- **Desktop panels:** slide in from the right on a spring.
- **Success check** (`.okc`): the circle pops in over 450 ms, then the tick draws itself over 400 ms.
- **Finding a truck:** two rings pulse outward every 2.4 s.
- **Confirming:** a 1 s spinner.
- **Undo toast:** a 5 s countdown ring.
- **Prices:** digits roll when they change.
- **Reduced motion:** with `prefers-reduced-motion`, everything is instant.

Watermelon-style components, built with Lucide icons and `motion`:

| Component | Where it's used |
|---|---|
| Stepper | Item amount |
| Slot picker | Day chips with availability |
| Pricing widget | The price card and the desktop order panel |
| Morphing button | "Continue to Bachs" while it loads |
| Run-action button | Confirming the payment |
| Timed undo | Cancelling |
| Range slider | Offer again |
| Minimal carousel | The onboarding slides |
