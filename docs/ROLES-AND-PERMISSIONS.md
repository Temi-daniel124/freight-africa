# ROLES-AND-PERMISSIONS.md, Freight Africa

**Authority level: 5 of 14.** Defers to `docs/DECISIONS.md`, `docs/PRODUCT.md`, `docs/DATA-MODEL.md`
(with `docs/SYSTEM-LOGIC.md`) and `docs/ARCHITECTURE.md`. The single place that says who can see and do
what. Screen specs in `docs/planning/` must match it; RLS policies and server checks implement it.

**Enforcement rule:** every permission here is enforced on the server (RLS policies and Postgres
functions, plus checks in route handlers and server actions). Hiding something in the interface is
never the protection, only a convenience. Anything a role can't do is hidden from them, not shown
disabled.

---

## 1. Role model

- A **person** has one `profiles` row.
- A person belongs to zero or more **organisations** through `organization_members`, each with one
  sub-role. An organisation is a **shipper** or a **transporter**.
- A person may also be an **agent** (`agents`) and/or **staff** (`staff_members`).
- **Receivers and pickup contacts** have no account; they act only through a token link and a code.
- The app shows an **account switcher** when a person has more than one organisation or role.

## 2. Shipper organisations

| Action | Owner | Admin | Booker | Finance | Viewer |
| --- | --- | --- | --- | --- | --- |
| Book and edit drafts | ✓ | ✓ | ✓ | | |
| Pay (single and batch) | ✓ | ✓ | ✓ | ✓ | |
| Accept counter offers, raise price, decide on no-truck | ✓ | ✓ | ✓ | | |
| Cancel a booking | ✓ | ✓ | own bookings | | |
| See loading and delivery codes; resend them | ✓ | ✓ | ✓ | | |
| See trip parties' phone numbers (during a live trip, D018) | ✓ | ✓ | ✓ | | |
| Report a problem, add evidence, rate | ✓ | ✓ | ✓ | | |
| Payments, refunds, charges, statements | ✓ | ✓ | | ✓ | |
| Team members and roles | ✓ | ✓ (can't remove the owner) | | | |
| Business profile | ✓ | ✓ | | | |
| View trips | ✓ | ✓ | ✓ | ✓ | ✓ |

An organisation always has at least one owner. Individuals are the owner of their own organisation.

## 3. Transporter organisations

| Action | Owner | Manager | Driver |
| --- | --- | --- | --- |
| See the load board; accept; offer a different price | ✓ | ✓ | sees return loads in **Next load**; can only suggest to the owner |
| Assign or change truck and driver (until loaded) | ✓ | ✓ | |
| Add, edit, retire trucks; trackers; documents | ✓ | ✓ | own licence only |
| Add, pause, remove drivers | ✓ | ✓ | |
| See freight, payouts, earnings, statements | ✓ | ✓ | **never** (D003) |
| Add or change the bank account | ✓ | | |
| Add or remove managers | ✓ | | |
| Business details | ✓ | view | |
| Respond to disputes | ✓ | ✓ | |
| Rate the sender | ✓ | ✓ | |
| Run a trip (driver screens) | if `is_driver` | if `is_driver` | ✓ (own assigned trips) |
| Confirm or decline an assigned trip | — | — | ✓ |
| See loading or delivery codes | **never** | **never** | **never** (codes come from the other side in person) |

Owner-drivers are owners with `is_driver = true`: the owner rights above plus the driver screens, with
the driving lock (`SYSTEM-LOGIC.md` §19).

## 4. Agents

| Can | Can't |
| --- | --- |
| Create invite links and QR codes; invite by phone number | Verify anyone's identity or trucks for them |
| See the people they brought: status, sign-up step, trip count, their own share per trip | See those people's payments, payouts, freight prices, codes or trip parties' phone numbers |
| Send limited reminders (1 per person per day, 3 per step) | Refer an organisation that already exists, or their own business |
| Prepare a booking for a sender they brought, for that sender to approve and pay | Pay for a sender or receive a sender's money |
| See their earnings, payouts, statements; manage their own bank account | |

The whole role is hidden when `agents_enabled = false`.

## 5. People without accounts

| Person | Can | Through |
| --- | --- | --- |
| **Pickup contact** | See the truck coming; give the loading code in person; ask the driver to call; report a problem | `/track/[token]` for the pickup stop; WhatsApp code |
| **Receiver** | See ETA, truck and driver's first name and photo; give the delivery code in person; ask the driver to call; report a problem (needs the code) | `/track/[token]` for their stop; WhatsApp code |

They never see prices, values, addresses beyond the stop area, or anyone's phone number. Tokens expire
72 hours after the stop completes.

## 6. Phone number visibility (D018)

| Viewer | Sees the number of | From | Until |
| --- | --- | --- | --- |
| Shipper owner, admin, booker | Driver, truck owner | Trip `assigned` | `delivered` or `cancelled` |
| Truck owner, manager | The shipper member who booked | `assigned` | `delivered` or `cancelled` |
| Driver | The shipper member who booked | `assigned` | `delivered` or `cancelled` |
| Driver | Pickup contact | `assigned` | `loaded` |
| Driver | Receiver of the next drop-off | `in_transit` towards that stop | That stop completed |
| Driver ↔ own owner and managers | Each other | Always | Always |
| Pickup contact, receiver | Nobody | — | — |
| Agent | Nobody on the trip | — | — |
| Staff | Everyone | Always | Always |

Numbers are served only by `trip_contacts(trip_id)`; `profiles.phone` and `profiles.email` are never
readable by other users.

## 7. Freight Africa staff

| Section | Super admin | Operations | Verification | Finance | Support | Field agent |
| --- | --- | --- | --- | --- | --- | --- |
| My work, Overview | ✓ | ✓ | ✓ | ✓ | ✓ | tasks only |
| Live map, SOS | ✓ | ✓ | | | view | |
| Trips, loads, matching (act) | ✓ | ✓ | view | view | view | |
| Users and companies | ✓ | ✓ | ✓ | view | ✓ | view |
| Verification decisions | ✓ | view | ✓ | | | truck inspections |
| Disputes (decide) | ✓ | ✓ | | view | ✓ | |
| Fraud and risk | ✓ | ✓ | ✓ | ✓ | | |
| Money pages (act) | ✓ | view | | ✓ | view | |
| Approvals (approve) | ✓ | | | ✓ | | |
| Support inbox | ✓ | ✓ | | | ✓ | |
| Agents | ✓ | ✓ | | view | ✓ | |
| Catalogue, corridors | ✓ | lane prices only | | | | |
| Fees and offers (edit, needs second approval) | ✓ | | | view | | |
| Messages and templates | ✓ | view | | | view | |
| Website content | ✓ | ✓ | | | | |
| Reports | ✓ | ✓ | | ✓ | | |
| Settings, staff and on-call, audit log | ✓ | | | | | |

- Operations and field agents can be limited to corridors (`staff_members.corridor_ids`).
- Every staff member uses two-step sign-in; sessions last 12 hours.
- Opening identity images, full bank numbers or NIN is logged.

## 8. Two-person approval

Required, and the requester can't approve their own item: payouts above ₦5m · any manual refund · any
fee or money setting change · ledger adjustments · dispute decisions above ₦1m · staff role changes ·
two-step sign-in resets for staff (second super admin).

## 9. Data access summary (RLS)

The policy table in `docs/DATA-MODEL.md` §12 is the implementation reference. In short:

- Members read their own organisation's data; trip parties read the trip; drivers read only their own
  assigned trips and never money tables.
- The load board is a view exposing funded loads that fit the reader's trucks, without contact details,
  exact addresses or exact values.
- Ledger tables are readable only by finance staff and super admins and writable only through Postgres
  functions.
- `trip_events`, `audit_log` and ledger entries are append-only (triggers block update and delete).
- Everything that moves money, changes trip state or uses a code runs in `security definer` functions
  called from server code.

## 10. Tests that prove it

Each row in §2 to §8 has at least one pgTAP test in `supabase/tests/` asserting both the allowed and the
denied case (for example "a driver selecting from `payouts` gets zero rows"; "a booker can't read
statements"; "an agent can't read `trip_contacts`"). These run in CI on every pull request (D025).
