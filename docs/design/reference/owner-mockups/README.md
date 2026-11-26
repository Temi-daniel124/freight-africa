# Truck owner mockups (v1, for review)

These are all the truck owner screens, on phone and desktop. When the founder approves them, build the screens to match these files exactly.

- Live canvas: https://claude.ai/artifact/SSM3uW8J3GExngVhNwjZoF. It has six pages: setup, home and loads, trips and driving, money/fleet/account, desktop, and PDFs.
- Put this folder at `docs/design/reference/owner-mockups/`.
- `assets/fa.css` is the same shared stylesheet the sender mockups use. Keep one set of tokens and components for every role.
- Sign-in, PIN, onboarding slides and the role picker are the sender screens (P01–P06) with "I own trucks" picked, so they aren't repeated here.
- **Sample data:**
  - Musa Danladi owns Musa Haulage Ltd in Kano and is at Gold level: 50% advance, 4% commission, a 10-minute first look at new loads, and 126 trips.
  - His trucks:
    - KJA 482 XA, flatbed 35 t, driven by Musa Ibrahim. This is the same trip the sender sees, FA-7K3Q9.
    - KAN 219 BT, covered 30 t, driven by Sani Bello.
    - KAN 774 RD, tipper 30 t, driven by Bello Yusuf.
    - KAN 108 MD, flatbed 30 t, which the owner drives himself.
  - Every amount adds up. "You get" always means the amount after commission.

## Rules these screens follow

- **D043.** "I drive my own truck" is a switch, set in setup (O02), More (O22) or Business (OD15).
  - When it's on, the Drive tab (O30) replaces Trips, and all trips move to More.
  - The person still has one account. "Owner-driver" never appears as a role.
  - Team members are called **Admin**, never "manager". Admins never touch the bank account.
- **D044.** A driver joins through an invite link that the owner shares from their own WhatsApp or SMS (O19b, OD11). The driver checks their own ID and licence and sets a PIN. The owner can "Send new PIN link".
- **D046.** Every truck, load and trip card shows how full the truck is: "93% full · 28 t of 30 t". If the weight isn't known, the card shows the goods and a rough amount.
- **D047, seen from the owner's side.**
  - A load can carry **Sender's offer** (O13e). The owner accepts it, or **replies once** with their own price (O13f), which is open for 2 hours.
  - Owners can still use **Offer a different price** on listed loads (O13d). It works once per load, with a 2-hour window. Another owner can take the load at the listed price in the meantime.
  - The sender always pays first. When a higher price is agreed, the sender pays the difference before the load is confirmed.
- **Money, as the owner sees it:**
  - An advance is paid when the goods are loaded and the photos and seal are in.
  - The balance is paid after the receiver's delivery code.
  - The payout card on a trip shows both, plus the commission.
  - Bank changes wait 24 hours and need a fresh check (authenticator or email code).
- **What owners never see:**
  - the loading or delivery codes;
  - exact pick-up addresses or the sender's phone number before they accept;
  - the exact value of the goods. They see a band, such as "under ₦3m".
- **Contact:** there's no chat until Launch 2, so Call is the only option. WhatsApp alerts are off for now, so alerts go by push, email and in the app.
- **Strikes:** accepting a load warns about strikes (O13b), and cancelling one adds a strike (O15e).

## Screens

| File | Screen |
|---|---|
| O01–O07 | Setup: what you'll need, about you (with the drive switch and routes), ID check, ID being checked, bank account with the name match, add a truck (plate photo, type and goods, papers with the expiry read from the photo, check and send), who drives each truck, you're set up |
| O10, O10b, O10c, O11 | Home (fleet), Home while setup is unfinished, Home for an owner who drives, notifications |
| O12, O12b | Load board; load board while setup is unfinished |
| O13, O13b, O13c, O13d | Load detail with the money card and truck/driver pickers; confirm accept; accepted; offer a different price |
| O13e, O13f | Load with a sender's offer; reply with your price |
| O14, O15 | Trips; trip detail (live map, payout card, driver, sender, timeline, return loads) |
| O15b–O15f | Change driver, reply to a problem, report a problem, cancel (strike warning), delivered and rate the sender |
| O30 | Drive tab: one big button that changes at each step, and no money shown |
| O17, O17b, O17c | Earnings, payout detail, change bank account |
| O18, O18b, O18c | Trucks, truck detail, connect a GPS tracker |
| O19, O19b, O19c | Drivers, invite a driver, driver detail |
| O20, O20b | Papers (sorted by urgency), replace a paper with the camera |
| O21, O22, O22b, O22c | Track record, More, business and team, load alerts |
| OD00 | Desktop setup: the checklist on the left, the current step on the right |
| OD01, OD02, OD03 | Home; load board (map, list and the detail panel on the right); accept dialog |
| OD04, OD05, OD06 | Trips table, trip detail, earnings |
| OD08, OD11 | Trucks with the truck panel on the right; drivers with the invite panel on the right |
| OD12, OD13, OD15, OD16 | Papers, track record, business and team, settings |
| ODOC-Statement, ODOC-Advice | A4 PDF templates: the monthly payout statement and the payout advice for each payment. The watermark is the same as on the sender PDFs. |


## v1.1 update (25 Nov): Messages from drivers

v1.1 adds three screens (O19d, O19e, OD11b) and changes two (O22, OD11). This folder already includes them.

### Messages from drivers (new)

Drivers never see the owner's phone number. Instead, they message the owner from the driver app (driver screens DV32b and DV32c).

| File | Screen |
|---|---|
| O19d-Messages | Phone: the list of messages from drivers, with New and All tabs. Each row shows the driver, the truck, the reason and a preview. |
| O19e-Message | Phone: one message, with quick replies, a reply box and Send reply. The reply goes to the driver's Notifications. |
| OD11b-Messages | Desktop: the list on the left and the open message with the reply in the right panel (480 px). |
| O22-More (changed) | Adds "Messages from drivers" with a "2 new" count under Fleet. |
| OD11-Drivers (changed) | Adds a Messages button with a count next to "Invite a driver". |

### Rules

- A message has a reason (truck needs repair, can't work a day, papers question, something else), text or a voice note, and the time.
- The owner replies with text. Quick replies are allowed.
- This is not live chat; live chat is Launch 2.
- The owner, and owner Admins, can still call a driver from Driver detail (O19c). The driver can't call the owner.
- SOS never goes through messages. It goes straight to operations, and the owner is alerted.
