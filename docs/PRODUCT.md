# PRODUCT.md, Freight Africa

**Authority level: 2 of 14.** Defers only to `docs/DECISIONS.md`. Describes what Freight Africa is, who
it serves, how it makes money and how it behaves from the user's side. Detailed rules live lower down:
data and behaviour in `docs/DATA-MODEL.md` and `docs/SYSTEM-LOGIC.md`, scope in `docs/PLATFORM-SCOPE.md`,
screens in `docs/planning/`, visuals in `DESIGN_SYSTEM.md`.

---

## 1. In one paragraph

Freight Africa is a marketplace for full truckloads on Nigerian corridors. Senders (shippers) book a
truck at an instant price and pay once, by bank transfer, before the truck moves. The money is held in
escrow. Verified truck owners, who own the trucks and employ the drivers, accept loads that fit their
trucks; they receive an advance when the goods are checked onto the truck and the balance within
minutes of delivery. A one-time code given by the receiver proves delivery. Freight Africa earns a
small fee from each side and never lends its own money.

## 2. The problem

- Senders find trucks through park agents and personal contacts on WhatsApp: slow, opaque, and with no
  protection if goods go missing or a truck never arrives.
- Truck owners chase payment for days or weeks, and often run empty on the way back.
- The best-funded digital players in this model, Kobo360 and Lori Systems, struggled because they paid
  truckers upfront and waited 30 to 90 days to be paid by large customers (D001).

## 3. Who it's for

| User | What they want | Pays |
| --- | --- | --- |
| **Sender** (traders, distributors, aggregators, manufacturers) | A trustworthy truck today at a fair price; goods arriving intact; proof if something goes wrong; repeat booking in seconds | 3% service fee per trip, less with volume |
| **Truck owner** (one truck or a hundred; may drive their own truck, D043) | Loads both ways; fast, certain payment; drivers and papers under control | 5% commission per completed trip (4% Gold) |
| **Driver** (joins only through a truck owner's invite, D043) | Clear steps, proof of what was loaded, help on the road | Nothing; sees no money |
| **Receiver and pickup contact** | Know when the truck comes; confirm with a code; no account | Nothing |
| **Agent** (park brokers; join through a link staff send, not at sign-up, D043) | Earn from the people they already know | Earns 1% of freight on referred trips for 6 months, paid by Freight Africa |
| **Freight Africa staff** | Keep every trip, person and naira under control | Internal |

People see three account types: **Sender**, **Truck owner** and **Driver** (D043); staff are internal.

Out of scope: vans, parcels, single items, cross-border trips at launch.

## 4. Why people switch and stay

- **Senders:** money held until delivery; verified owners and trucks; live tracking; delivery code;
  photo evidence at loading and delivery; receipts. All-in price no higher than an agent's on the same
  lane (D009).
- **Owners:** loads already paid for before loading; advance on loading; balance within minutes; return
  loads; a track record that earns bigger advances, lower commission and early access to loads.
- **Agents:** a fair, transparent share without being cut out.
- **What keeps them:** saved places, receivers and lanes; track records and tiers; payout speed; return
  loads. Stickiness comes from value, never from lock-in tricks.

## 5. Business model

| Item | Rule |
| --- | --- |
| Shipper service fee | 3% of freight for trips 1 to 5 in a calendar month, 2% for 6 to 15, 1.5% from 16 |
| Owner commission | 5% of freight; 4% for Gold owners |
| Launch offers | Shipper's first trip: no service fee. Owner's first 3 trips: no commission |
| Cancellation fee | ₦25,000 to the owner if the shipper cancels after the truck reaches pickup (D019) |
| Waiting charge | First 4 hours free, then ₦5,000 per hour, paid to the owner |
| Agent share | 1% of freight, from Freight Africa's revenue |
| Always free | Tracking, support, payouts, sign-up (trip chat comes in Launch 2, D045) |
| No | Subscriptions, credit terms, insurance sales, wallets |

All rates are settings, never hard-coded. At ₦1,000,000 average freight, break-even is about 46 trips
a month across the four corridors with a fixed cost of about ₦2.6m a month (blueprint figures).

## 6. Where it runs

Four corridors at launch (D013): **Lagos ⇄ Kano**, **Lagos ⇄ Abuja**, **Lagos ⇄ Onitsha/Aba**, and the
eastern loop **Port Harcourt ⇄ Aba ⇄ Onitsha ⇄ Enugu**. English only at launch (D017). One installable
web app on phones and desktops (D004).

## 7. How a trip works

1. **Book:** the shipper picks pickup, drop-off(s), goods and weight; sees the truck type and the total
   price at once.
2. **Pay:** bank transfer to a one-time account number; the full amount is held in escrow (D001).
3. **Match:** fitting, verified owners see the paid load (Gold owners 10 minutes early), accept at the
   price or counter once (up to +20%).
4. **Confirm the driver:** an employed driver confirms the trip; an owner who drives their own truck drives it themselves.
5. **Load:** the driver photographs the goods and records the seal; the pickup contact gives a
   **loading code**; the owner receives the **advance** (30%, 40% or 50% by tier).
6. **Travel:** trip mode tracks the truck; gaps are detected and followed up; the receiver gets a
   tracking link.
7. **Deliver:** about an hour out, the receiver gets a **delivery code**; after checking the goods they
   give it to the driver, who enters it at the drop-off with a photo; the owner receives the
   **balance**; Freight Africa keeps its fee and commission.
8. **Close:** both sides rate each other; receipts and statements are issued.

Worked example: freight ₦1,000,000. The shipper pays ₦1,030,000. The owner (established tier) receives
₦400,000 on loading and ₦550,000 on delivery. Freight Africa keeps ₦80,000.

## 8. Trust and safety, in short

- Verified people (Didit identity checks), trucks and papers; value limits for new and uninsured owners
  (D019); Insured badge for owners with their own cover (D011).
- Money released only on recorded events; disputes hold only the amount in question.
- Phone numbers shown only during a confirmed, live trip (D018).
- SOS, rest stops, route deviation and long-stop alerts; staff playbooks for every worst case.
- The full list of worst cases and defences is in the blueprint and in staff playbooks
  (`docs/planning/ux-admin.md` X-28).

## 9. Product principles

1. **Prepaid, always.** No trip ever needs Freight Africa's money.
2. **One clear action per screen.** People reach their goal in the fewest steps.
3. **Pick, photograph or look up; don't type.**
4. **Plain words**, never trade jargon.
5. **Proof protects everyone:** photos, codes, locations and times on every trip.
6. **Works on a cheap phone on a weak network**, offline where it matters.
7. **Pixel-perfect and calm** (`DESIGN_SYSTEM.md` §20): it must not look like generic or AI-made
   software.

## 10. Success measures

First 30 days after launch: 20 paid trips (below 5 means price or the prepay rule is wrong), no lost
cargo, 90% of payouts within 60 minutes of delivery, 85% tracking coverage. Day 90: 46+ trips a month,
40%+ of shippers booking again within 30 days, 60%+ owner retention month to month, disputes under 5%
of trips.
