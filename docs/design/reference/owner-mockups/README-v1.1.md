# Truck owner mockups: v1.1 update

Unzip this over `docs/design/reference/owner-mockups/`. It adds three screens and changes two. All other v1 files stay as they are.

## Messages from drivers (new)

Drivers never see the owner's phone number. Instead, they message the owner from the driver app (driver screens DV32b and DV32c).

| File | Screen |
|---|---|
| O19d-Messages | Phone: the list of messages from drivers, with New and All tabs. Each row shows the driver, the truck, the reason and a preview. |
| O19e-Message | Phone: one message, with quick replies, a reply box and Send reply. The reply goes to the driver's Notifications. |
| OD11b-Messages | Desktop: the list on the left and the open message with the reply in the right panel (480 px). |
| O22-More (changed) | Adds "Messages from drivers" with a "2 new" count under Fleet. |
| OD11-Drivers (changed) | Adds a Messages button with a count next to "Invite a driver". |

## Rules

- A message has a reason (truck needs repair, can't work a day, papers question, something else), text or a voice note, and the time.
- The owner replies with text. Quick replies are allowed.
- This is not live chat; live chat is Launch 2.
- The owner, and owner Admins, can still call a driver from Driver detail (O19c). The driver can't call the owner.
- SOS never goes through messages. It goes straight to operations, and the owner is alerted.
