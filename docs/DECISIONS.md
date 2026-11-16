# DECISIONS.md, Freight Africa

**Authority level: 1 of 14 (highest).** Every other document defers to this one. The full order is in `AGENT.md` §2. A decision here changes only by
adding a new numbered entry that supersedes the old one (mark the old one `Superseded by Dxxx`).
Never edit a decision silently. If an implementation task conflicts with a decision, stop and raise
it.

Format: **Decision**, then **Why**, then **Consequences** (what the build must do because of it).

---

## D001. Every trip is prepaid by the shipper

**Decision.** No truck is offered a load until the shipper's payment for that load has been received
in escrow. This applies to every shipper, including large companies. There are no credit terms, no
"pay on delivery", no invoicing for later payment.

**Why.** Kobo360 and Lori Systems both broke by paying truckers upfront and waiting 30 to 90 days
for manufacturers to pay. Prepayment removes working-capital risk entirely.

**Consequences.**
- A load is invisible on the load board until `payments.status = 'received'`.
- Companies may fund several loads in one bank transfer (`payment_batches`), but every load still
  has its own fully funded escrow balance.
- Any extra charge that arises after funding (counter-offer difference, waiting charge) is a new
  payment request. It is never taken from another trip's escrow and never fronted by Freight Africa.

## D002. No banks, insurers, fuel stations or financing partners at launch

**Decision.** The launch platform depends on no commercial partner other than the payment provider
(Bachs), the identity provider (Didit) and messaging providers (Meta, Resend, an SMS provider).

**Why.** Partners come after traction. The founders want to launch without waiting on partnership
negotiations.

**Consequences.**
- Freight Africa does not sell, bundle or quote insurance. Owners upload their own goods-in-transit
  certificate to earn an **Insured** badge (see D011).
- The trip advance is paid as money to the owner's bank account, not as a fuel voucher.
- Data structures may leave room for later partners (for example `payouts.kind` can gain values),
  but no partner screens, APIs or flows are built now.

## D003. The supply-side account holder is the truck owner, not the driver

**Decision.** Money, liability and the transporter agreement sit with the **transporter
organisation** (the truck owner). Drivers are members of a transporter organisation. An owner who
drives their own truck is an owner with the driver flag set ("owner-driver").

**Why.** Most Nigerian truck drivers do not own the truck they drive.

**Consequences.**
- Payouts only go to bank accounts owned by the transporter organisation (`bank_accounts.org_id`).
- Drivers never see freight prices, payouts or bank details, only their own trip, the next load
  assigned to them, and their own trip history.

## D004. One installable web app (PWA) for every role, hosted on Vercel

**Decision.** No native apps and no app store accounts. Shippers, owners, drivers, agents, receivers
and staff all use one Next.js progressive web app. It installs from the browser on iPhone and
Android.

**Why.** No budget for Google Play ($25) or the Apple Developer Program ($99/yr), and one codebase is
faster to build and maintain.

**Consequences.**
- Location tracking works only while the app is open on screen. See D005.
- Push notifications on iPhone work only when the app is installed to the home screen (iOS 16.4+).
  Every critical message therefore also goes by WhatsApp.
- The app must show an install prompt to drivers and owners at sign-up and explain why.

## D005. Tracking uses "trip mode", gap detection and optional hardware trackers

**Decision.** During a trip the driver app runs in trip mode: full-screen, screen kept awake (Screen
Wake Lock), one location point per minute stored on the phone and uploaded in batches. The server
detects gaps and escalates. Trucks that already have a GPS tracker can connect it through a
self-hosted Traccar server.

**Why.** Browsers do not allow web apps to read location in the background. Wake Lock works in
installed iPhone apps from iOS 18.4 and on Android Chrome.

**Consequences.** See `SYSTEM-LOGIC.md` §6. A downloadable Android app file (sideloaded, no store) is
held in reserve and is **not** part of this build.

## D006. Identity checks through Didit; Smile ID is the fallback

**Decision.** Owners and drivers verify identity through Didit: ID document scan, passive liveness,
face match, and (owners only) NIN lookup against government records. Shippers verify phone or email
only at first.

