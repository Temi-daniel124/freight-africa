# Admin and staff console mockups (v1, for review)

These are the staff console screens from `ux-admin.md`, drawn exactly. Most staff work on desktop. Phones are for on-call operations, approvals, verification, support and field agents. When the founder approves the screens, build them to match exactly.

- Live canvas: https://claude.ai/artifact/2duMtEGzYbMxqvZK74VZt3. It has 9 pages: getting in, starting a shift, operations, trust, people and support, money, setup, insights and admin, and field agent.
- Put this folder at `docs/design/reference/admin-mockups/`.
- `assets/fa.css` is the shared stylesheet plus a "staff console" section with these classes:
  - `.xs`, `.xn`, `.bd`: the sidebar, nav items and badges;
  - `.xt`, `.xq`: the top bar and search box;
  - `.xm`, `.xh1`: the main area and page title;
  - `.tbl.d`: dense tables;
  - `.kpi`: number tiles;
  - `.urg`: urgent strips;
  - `.tabx`: underline tabs;
  - `.fltr`: filter chips;
  - `.xs2`: small buttons;
  - `.rd`: the red SOS button.
- The host is `admin.freight-africa.com` (D033).

## Sample people

- Super admin: Temi Adebayo.
- Operations: Kemi Ogunleye, for Lagos ⇄ Kano and Lagos ⇄ Abuja, on call.
- Verification: Halima Musa.
- Finance: Chinedu Eze.
- Support: Tolu Bakare.
- Field agent: Yakubu Danjuma.

## Rules these screens follow

- **Layout:**
  - A 248 px sidebar, grouped as in ux-admin 1.3. The Setup, Insights and Admin groups stay folded unless you're in them.
  - Each role sees only its items (table in ux-admin 1.5). Anything else shows X00k, "You don't have access to this".
- **Top bar:**
  - Search with the `/` shortcut.
  - The SOS indicator is red with a count while an SOS is open. Verification and finance don't see it.
  - The bell.
  - Approvals (finance and super admin only).
  - The staff member's name and role.
- **Staff sign-in (D044, stricter):**
  - First time: email code, then a 6-digit PIN, then two-step sign-in, which is **required** (authenticator app plus 10 backup codes), then the staff code, then the playbooks.
  - Later: email, PIN and authenticator code. Sessions last 12 hours.
  - **5 wrong authenticator codes lock two-step sign-in until an email code** (X00j). This closes the open TOTP gap.
  - Google sign-in is off.
  - A two-step reset needs a second super admin.
- **Every change to money, status or access** opens a dialog with:
  - the effect in one sentence;
  - a required reason, saved to the audit log;
  - "needs a second approval" where SYSTEM-LOGIC §10 applies.
  - Nobody can approve their own request (X17).
- **Lists:** filters, saved views, export (logged), 50 rows per page. They update live, with a "new" pill instead of moving rows.
- **Privacy:** staff see phone numbers. Opening ID images is logged. Staff never see loading or delivery codes; they can only issue a new one after a call log (X03c).
- **SOS:**
  - Red card with a live map, the driver, the owner and the emergency contact.
  - Acknowledge stops the sound and the 2-minute escalation.
  - Updates are timestamped.
  - Resolve needs an outcome and a note (X05b).
- **WhatsApp is off:**
  - The support inbox shows email, in-app help and the contact form.
  - The message templates for WhatsApp are "On hold".
  - When WhatsApp is connected, it joins with the 24-hour reply window.
- **Payments:**
  - Reconciliation compares our ledger with **Bachs** (D048).
  - Payouts show Bachs's response for each attempt.
- **Offers (D047):** X04 shows "Offers waiting" with the sender's prepaid offer and the owner's reply.
- **Fees:** fee and commission numbers appear only inside the console (X18). The public site never shows them (D031).

## Screens

| File | Screen |
|---|---|
| X00a–X00g | Invite welcome, email code, choose PIN, two-step setup (QR), backup codes, staff code, your playbooks |
| X00h | Phone: install and turn on SOS alerts |
| X00i, X00j, X00k | Later sign-in (email, PIN and authenticator), two-step locked, no access |
| X26, X26p | My work, on desktop and phone (urgent strip, queue, assigned or unassigned, Today panel) |
| X27 | Notifications panel |
| X01, X01p | Overview (KPIs with sparklines, needs attention, corridors, this week) |
| X29 | My profile (two-step, devices, on-call shifts, notifications and quiet hours, test SOS sound) |
| X02, X02p | Live map with the trip drawer, and the phone map with the problem-trip sheet |
| X05, X05b, X05p | SOS (open alert, resolve dialog, phone) |
| X03, X03b, X03c, X03d, X03p | Trips list, trip page (timeline, money, codes, people, activity), issue-new-code dialog, cancel dialog showing the money effect, phone trip with the Take action sheet |
| X04 | Loads and matching (without a truck, find a truck, offers) |
| X07, X07b, X07c, X07p | Verification queue, review screen (evidence plus checklist), reject dialog, phone review |
| X08, X08b | Disputes list, dispute page with the Decide panel |
| X14 | Fraud and risk |
| X06 | Company page |
| X13, X13p | Support inbox (list, conversation, person card) and phone |
| X19 | Agents |
| X09, X10, X11, X12 | Escrow, payouts (with the detail panel), refunds and charges, reconciliation |
| X17, X17p | Approvals, on desktop and as a phone card |
| X15, X16, X18, X20, X22, X21 | Catalogue, corridors and lane prices, fees and offers, messages, website content, settings |
| X23, X24, X25, X28 | Reports, staff and on-call rota, audit log, playbooks |
| X30a–X30f | Field agent phone app: tasks, inspect a truck (works offline), onboard an owner by QR, add a park, Me |
