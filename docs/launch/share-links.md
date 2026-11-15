# Launch page share links

Each link carries a name (`?ref=`). When someone arrives by it, the site keeps that name for the visit
(`src/proxy.ts`, a session cookie holding only the name), and the sign-up is saved with it in
`waitlist_signups.source`. Visitors who arrive any other way are saved as `website`.

| Channel | Use this | Recorded as |
| --- | --- | --- |
| WhatsApp | [Share on WhatsApp](https://wa.me/?text=Freight%20Africa%3A%20book%20full%20truckloads%20across%20Nigeria.%20Pay%20once%2C%20and%20your%20money%20is%20held%20and%20released%20only%20as%20your%20goods%20move.%20Join%20the%20waitlist%3A%20https%3A%2F%2Ffreight-africa.com%2F%3Fref%3Dwhatsapp) (opens WhatsApp with the message ready; pick a chat, group or Status) | `whatsapp` |
| Instagram | `https://freight-africa.com/?ref=instagram` in the bio link, a Story link sticker or a DM (Instagram doesn't make links in post captions clickable) | `instagram` |
| X | [Post on X](https://x.com/intent/post?text=Freight%20Africa%3A%20book%20full%20truckloads%20across%20Nigeria.%20Pay%20once%2C%20and%20your%20money%20is%20held%20and%20released%20only%20as%20your%20goods%20move.%20Join%20the%20waitlist%3A&url=https%3A%2F%2Ffreight-africa.com%2F%3Fref%3Dx) (opens a ready post) | `x` |
| Print (QR) | `share-qr.svg` (any size) or `share-qr-2048.png`, both for `https://freight-africa.com/?ref=qr`. Print at least 2.5 cm wide and keep the white border | `qr` |

More channels: add `?ref=<name>` with lower-case letters, numbers, `-`, `_` or `.` (for example
`?ref=flyer-ojota` for one market's flyers). `?utm_source=` works too.

Count sign-ups by channel in the Supabase SQL editor:

```sql
select source, count(*) from public.waitlist_signups group by source order by count(*) desc;
```
