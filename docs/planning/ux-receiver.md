# ux-receiver.md, Freight Africa

**Annex to `docs/PLATFORM-SCOPE.md` (authority 6 of 14).** Visual rules come from `DESIGN_SYSTEM.md`. Follows `ux-conventions.md`. Screens for people without an account:
receivers and pickup contacts. Agent screens are in `ux-agent.md`.

---

## Part 1. Receiver and pickup contact (no account, D010)

These pages open from a WhatsApp, SMS or email link in the phone's browser. No sign-in, no install
prompt, no cookies beyond what's needed. Small page weight (under 150 KB before the map loads). The
map loads only when tapped. English only at launch (D017).

### Messages they receive

Utility templates, English (D017, D021). Variables in braces.

| When | To | Message |
| --- | --- | --- |
| Truck assigned | Pickup contact | "Hello {name}. A truck is coming to load goods for {shipper}. Truck {plate}, driver {driver_first_name}, expected {pickup_window}. See it here: {link}" |
| Truck at pickup | Pickup contact | "The truck is at the loading point. When all goods are on the truck, give the driver this loading code: {code}. Don't share it before loading is finished." |
| Trip started | Receiver | "Hello {name}. Goods from {shipper} are on the way to you. Track them: {link}" |
| About 1 hour away | Receiver | "Your delivery code is {code}. Check your goods first. Give this code to the driver only when you are happy with them. Giving the code confirms you received the goods." |
| Arrived | Receiver | "The truck has arrived at {stop_area}. Driver {driver_first_name} is waiting." |
| Delivered | Receiver | "Delivery confirmed. Thank you." |
| Problem recorded | Receiver | "We've recorded the problem you reported. {shipper} and Freight Africa will follow up." |

If WhatsApp reports a message failed, the same text goes by SMS (if enabled) and email (if an email
was given).

### R-01 Receiver tracking page
**Route** `/track/{token}` · **Features** F-47, F-49 · `noindex`

**Layout**
1. Freight Africa logo (small), "Delivery for {receiver_first_name} from {shipper}".
2. Status in words with a progress line: On the way → Almost there → Arrived → Delivered.
3. ETA ("Arrives about Thu 2:30 pm") and last update time ("Updated 3 min ago" or "No signal from
   the truck since 14:10. This is common on some roads.").
4. **See on map** button → loads the map with the truck position and the drop-off area.
5. Truck and driver: driver's first name and photo, truck type and photo, plate (large, so the
   receiver can check the truck at the gate).
6. Code notice: before sending "You'll get a delivery code on WhatsApp about an hour before
   arrival."; after "Your delivery code was sent to your WhatsApp ending 4567. Check your goods,
   then give the code to the driver."
7. **Ask the driver to call me** → sends the receiver's number to the driver with a call prompt
   (SYSTEM-LOGIC §18); toast "The driver will call you." The driver's number is never shown here.
8. **Report a problem** (text link styled red) → R-02.
9. Help: Freight Africa support WhatsApp number as text with **Copy**.

The code is never shown on this page (anyone with a forwarded link could read it).

**States**
- Multi-stop: shows only this receiver's stop and "The truck has 1 stop before yours."
- Delivered: "Delivered Thu 2:41 pm. Thank you." + **Report a problem** for 48 hours (then hidden).
- Expired (72h after delivery): "This tracking link has expired." No trip details shown.
- Invalid token: same message as expired (don't reveal whether a link existed).

### R-02 Report a problem (receiver)
1. **Enter your delivery code** (proves you're the receiver; doesn't count as delivery). Wrong code
   uses the same 5-attempt limit as the driver's entry.
2. What's wrong: Goods short · Damaged · Wrong goods · Truck didn't arrive · Something else.
3. How many items are affected, out of how many (number inputs; skip allowed).
4. Photos (camera opens directly), short note.
5. **Send report** → "We've recorded this. The sender has been told." The driver's app shows the
   problem on D-03 if they haven't entered the code yet; if they have, a dispute opens (SYSTEM-LOGIC
   §13).

### R-03 Pickup contact page
**Route** `/track/{token}` (same route; the token belongs to the pickup stop) · `noindex`

Shows: "Truck coming to load for {shipper}", ETA to pickup, driver first name and photo, plate,
truck type, loading window, the sender's handling note, **Ask the driver to call me**. After arrival: "The truck is here. When all
goods are on the truck, give the driver the loading code we sent to your WhatsApp." **Report a
problem** (Truck didn't come · Wrong truck · Driver behaviour · Something else). Expires 72 hours
after loading.

---
