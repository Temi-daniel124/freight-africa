# Driver mockups (v1.1, for review)

These are all the driver screens. Drivers drive from their phone. On desktop they can only view their trip and history. When the founder approves the screens, build them to match these files exactly.

- Live canvas: https://claude.ai/artifact/9FdcFsv73HFVsSb9JFv1kB. It has five pages: joining, the trip step by step, problems and safety, next load/history/me, and desktop.
- Put this folder at `docs/design/reference/driver-mockups/`. `assets/fa.css` is the same shared stylesheet the other roles use.
- **Sample data:**
  - The driver is Sani Bello, who drives for Musa Haulage Ltd (owner Musa Danladi) in KAN 219 BT.
  - The trip is FA-8D2V5, Lagos (Ikeja) → Kano (Sabon Gari), carrying cartons of drinks: 28 t, 1,400 cartons.
  - Chidi gives the loading code and Ibrahim, the receiver, gives the delivery code.
  - This is the same trip as on the owner canvas.

## Rules these screens follow

- **D003 and D018:**
  - No money anywhere: no prices, payouts or goods value.
  - The driver never holds a code; the person at each end gives it.
  - Phone numbers show only while a trip is live.
- **Install (DV05–DV05e):**
  - Install is the only main button.
  - Tapping it, or the browser reporting "accepted", only moves to Waiting (DV05b).
  - The app counts as installed **only** when it runs from the home screen (display-mode standalone, or navigator.standalone on iPhone) and that installed app checks in with the server. Then DV05e opens inside the app and leads to the GPS test.
  - If the install is cancelled or the network drops: Not installed yet (DV05c).
  - iPhone gets the Share → Add to Home Screen steps and a one-time 6-digit setup code (30 min), because the home-screen app starts signed out.
- **D044:**
  - A driver joins from the owner's invite link (DV01). The owner sends it from their own WhatsApp or SMS.
  - After the ID check, licence check and phone setup, the driver chooses a 6-digit PIN (DV07). After that, they sign in with phone number plus PIN.
  - There's no email code for drivers.
- **Driving layout:**
  - Body text 17 px; titles 26–34 px.
  - One main button, 68 px tall, sitting above a 76 px tab bar with 26 px icons.
  - Large icon buttons with labels.
  - High contrast.
- **SOS:**
  - The red round SOS button shows on every live step.
  - It works only when pressed and held for 2 seconds, with a ring filling around it (DV22).
  - When it fires, the whole screen turns red (DV22b). It shows 112 and the operations line (a placeholder), and has "I'm safe now".
- **Dark screen at night:** darker colours after sunset so the screen doesn't dazzle the driver (DV17). Under Me the choices are Auto, Always or Never.
- **Steps on the trip screen:**
  1. Go to pickup.
  2. "I've arrived" (it only works inside the pickup area).
  3. Start loading.
  4. Take 3 photos, with the seal number and count.
  5. Enter the loading code.
  6. Start the trip.
  7. Directions.
  8. Take a delivery photo.
  9. Enter the delivery code.
  10. Answer "Anything wrong?".
  11. Trip complete.
- **Every action** is stamped with the time and place and works offline (it's sent later, in order).
- **While moving:** typing is disabled, but voice notes still work. Non-urgent notifications wait until the truck stops.
- **Contact:**
  - During a live trip, the driver can call the pickup and receiver contacts (D018).
  - **The owner's phone number is never shown to drivers.** The driver reaches the owner with **Message** (Me → Message, DV32b): a reason, a short text or voice note, sent to the owner's app. Replies arrive in Notifications and aren't instant.
  - This is not live chat (that's still Launch 2). Emergencies use SOS. Notifications come by push and in the app; WhatsApp stays off for now.

## Screens

| File | Screen |
|---|---|
| DV01–DV04 | Invite, welcome, ID check, licence (number and expiry read from the photo) |
| DV05, DV05b–e | Install the app; waiting for the install; not installed yet; iPhone steps with setup code; installed (inside the app) |
| DV06–DV08 | GPS test with emergency contact, choose PIN, set up |
| DV10, DV11, DV11b | No trip; new trip to confirm; can't do this trip (reasons and a voice note) |
| DV12, DV15d | Upcoming trip with the "Before you go" checklist; trip details sheet |
| DV13, DV14 | Driving to pickup ("I've arrived" is greyed until the driver is close); at pickup with the free waiting time |
| DV15, DV16, DV16b | Loading photos and seal; enter the loading code; loading confirmed, then Start trip |
| DV17, DV17b | On the road in the night look, with the "asked you to call" banner; safe rest stops |
| DV18, DV19, DV19b, DV20 | Arrived and delivery photo; delivery code (wrong-code state); anything wrong?; trip complete, with what's next |
| DV21, DV22, DV22b, DV23 | Report a problem; SOS hold; SOS active; trip cancelled ("Stop") |
| DV30–DV34 | Next load (with "Tell my owner I can take this"), history, past trip with proof, Me, notifications, help (with Listen) |
| DV32b, DV32c | Message your owner (sheet); message sent |
| DVD01, DVD02 | Desktop, view only: the trip with a QR code to open it on the phone, and history |