**Why.** Didit's free plan gives $10 of credit a month. Costs at the time of writing: ID document
$0.15, passive liveness $0.10, face match $0.05, NIN $0.20, BVN $0.35 ([didit.me/pricing](https://didit.me/pricing)).
A full owner check is $0.50, a driver check $0.30. Didit states its pricing changed on 1 Nov 2026,
so re-confirm before launch.

**Consequences.**
- Verification is behind a `VerificationProvider` interface so Smile ID can replace Didit without
  changing screens.
- Before any paid lookup, the client validates the NIN format (11 digits) and shows it back for
  confirmation, because Didit bills every answered attempt, including "no match".
- BVN is not used.

## D007. Payments and escrow through Bachs, behind our own ledger

**Decision.** Bachs collects shipper payments and executes payouts. Freight Africa's own double-entry
ledger is the source of truth; Bachs is the executor. All provider calls go through a
`PaymentProvider` interface.

**Consequences.**
- Every money movement is a ledger transaction first, then a provider call with an idempotency key.
- Daily reconciliation of ledger against Bachs.
- A second provider can be added later without touching trip logic.
- Integration checklist (endpoints we call): create collection or virtual account per load, payment
  webhook, payout to bank account, payout status webhook, refund, bank list, account-name lookup.

## D008. Messaging: WhatsApp first, email second, SMS as automatic backup only

**Decision.** Trip updates, loading and delivery codes, invites and support chat go by WhatsApp
through the WhatsApp Business Platform Cloud API, directly with Meta (no reseller). Email via Resend
on `mail.freight-africa.com` is the second channel. SMS is sent only when a WhatsApp message fails to
deliver, and can be switched off in settings.

**Why.** Receivers, traders and drivers read WhatsApp; many never open email.

**Consequences.**
- Meta onboarding steps and rules are in D021.
- All outbound messages go through one `notify()` service that picks channels from the
  notification matrix (`SYSTEM-LOGIC.md` §9) and records each attempt in `notifications`.

## D009. Pricing: 3% shipper service fee, 5% owner commission, automatic discounts

**Decision.**
- Shipper service fee: 3% of freight for trips 1 to 5 in a calendar month, 2% for trips 6 to 15,
  1.5% from trip 16.
- Owner commission: 5% of freight; 4% for Gold tier (25+ clean trips).
- Launch offers: shipper's first trip has no service fee; owner's first 3 trips have no commission.
- No subscriptions, no sign-up fees, no charge for tracking, chat, support or payout.
- Competitive rule: the shipper's all-in price (freight + fee) on a lane must not exceed the
  typical agent-arranged price on that lane. Staff adjust lane prices or fees per lane to hold this.

**Confirmed 8 Nov 2026.** The combined 8% is about half the 15% per-trip commission Kobo360 was
reported to take ([TT News](https://www.ttnews.com/articles/ifc-backed-uber-trucks-reshapes-nigerias-haulage-market)),
and below the 10 to 15% margin typical of freight brokers abroad. Dropping to 2% and 4% would raise
break-even from about 46 to about 71 trips a month. Lower rates stay available per lane through the
competitive rule above.

**Consequences.** All rates live in `fee_rules` and `promotions` and are editable in the Admin
console. No rate is hard-coded.

## D010. The receiver has no account; a one-time delivery code proves receipt

**Decision.** The receiver gets a tracking link and, about an hour before arrival, a 6-digit delivery
code by WhatsApp (with email and SMS backups). The receiver checks the goods and reads the code to
the driver, who enters it. The code works once, only when the driver's phone is inside the
destination geofence, and only with a delivery photo. The same mechanism with a **loading code**
confirms loading at pickup.

**Consequences.** See `SYSTEM-LOGIC.md` §5.

## D011. Insurance: badge only, no insurance sold

**Decision.** Owners with a valid goods-in-transit certificate get an **Insured** badge after staff
review. Shippers can require an insured truck. Uninsured and new owners may only carry loads up to a
declared-value limit set in the Admin console.

## D012. Agents (park brokers) are a supported role, switchable off

**Decision.** Agents invite owners and shippers by link and earn 1% of freight on completed, clean
trips by those accounts for the first 6 months of each account. The share comes from Freight
Africa's revenue, never added to anyone's price. Owners and shippers always verify themselves. The
whole role can be disabled by a setting.

## D013. Four corridors at launch

**Decision.** Launch on four corridors at once, confirmed by the founders on 8 Nov 2026: Lagos ⇄ Kano, Lagos ⇄ Abuja, Lagos ⇄ Onitsha/Aba, and the eastern loop Port
Harcourt ⇄ Aba ⇄ Onitsha ⇄ Enugu. Corridors are data (`corridors` table), not code.

## D014. Full platform at launch, built in a fixed order

**Decision.** Every feature in `docs/PLATFORM-SCOPE.md` ships in the launch version. The full
platform is built at once; there is no cut-down first version. Build order is fixed (see `PLATFORM-SCOPE.md` §6) because each module depends on the one
before it.

## D015. Account and data safety

**Decision.** All service accounts (GitHub organisation, Supabase, Vercel, Bachs, Didit, Meta,
Resend, domain registrar) are owned by a company mailbox with at least two admins and two-step
sign-in. The database is backed up nightly to storage on a different provider. The waitlist and
critical tables are exported weekly.

**Why.** The previous codebase, Supabase project and waitlist were lost in one event.

## D016. Meta (WhatsApp) onboarding rules (Superseded by D021)

## D017. English only at launch

**Decision.** The platform launches in English only. Pidgin, Hausa, Yoruba and Igbo are later
updates. There is no language picker at launch.

**Why.** Translating and checking every screen and message in five languages slows the launch.

**Consequences.**
- All user-facing text still lives in one English message file keyed by screen (no text written
  directly in components or images), so adding a language later is a translation job, not a code
  change.
- `settings.languages_enabled = ['en']`. The `language` columns stay in the schema, defaulting to
  `en`.
- WhatsApp templates are submitted in English only.
- No `hreflang` tags until a second language ships.

## D018. Phone numbers are visible only during a confirmed trip

**Decision.** A person's real phone number is shown to another trip party only while the trip is
confirmed and live: from the moment the trip is `assigned` (the shipper has paid **and** an owner has
accepted) until it is `delivered`, `delivered_with_exception` or `cancelled`. After that it is hidden
again. No paid masked-calling service is used. Calls use the phone's own dialler or WhatsApp, which
cost Freight Africa nothing. Full rules in `SYSTEM-LOGIC.md` §18.

**Why.** Parties need to call each other at pickup and delivery, but numbers handed out freely make
it easy to take repeat trips off the platform, and there is no budget for masked calling.

**Consequences.**
- Phone numbers are never readable from profile rows by other users. They are returned only by the
  server function `trip_contacts(trip_id)`, which applies the rules on every request.
- Receivers and pickup contacts never see the driver's number. They tap **Ask the driver to call me**,
  and the driver gets their number in the app.
- After delivery, follow-up happens in trip chat (open 48 hours, or while a problem is open) and
  through support.

## D019. Cancellation fee, waiting charge and value limits confirmed

**Decision.**
- Cancellation fee once the truck has reached pickup: ₦25,000.
- Waiting: the first 4 hours are free; each hour after that costs ₦5,000.
- Declared-value limits: new owner ₦3m; established owner without insurance ₦10m; Gold or insured
  owner: no limit.

**Why.** The cancellation fee pays the owner for a wasted trip to the pickup. It is separate from
waiting time. The value limits stop a new, unproven owner from being trusted with very valuable
goods on their first trips.

## D020. Card payments built in, switched off

**Decision.** Bank transfer only at launch. Card payment is built behind the
`card_payments_enabled` setting (default `false`), so it can be switched on later without a code
change.

## D021. WhatsApp runs on an unverified Meta business account at launch

**Decision.** Supersedes D016. Set up the WhatsApp Business Platform Cloud API without business
verification. Verification is done later, once the business documents it requires exist.

**Steps.**
1. Publish freight-africa.com first with the name Freight Africa, a contact address, phone and email,
   and the Terms and Privacy pages. Meta reviews the website.
2. Two founders log in with their own long-standing, real personal Facebook accounts. Meta publishes
   no minimum account age, but new or empty accounts are more likely to be flagged. Do not create
   fresh accounts for this.
3. Create one Meta Business portfolio named "Freight Africa". Add both founders as admins and turn on
   two-step sign-in.
4. Buy a new SIM for the WhatsApp number. It must never be used on the normal WhatsApp app.
5. Display name "Freight Africa".
6. Submit English templates as **utility** (trip updates, codes) and **authentication** (sign-in
   codes). Templates never mention loans, credit or lending, which are restricted categories.

**Limits.** An unverified portfolio can message 250 unique people per 24 hours
([baat.ai summary of Meta's limits](https://baat.ai/blog/whatsapp-business-api-access)). A trip
messages up to 5 unique people, so this covers about 50 new trips a day, far above launch volume.
The Admin console shows the current limit (X-20) so staff see it coming.

**If Meta restricts the account.** Every message already goes by email and SMS as well (D008), so
the platform keeps working. Appeal through Meta Business Support. A Business Solution Provider is
not a way around this, because it uses the same Meta portfolio.

## D022. Light theme only, with a night look for live driver trips

**Decision.** The product ships in light theme only. No dark mode, no theme switch. One exception: the
driver's trip screens (Trip and Drive tabs while a trip is live) switch to a dimmed night look after
sunset, or when the driver chooses it.

**Why.** Light only keeps the design neat and the build simpler. The exception is for safety: a bright
white screen in a dark cab dazzles the driver. The founders may remove it.

**Consequences.** `dark:` classes are removed from all components; night look tokens exist only for the
driver trip screens (`DESIGN_SYSTEM.md` §1.1).

## D023. Visual design system and component library

**Decision.** `DESIGN_SYSTEM.md` is the single source for visual design. Interactive components come
from the Watermelon UI registry (installed with the shadcn CLI), adapted to our tokens as set out in
`DESIGN_SYSTEM.md` §17: light only, Freight Green, Lucide icons, 45 px pill buttons, no blur
transitions in the app, real data instead of timers, real copy and images.

**Consequences.** The front end uses Tailwind CSS v4 with one `@theme` block of tokens, `motion` with
`LazyMotion`, and `@number-flow/react`. Testimonials appear only when real and permitted.

## D024. Every commit is authored as Temi-daniel124

**Decision.** Every commit in the repository is authored as **Temi-daniel124**
<**temmydaniel124@gmail.com**>, the owner of the GitHub account and the Vercel account. The identity is
checked before the first commit of every session, by a pre-commit hook on every commit, and in CI for
every commit in a pull request. Commit messages carry no `Co-authored-by` trailers.

**Why.** Vercel's Hobby plan builds only commits whose author it can tie to the account owner; a
mismatched author previously caused Vercel to block production deployment
([Vercel: troubleshoot project collaboration](https://docs.vercel.com/docs/deployments/troubleshoot-project-collaboration)).
Vercel doesn't document how it treats co-author trailers, so they are left out to remove any doubt.

**Consequences.** `scripts/check-git-identity.mjs`, `.githooks/pre-commit`, `.githooks/commit-msg`
and the `author-check` CI job (`docs/DEVELOPMENT-WORKFLOW.md` §3).

## D025. No Docker on the development laptop

**Decision.** Docker Desktop, `supabase start` and any other local container stack are never run on the
founder's laptop. Schema work happens against the real remote Supabase project: migrations are written
as files (`supabase migration new`), checked with `supabase db push --dry-run`, and applied with
`supabase db push`. Everything that needs Docker runs on GitHub-hosted runners: `supabase db start`,
pgTAP and RLS tests (`supabase test db`), schema drift checks (`supabase db diff`), and backups
(`supabase db dump`).

**Why.** Docker Desktop used about 2.3 GB of RAM and 6.4 GB of disk before Postgres even started.
`supabase db diff`, `db pull`, `db dump` and `test db` all need Docker
([Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-db-diff)), and Supabase
supports running them in GitHub Actions
([Supabase: testing in CI](https://supabase.com/docs/guides/deployment/ci/testing)).

**Consequences.** `docs/DEVELOPMENT-WORKFLOW.md` §4 and `.github/workflows/ci.yml`. Because
`db diff` can't run locally, migrations are written by hand, never generated by diffing.

## D026. Only the Freight Africa Supabase project is ever touched

**Decision.** The only Supabase project this repository, its tools and its agents may read or change is
**Freight Africa**, project ref **`czlowhaycaivpgimcefk`**, URL
`https://czlowhaycaivpgimcefk.supabase.co`. The same Supabase organisation contains an unrelated
project, **Orayn_Main**. It must never be read, listed in detail, linked, migrated, paused, restored,
deleted, queried or changed in any way, by the CLI, the MCP connector, the Management API or the
dashboard.

**Consequences.** `scripts/check-supabase-target.mjs` runs before any database command; every Supabase
MCP call passes `project_id: "czlowhaycaivpgimcefk"` explicitly; CI verifies the ref before linking;
`SECURITY.md` §3.

## D027. Claude Code operates GitHub, Vercel, Supabase and Resend end to end

**Decision.** Claude Code creates and runs the GitHub repository, the Vercel project and deployments,
the Supabase project's schema and configuration, and the Resend-to-Supabase SMTP link, using the
connections the founder has set up, with as little founder involvement as possible.

**Gates that remain (the founder is asked first):** anything that deletes or overwrites data in the
remote database; dropping or renaming tables or columns; changing auth providers or SMTP after launch;
rotating or revoking keys; changing domains or DNS; changing billing or plans; anything touching money
movement in production (live payment keys, payouts, refunds); and anything a provider requires the
account owner to do personally (see `docs/PROJECT-STATE.md` §4).

## D028. Document hierarchy

**Decision.** The governing documents, highest authority first:

1. `docs/DECISIONS.md`
2. `docs/PRODUCT.md`
3. `docs/DATA-MODEL.md` (with its annex `docs/SYSTEM-LOGIC.md`)
4. `docs/ARCHITECTURE.md`
5. `docs/ROLES-AND-PERMISSIONS.md`
6. `docs/PLATFORM-SCOPE.md` (with its annexes `docs/planning/*.md`)
7. `docs/PROJECT-STATE.md`
8. `docs/DEVELOPMENT-WORKFLOW.md`
9. `docs/TOOLING-POLICY.md`
10. `AGENT.md`
11. `CLAUDE.md`
12. `BUILD.md`
13. `SECURITY.md`
14. `DESIGN_SYSTEM.md`

When two documents disagree, the higher one wins, and the conflict is raised so the lower one can be
fixed. Security rules in `SECURITY.md` are never relaxed by a higher document unless that document
states the exception explicitly.

## D029. One remote database environment until launch

**Decision.** Until launch there is one Supabase project (Freight Africa), used for development and
previews. At launch it becomes production. From then on migrations are applied only through the
`migrate` GitHub Actions workflow after CI passes, and only additive changes are made in one step
(destructive changes go expand-then-contract over two releases).

**Why.** The free Supabase plan allows two projects per organisation, and the organisation already
holds Orayn_Main. Paid branching or a separate staging project can come with revenue.

## D030. A pre-launch landing page ships first, right after Phase 0

**Decision.** A pre-launch website (the "launch page") is built and published immediately after Phase
0, before Phase 1, so the founder can start sending it out and rebuilding the waitlist that was lost.
It is a slice of Phase 7 brought forward, built to the full `DESIGN_SYSTEM.md` standard, with these
limits until the platform launches:
- No live prices, quotes, sign-in or booking. The hero card is a **waitlist card** instead of the quote
  box. No fee rates or lane prices are shown (D031).
- Pages: home (`/`), waitlist (`/waitlist`), privacy notice (`/legal/privacy`), terms of the waitlist
  (`/legal/terms`) and the not-found page. Header links to pages that don't exist yet are left out.
- Waitlist sign-ups go into `waitlist_signups` (`docs/DATA-MODEL.md`) through server code only, with
  rate limiting and a confirmation email when an email is given. WhatsApp confirmation waits for D021.
- No 3D model and no background video yet; photography only where it is real and allowed
  (`DESIGN_SYSTEM.md` §6.2). Until our own shoot, the hero uses licensed filler photographs taken in
  Nigeria (D031).
- Phase 7 later replaces and extends it into the full website.

**Why.** The founder needs a credible public page to share now; the rest of the platform takes longer.

## D031. The public website explains how it works, never the numbers behind it

**Decision.** Public pages (website, launch page, social posts, emails to prospects) show **no**
percentages, fee tiers, commission rates, advance shares or worked examples of what Freight Africa
keeps. They describe the process: one all-in price shown before paying, money held and released in
stages, the final payment released only after delivery is confirmed, no subscriptions or sign-up fees,
a service charge on completed trips only, and unspecified "launch offers" for early members. Exact
prices, charges and payout timing appear in the app before a person confirms, and in the Terms of
Service, which govern. Wording rules and the approved copy are in
`docs/planning/launch-page-copy.md`.

The launch-page hero becomes a photo slideshow (`DESIGN_SYSTEM.md` §13.3), using licensed filler
photographs taken in Nigeria until our own shoot (Phase 7). The header becomes a floating pill
(`DESIGN_SYSTEM.md` §13.2).

**Why.** Published rates invite argument, anchor negotiations and expose the business model;
absolute promises ("paid in minutes", "nothing released until delivery") become liabilities and, for
the advance released at loading, would be untrue. D009's rates are unchanged; only where they are
shown changes.

## D032. Typeface: Inter, in a Freight Africa subset

**Decision.** Inter (SIL Open Font License) replaces Figtree everywhere, self-hosted as one file,
`src/app/fonts/InterFA.woff2` (57 KB): optical sizes (`opsz` 14–32), weights 400–800, the naira sign,
and the letters Hausa, Yoruba and Igbo need. Loaded with `next/font/local`, preloaded, `display: swap`.
Features `cv05` (l with a tail) and `cv08` (I with serifs) are on everywhere, so plates, codes and names
like "Ilorin" or "KJA 482 XA" can't be misread; tabular figures for money, plates, codes and times.

**Why.** Tested on 15 Nov 2026 against more than 40 free fonts (Figtree, Plus Jakarta Sans, Manrope, Geist, DM
Sans, Onest, Instrument Sans, Mona Sans, Google Sans Flex, Public Sans, Work Sans, Bricolage Grotesque
and others): **Figtree has no naira sign**, so every "₦" on the site was drawn in a different fallback
font. Only Inter and Noto Sans contain the naira sign *and* every Hausa, Yoruba and Igbo letter needed
for the later languages (D017). Inter is the closer match to Apple's system type, has true optical
sizes for large headlines, and keeps one family for the whole product. Its common use elsewhere is
offset by the tuned optical sizes, tracking and character variants above and by the craft standard in
`DESIGN_SYSTEM.md` §20.


## D033. Three hosts: website, app and staff console

**Decision.** One deployment serves three hosts:

| Host | Serves |
| --- | --- |
| `freight-africa.com` (and `www`, which redirects to it) | The public website: launch page, waitlist, legal pages |
| `app.freight-africa.com` | The signed-in app (`/app/...`) and its sign-in (`/auth`) |
| `admin.freight-africa.com` | The staff console (`/admin/...`) and its own sign-in (`/auth`) |

Paths keep their names on every host (`app.freight-africa.com/app/ship`,
`admin.freight-africa.com/admin`), so screen specs, preview deployments and localhost are unchanged.
The root of each signed-in host opens its home (`/app`, `/admin`). A path on the wrong host is
redirected to the right one with a permanent redirect, including the old `/auth` and `/app` paths on
`freight-africa.com`. Routing lives in `src/lib/hosts.ts` and `src/proxy.ts`.

Cookies carry no `Domain` attribute, so each host keeps its own: a session on the app is not a session
on the staff console, and the website never receives either. Staff therefore sign in on the admin host.
Both signed-in hosts answer `robots.txt` with `Disallow: /` and send `X-Robots-Tag: noindex`. The
installable app's manifest (`/app.webmanifest`) starts at `/app` with scope `/` on the app host.
Supabase Auth's Site URL is `https://app.freight-africa.com`, with both hosts' `/auth/callback` on the
redirect list.

**Why.** Separate hosts give the browser's own cookie and origin rules as a wall between the public
site, customers and staff; let the app be installed without the marketing pages inside it; and keep
the public website fast and static.

## D035. Bot check on sign-in: built, switched off

**Decision.** The Cloudflare Turnstile check on "Send code" (`src/lib/turnstile.ts`,
`src/features/auth/turnstile-field.tsx`) stays in the code but is not switched on: no Cloudflare
account, no keys, and Supabase Auth's CAPTCHA setting stays off. It is switched on only if real bot
abuse appears (many codes requested for addresses that never sign in). Until then the database limits
do the work: 5 codes an hour per person, 60 an hour per internet address, 5 tries per code, and codes
that last 10 minutes. Switching on later means setting `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and
`TURNSTILE_SECRET_KEY`, turning on Supabase Auth's CAPTCHA with the same secret, and first fixing the
two WhatsApp items in `docs/PROJECT-STATE.md` §3.

**Why.** There is no abuse yet, and every extra account and third-party script is something to
maintain and something that can fail for a real visitor on a poor connection.
