# launch-page-copy.md, Freight Africa

**Annex to `docs/PLATFORM-SCOPE.md` (authority 6 of 14), governed by D030 and D031.** The exact public
wording for the launch page. Use it word for word in `src/messages/en.json`. Change it only through this
file.

---

## 0. Rules for every public sentence (D031)

1. **Describe how it works, never the numbers behind it.** No percentages, fee tiers, commission
   rates, advance shares or worked examples showing what Freight Africa keeps. Those belong in the app,
   at the moment someone confirms, and in the Terms of Service.
2. **Promise the process, not an outcome.** Say what we do ("we check", "we hold", "we release after
   delivery is confirmed"). Avoid absolute words that become liabilities: *guaranteed, always, never,
   instant, within minutes, 100%, fully insured, risk-free*.
3. **Be precise about money movement.** The owner receives part of the pay at loading and the balance
   after delivery is confirmed. So never say "paid only when the goods arrive" or "nothing is released
   until delivery". Say "the **final** payment is released only after delivery is confirmed".
4. **Every figure the visitor sees is the price they'll pay or receive**, shown in the app before they
   commit. That makes "no surprises" true.
5. **Early-member offers stay unspecified** ("launch offers"), so they can be designed later without
   breaking a public promise.
6. **The Terms win.** Every page that mentions price or payment carries the one-line notice in §6.
7. Plain words, short sentences, confident tone. Calm, not salesy.

---

## 1. Hero

- Badge: **Launching soon on four routes**
- Headline: **Move full truckloads across Nigeria.**
- Lead: **Pay once. We hold your money and release it only as your goods move.**
- Card title: **Join the waitlist** (other card text unchanged)

## 2. Proof strip

| Title | Text |
| --- | --- |
| Verified truck owners | We check every owner's identity, truck and papers before their first load. |
| Money held, then released | The final payment goes to the owner only after your receiver confirms delivery. |
| Live tracking | Follow the truck from pickup to drop-off. |

## 3. How it works

Lead: **Four steps from booking to delivery, with your money protected the whole way.**

1. **Book** · Tell us where, when and what. You see the full price before you pay, and you pay once
   by bank transfer.
2. **A verified truck accepts** · Only owners whose identity, truck and papers we've checked can take
   your load.
3. **Track it** · Follow the truck live from pickup to drop-off. Your receiver gets a tracking link too.
4. **Confirm with a code** · Your receiver checks the goods and gives the driver a delivery code. Only
   then is the final payment released.

## 4. "Your money is protected" (replaces the escrow numbers)

- Title: **Your money is protected**
- Lead: **You pay once. We hold it and release it in stages, tied to what actually happens on the
  road.**
- The animation keeps its three stops and the moving truck, with **no naira amounts**:

| Stop | Label | Line under it |
| --- | --- | --- |
| Paid | **Held safely** | Your payment is held from the moment you pay. |
| Loaded | **Part released** | The loading code is given. The owner receives part of the pay to cover the trip. |
| Delivered | **Balance released** | Your receiver confirms delivery with a code. The balance is released. |

- Below it: **If something goes wrong, only the amount in question is held while we sort it out with
  both sides.**
- Remove: the fee figure, the four amount rows, "Freight Africa keeps", the worked-example note.
  Keep **Play again**.

## 5. Built for both sides of the road

Senders:
| Title | Text |
| --- | --- |
| One price, shown upfront | See the full price before you pay. No haggling at the park. |
| Money released step by step | The final payment is released only after your receiver confirms delivery. |
| Know where your goods are | Live tracking, and a delivery code for your receiver. |

Truck owners:
| Title | Text |
| --- | --- |
| Paid for before you set off | Every load is paid for before your truck is sent. |
| Part of your pay at loading | The rest follows once delivery is confirmed, straight to your verified bank account. |
| Loads for the way back | Find paid return loads, so you don't drive home empty. |

## 6. Pricing (replaces "Simple, published fees")

- Section id stays `pricing`; nav label stays **Pricing**.
- Title: **Clear pricing. No surprises.**
- Lead: **You see the full price before you pay. Truck owners see exactly what they'll receive before
  they accept.**
- Switch: **Senders / Truck owners** (keep the sliding pill; remove NumberFlow figures).

Senders card, title **For senders**:
- One all-in price for your load, shown before you pay
- No subscriptions and no sign-up fees
- Tracking, support and delivery codes included

Truck owners card, title **For truck owners**:
- No membership or listing fees
- A service charge applies only to trips you complete
- Your payout is shown before you accept, and paid to your verified bank account

Shared badge (both cards): **Early members get launch offers.**

Notice under both cards (caption size, `ink-2`):
**Prices, charges and payment timing are shown in full in the app before you confirm, and are set out
in our Terms of Service.**

## 7. Questions (changed answers only)

- **What does it cost?** · You see one all-in price for your load before you pay, with nothing added
  later. There are no subscriptions or sign-up fees.
- **How are truck owners paid?** · Part of the pay is released when the goods are loaded, and the
  balance after the receiver confirms delivery with a code. Payouts go to the owner's verified bank
  account.
- **What happens if something goes wrong on the way?** · Your payment stays protected. If there's a
  problem with the goods, only the amount in question is held while our team works it out with both
  sides.
- **Is my money safe?** (new, under Payments) · Your payment is held from the moment you pay and
  released in stages as the trip happens. The final payment is released only after your receiver
  confirms delivery.

## 8. Waitlist terms: add one section

- **Nothing here is an offer** · Information on this website describes how we plan to work at launch.
  It isn't an offer, a quote or a commitment to a price, charge, payout time or service level. The
  Terms of Service that apply when you book or accept a load will govern.

## 9. Final band, footer, other pages

Unchanged, except the footer gains the photo credit line from `DESIGN_SYSTEM.md` §13.3 when photos are
in use: **Photos: Unsplash contributors** (linking to `/credits` is optional; a list in
`public/photos/CREDITS.md` is required).
