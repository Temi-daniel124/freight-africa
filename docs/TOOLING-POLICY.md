# TOOLING-POLICY.md, Freight Africa

**Authority level: 9 of 14.** Which packages, services and tools the project may use, which it may
not, and the bar a new one has to clear. Rule zero: **no paid tools or services until money comes in**
(founder's standing instruction). Free tiers only, and their limits are tracked in
`docs/ARCHITECTURE.md` §7.

---

## 1. Runtime and package manager

| Item | Choice |
| --- | --- |
| Node.js | Current LTS (24), pinned in `.nvmrc` and `package.json` `engines` |
| Package manager | **npm** only, with `package-lock.json` committed. No yarn, pnpm or bun |
| Language | TypeScript, `strict: true`, no `any` without a comment explaining why |
| Module style | ES modules |

## 2. Approved dependencies

### App
| Package | Purpose |
| --- | --- |
| `next`, `react`, `react-dom` | Framework (App Router) |
| `typescript`, `@types/*` | Types |
| `tailwindcss` (v4), `@tailwindcss/postcss` | Styling with one `@theme` token block |
| shadcn components (copied in, via `npx shadcn@latest`) and their Radix primitives | Base UI components |
| Watermelon UI components (copied in and adapted, D023) | Signature components listed in `DESIGN_SYSTEM.md` §17 |
| `radix-ui` | The Radix primitives shadcn components are built on |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Component variants and class merging (come with shadcn) |
| `tw-animate-css` | CSS-only animation utilities the shadcn components use (comes with shadcn) |
| `motion` (with `LazyMotion`) | Animation |
| `@number-flow/react` | Animated numbers (prices, counters) |
| `react-use-measure` | Measuring for animated layouts (needed by some Watermelon components) |
| `lucide-react` | **The only icon set** |
| `next/font` (Figtree) | The only typeface |
| `@supabase/supabase-js`, `@supabase/ssr` | Database, auth, storage, realtime |
| `zod` | Validation at every boundary |
| `@tanstack/react-query` | Live client data |
| `react-hook-form`, `@hookform/resolvers` | Forms (with zod) |
| `maplibre-gl` | Maps (OpenStreetMap tiles) |
| `tesseract.js` | On-phone text reading for plates and dates |
| `three` | Website hero only, loaded lazily, never inside the app shells |
| `@serwist/next`, `serwist` | Service worker, offline, push |
| `web-push` | Sending Web Push from the server |
| `resend` | App emails (receipts, statements, alerts) |
| `@sentry/nextjs` | Error reporting (free plan) |
| `server-only` | Marks server modules so they can't be imported by the browser |
| `date-fns`, `date-fns-tz` | Dates in Africa/Lagos time |
| `qrcode` | Agent invite QR codes |
| `sonner` | Toasts (shadcn's toast component) |
| `vaul` | Bottom sheets on mobile (shadcn's drawer) |

### Development
| Package | Purpose |
| --- | --- |
| `supabase` (CLI, as a dev dependency, run with `npx supabase`) | Migrations, link, push, types (no Docker on the laptop, D025) |
| `vitest`, `vite`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` | Unit and component tests (`vite` is a required peer of `vitest`) |
| `shadcn` | Copies components in; `globals.css` imports its `shadcn/tailwind.css` |
| `@playwright/test` | End-to-end and screenshot tests |
| `eslint`, `eslint-config-next` | Linting |
| `prettier`, `prettier-plugin-tailwindcss` | Formatting and class ordering |

## 3. Approved services (free tiers)

| Service | Use | Limit to watch |
| --- | --- | --- |
| GitHub (private repo, Actions) | Code, CI, migrations, backups | Actions minutes on private repositories |
| Vercel (Hobby) | Hosting | Personal, non-commercial terms: move to Pro before paid trips |
| Supabase (Free) | Database, auth, storage, realtime, cron | 500 MB database, 1 GB storage, pausing |
| Resend (Free) | Email and Supabase Auth SMTP | Daily and monthly email limits |
| Meta WhatsApp Cloud API | Messages and codes | 250 recipients per 24 h while unverified (D021) |
| Didit | Identity checks | Free checks per month, then per-check pricing (D006) |
| Bachs | Payments | Per-transaction fees, paid out of revenue |
| Sentry (Developer) | Errors | Monthly event quota |
| OpenStreetMap tiles / OpenRouteService | Maps and routes | Fair-use and daily request limits |

## 4. Not allowed

| Instead of… | Use | Why |
| --- | --- | --- |
| Any other icon library (Heroicons, Font Awesome, Phosphor…) | `lucide-react` | One consistent icon style |
| Any other UI kit (MUI, Chakra, Mantine, Ant, DaisyUI, NextUI…) | shadcn + adapted Watermelon | One design system |
| CSS-in-JS (styled-components, Emotion), CSS modules for components, inline style objects for design values | Tailwind with tokens | Tokens are the source of truth |
| `axios`, `node-fetch`, `got` | Built-in `fetch` | Fewer dependencies |
| `lodash`, `underscore`, `ramda` | Plain TypeScript | Fewer dependencies |
| `moment`, `dayjs`, `luxon` | `date-fns` | One date library |
| Redux, Zustand, MobX, Jotai, Recoil | Server components + TanStack Query | No global store needed |
| Prisma, Drizzle, TypeORM, Knex | Supabase client + SQL migrations | RLS is the security model |
| Firebase, Auth0, Clerk, NextAuth | Supabase Auth | One auth system |
| Google Maps JS API, Mapbox GL (paid) | MapLibre + OpenStreetMap | Free |
| Docker on the laptop (Docker Desktop, Podman, Rancher, Colima) | GitHub Actions runners | D025 |
| Any paid SaaS or paid plan | A free alternative, or wait for revenue | Founder's rule |
| Stock illustrations, emoji as icons, AI-generated imagery of people or trucks | Real photography and Lucide | `DESIGN_SYSTEM.md` §6 |

## 5. The bar for adding something new

A new package or service may be added only if **all** of these are true, and the answer is written in
the pull request description:

1. **Need:** nothing already approved, and no small amount of our own code (under about 100 lines),
   does the job.
2. **Free:** no cost now, and its free tier fits launch volume (rule zero).
3. **Healthy:** actively maintained (release in the last 6 months), widely used, open issues answered.
4. **Small:** it doesn't noticeably grow the bundle of the app shells (check with `next build` output);
   heavy packages load lazily or stay server-only.
5. **Safe:** no install scripts doing anything unexpected; no known vulnerabilities (`npm audit`);
   permissive licence (MIT, Apache-2.0, BSD, ISC).
6. **Fits:** works with the App Router, server components, Tailwind v4 and React's current version.
7. **Removable:** used behind our own small wrapper when it touches business logic, so it can be
   replaced (as with `PaymentProvider` and `VerificationProvider`).

When added, it goes into the table in §2 in the same pull request. Removing an approved package needs
no approval.

## 6. Versions and updates

- Exact versions live in `package-lock.json`. Use `npm ci` in CI.
- Dependabot **alerts** are on (free). Dependabot **pull requests are off**: their commits are
  authored by a bot, which would fail `author-check` and be blocked by Vercel (D024). Instead, Claude
  Code runs `npm outdated` at the start of each phase and updates packages itself, through the normal
  loop.
- Major upgrades (Next.js, React, Tailwind, Supabase client) are their own pull requests with
  screenshot tests compared before and after.
- `npm audit --audit-level=high` runs in CI; a high or critical finding blocks merging until fixed or
  documented in `SECURITY.md`.
