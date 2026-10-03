# BLACKHAND

A digital art portfolio and shop — a public gallery of an artist's works that
visitors can rate, discuss and buy (each work goes to a single collector), plus a
merchandise shop, all managed through a dedicated admin panel.

Built on **Next.js 16 (App Router)** and **React 19** with a **custom, passwordless
authentication** layer (email one-time codes + Google OAuth) on top of **Supabase**.

---

## Features

- **Passwordless auth** — sign in with an emailed one-time code (OTP) or Google OAuth. No passwords are stored.
- **Role-based admin** — a `role` column gates the admin panel; authorization is verified against the live database, not just the session token.
- **Gallery & feed** — a grid `Collection` view and a chronological `Feed`, with per-work detail pages.
- **Ratings & comments** — signed-in users rate works (1–5) and discuss them; list views use a single aggregated request instead of one query per card.
- **Exclusive artwork sales** — every image is shown clean to everyone. A work for sale is sold to exactly **one** buyer: checkout reserves it for 30 minutes, and once paid it shows as *Terjual* — still viewable, but nobody else can buy or download it. The buyer downloads the full-resolution originals (JPG, ZIP, PDF, or straight to Google Drive).
- **Merchandise shop** — `/shop` sells accessories and merchandise with stock, direct checkout via Midtrans, and a flat shipping fee the admin sets. Buyers follow their orders (and tracking numbers) under *Pesanan Saya*.
- **Admin panel** — works (up to 6 images each, featured cover, price/availability), products (photos, stock, shipping fee), and *Orders & Sales*: ship merch orders with courier + tracking number, see who bought each work, and spot payments that need a refund.
- **Installable (PWA)** — phones can add Blackhand to the home screen and open it full-screen like an app: web app manifest, brand icons generated from the project's Augustus font, a one-tap "Pasang" suggestion on Android/Chrome and Share → *Add to Home Screen* steps on iOS, and a branded offline page.
- **Polished UX** — light/dark theme, responsive/mobile-first layouts, toasts, skeletons, and an error boundary.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16.2 (App Router), React 19 |
| Language | TypeScript (strict) |
| Database / Storage | Supabase (Postgres + Storage) |
| Auth | Custom — signed session cookie (`jose` JWT), email OTP (`resend`), Google OAuth |
| Styling | Tailwind CSS v4, `next/font`, `lucide-react` icons |
| Testing | Jest + React Testing Library |

## Architecture

- **Sessions** — on login a signed JWT (`bh_session`, HTTP-only, 30-day) is set. `app/lib/session.ts` is the Data Access Layer entry point (`getSession`).
- **Authorization** — route handlers guard themselves via `app/lib/apiAuth.ts` (`requireUser` / `requireAdmin`). `requireAdmin` reads the current role from the database, so a revoked admin loses access immediately.
- **Optimistic route protection** — `proxy.ts` (this Next.js version's convention, in place of `middleware.ts`) does a fast, cookie-only check to redirect unauthenticated users; every protected page and API still performs its own authoritative check.
- **Server-only Supabase** — all writes and privileged reads go through the service-role client (`app/lib/supabaseAdmin.ts`, `import 'server-only'`), which bypasses RLS; the browser only ever uses the anon client for public reads.

## Prerequisites

- **Node.js 20+**
- A **Supabase** project (URL + anon key + service-role key)
- A **Resend** account (for OTP emails)
- A **Google OAuth** client (for Google sign-in)

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Create a `.env.local` file in the project root. **Never commit it** (`.env*` is gitignored).

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>   # server-only, bypasses RLS

# Session signing & OTP hashing (generate your own random secrets)
SESSION_SECRET=<random-string>          # e.g. `openssl rand -base64 32`
OTP_PEPPER=<random-hex>                  # e.g. `openssl rand -hex 32`

# Email (Resend) — for delivering OTP codes
RESEND_API_KEY=<resend-api-key>
NEXT_PUBLIC_APP_EMAIL=onboarding@resend.dev   # a verified sender/domain

# Google OAuth
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
# Optional: defaults to /api/drive/google/callback on the same origin as GOOGLE_REDIRECT_URI
# GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/drive/google/callback

# Payments (Midtrans Snap) — from the Midtrans dashboard → Settings → Access Keys
MIDTRANS_SERVER_KEY=<midtrans-server-key>              # server-only
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=<midtrans-client-key>  # `SB-` prefix = sandbox
MIDTRANS_IS_PRODUCTION=false
```

> **Payments are optional in development.** Without `MIDTRANS_SERVER_KEY` the buy
> endpoint answers `503` and the webhook refuses every notification, so nothing can be
> marked paid by accident. The Snap popup host (sandbox vs production) is picked from the
> client key's `SB-` prefix.

> **Heads up on OTP email in development:** with Resend's shared `onboarding@resend.dev`
> sender and a test API key, codes are only delivered to the email address that owns the
> Resend account. To send to any address, verify a domain at resend.com and set
> `NEXT_PUBLIC_APP_EMAIL` to an address on that domain. (Google sign-in has no such limit.)

> **Save to Google Drive** reuses the Google OAuth client above. In Google Cloud Console:
> enable the **Google Drive API**, add the `…/auth/drive.file` scope to the OAuth consent
> screen, and add `http://localhost:3000/api/drive/google/callback` (plus your production
> equivalent) to the client's **Authorised redirect URIs**. `drive.file` only reaches files
> the app creates, so it is a non-sensitive scope that needs no Google verification.
> Access tokens are used once and never stored.

### 3. Set up the database

In the **Supabase → SQL Editor**, run the migrations in `docs/` **in this order**:

1. `docs/DATABASE_SCHEMA_ADMIN.sql` — `works` + `work_images` tables
2. `docs/DATABASE_SCHEMA_RATINGS_COMMENTS.sql` — `work_ratings` + `work_comments` tables
3. `docs/DATABASE_SCHEMA_CUSTOM_AUTH.sql` — `users` + `otp_codes`; swaps foreign keys to the custom `users` table and reworks RLS for the custom-auth model
4. `docs/DATABASE_MIGRATION_ADD_ROLE.sql` — adds the `role` column and promotes the admin account(s)
5. `docs/DATABASE_MIGRATION_PAYMENTS.sql` — album pricing, the `orders` table, and the private `work-originals` bucket
6. `docs/DATABASE_MIGRATION_OTP_IP_LIMIT.sql` — per-network limit on sign-in code requests
7. `docs/DATABASE_MIGRATION_EXCLUSIVE_SALES_AND_SHOP.sql` — one buyer per work (`sold_at`, reservations, `needs_refund`), the merchandise tables (`products`, `product_images`, `product_orders`, `shop_settings`), the public `product-images` bucket, and the database functions that make every sale and stock change atomic

Then create a **public Storage bucket** named `work-images`. It only ever holds
downscaled, clean previews (1200px). Full-resolution files live in the **private**
`work-originals` bucket and are handed out as short-lived signed URLs to the buyer only.

If you have works that were uploaded before step 5, move their originals into the
private bucket and regenerate previews (idempotent, safe to re-run):

```bash
node --env-file=.env.local scripts/migrate-originals.mjs
```

Works uploaded while the old paywall was in place have their non-cover previews stored
blurred. After step 7, rebuild them clean (idempotent, safe to re-run):

```bash
node --env-file=.env.local scripts/unblur-previews.mjs
```

> **How one-buyer sales stay safe.** Reserving a work and marking it sold happen inside
> Postgres functions (`claim_work_for_checkout`, `apply_work_order_notification`), and a
> unique index allows only one paid order per work — so two buyers can never both own it.
> A payment that still arrives for an already-sold work (or for merchandise that ran out)
> is recorded as `needs_refund`, grants nothing, and is listed in the admin panel for a
> manual refund in the Midtrans dashboard. Checkouts that are never paid lapse by
> themselves: the work is freed and merchandise stock returned, even without the webhook
> (which cannot reach a development machine).

> The custom-auth migration (step 3) is what moves the project off Supabase Auth onto the
> app's own `users` table — after it runs, sign-in is handled entirely by this app, and
> the service-role key drives all privileged data access.

To make an account an admin, either edit the email list in
`docs/DATABASE_MIGRATION_ADD_ROLE.sql` before running it, or update a row directly:

```sql
UPDATE public.users SET role = 'admin' WHERE email = 'you@example.com';
```

Because the role is embedded in the session token, promote/demote takes effect on the
account's next sign-in (admin API routes always re-check the live role regardless).

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Jest test suite |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:coverage` | Jest with a coverage report |

## Routes

**Pages**

| Path | Description | Access |
| --- | --- | --- |
| `/` | Landing + auth modal | Public |
| `/dashboard` | User dashboard | Signed-in |
| `/gallery`, `/gallery/[id]` | Collection grid + album detail (buy, ratings, comments) | Public — rating, commenting and buying ask you to sign in |
| `/works`, `/works/[id]` | Activity feed + album detail | Public |
| `/shop`, `/shop/[id]` | Merchandise shop + product detail with checkout | Public — buying asks you to sign in |
| `/albums` | Album Saya — owned works, pending payments, downloads | Signed-in |
| `/orders` | Pesanan Saya — merchandise orders, status, tracking, resume payment | Signed-in |
| `/settings` | Profile & session settings | Signed-in |
| `/admin` | Admin dashboard | Admin |
| `/admin/works`, `/admin/works/create`, `/admin/works/[id]/edit` | Manage / create / edit works | Admin |
| `/admin/products`, `/admin/products/create`, `/admin/products/[id]/edit` | Manage products, photos, stock, shipping fee | Admin |
| `/admin/orders` | Orders & Sales — merch fulfilment, artwork buyers, refunds | Admin |

**API (route handlers under `app/api/`)**

- `auth/otp/request`, `auth/otp/verify`, `auth/google`, `auth/google/callback`, `auth/logout`, `auth/me`
  - Code requests are limited per email (one every 3 minutes) and per network (5 per 10 minutes, 20 per day; `app/lib/otpIpLimit.ts`). The network is read from `x-real-ip` / `x-forwarded-for`, which is only trustworthy behind a proxy that sets them (Vercel, Nginx, Cloudflare). Addresses are stored as an HMAC keyed with `OTP_PEPPER`, never in the clear.
- `profile` — update the signed-in user's profile
- `works/[id]/ratings`, `works/[id]/comments`, `works/ratings/summary` (aggregated list stats), `comments/[id]`
- `works/[id]/purchase` — reserve a work for the caller and open a Midtrans Snap transaction (signed-in); reopens the caller's own unfinished checkout, refuses everyone else while it is reserved or once sold
- `works/[id]/album` — where the work stands for this visitor (`available` / `reserved` / `reserved_by_you` / `sold` / `owned` / `not_for_sale`); returns full-resolution image addresses to the owner
- `works/[id]/download?format=jpg&image=…|zip|pdf` — owner downloads; JPEG originals pass through byte-for-byte, the PDF is one page per image
- `works/[id]/drive` → `drive/google/callback` — copies an owned album into a new folder in the buyer's Google Drive
- `me/albums` — ids of albums the signed-in visitor owns
- `me/purchases` — owned works, payments still awaiting confirmation, and payments to be refunded (for `/albums`)
- `shop/products`, `shop/products/[id]` — published products with the current shipping fee
- `shop/products/[id]/checkout` — take stock and open a Snap transaction for product + shipping (signed-in)
- `me/product-orders`, `me/product-orders/[id]/pay` — the caller's merchandise orders; reopen an unpaid one's payment
- `payments/midtrans/webhook` — payment notifications for both kinds of order (`BH-…` artwork, `BHM-…` merchandise); **the only place an order becomes paid** (signature-verified, amount-checked, applied atomically and idempotently in the database)
- `admin/stats`, `admin/works`, `admin/works/[id]`, `admin/works/[id]/images`, `admin/works/[id]/images/upload-url`, `admin/images/[id]`
- `admin/products`, `admin/products/[id]`, `admin/products/[id]/images`, `admin/products/[id]/images/upload-url`, `admin/product-images/[id]`, `admin/shop-settings`
- `admin/product-orders`, `admin/product-orders/[id]` (process → ship → complete, or cancel), `admin/sales`

## Project structure

```
app/
  api/            Route handlers (auth, profile, works, admin)
  component/      Reusable UI (Navbar, AuthModal, RatingStars, CommentSection, ...)
  context/        Theme & Toast providers
  hooks/          useAuth, useAlbumAccess
  lib/            session, apiAuth, users, supabase clients, otp, oauth, adminUtils,
                  sales (one-buyer rules), shop (merch rules), midtrans, orders, products
  <pages>/        page.tsx per route
  layout.tsx      Root layout, fonts, providers
proxy.ts          Optimistic route protection
docs/             SQL migrations + design notes
__tests__/        Jest + RTL tests
```

## Testing

```bash
npm test
```

Component and hook tests live in `__tests__/` (Jest + React Testing Library, jsdom).

## Progressive Web App

| Piece | Where |
| --- | --- |
| Manifest (`/manifest.webmanifest`) | `app/manifest.ts` |
| Icons (`/icon/32`, `/icon/192`, `/icon/512`, `/apple-icon`, `/maskable-icon.png`) | `app/icon.tsx`, `app/apple-icon.tsx`, `app/maskable-icon.png/route.tsx` — all drawn by `app/lib/brandIcon.tsx` and rendered once at build |
| Service worker | `public/sw.js`, registered by `app/component/ServiceWorkerRegister.tsx` (production only) |
| Offline page | `public/offline.html` |
| Install suggestion | `app/component/InstallPrompt.tsx`, rules in `app/lib/pwa.ts` |

- **What the service worker caches, on purpose, is very little:** only content-hashed build files under `/_next/static/` (cache-first) and the offline page. Pages, API routes, Supabase images, Midtrans and downloads always go to the network — sessions, payments and paid files must never come from a cache. A navigation that fails offline shows `offline.html`.
- **Changing `sw.js` or `offline.html`?** Bump `VERSION` at the top of `sw.js`; old caches are deleted when the new worker activates. `/sw.js` is served `no-cache` (see `next.config.ts`) so phones pick up a new version on their next visit.
- **In development the worker is unregistered**, not registered: dev build files aren't content-hashed, and a cached copy would fight hot reload. Test PWA behaviour with `npm run build && npm run start`.
- Installing needs HTTPS in production (localhost is exempt). The install suggestion only appears on touch devices, after a few seconds, never in the admin panel or inside social-app browsers (Instagram, TikTok, Facebook…), and stays hidden for 30 days once dismissed.

## Notes

- Route protection uses **`proxy.ts`** rather than `middleware.ts` — it is an optimistic UX guard only; the security boundary is the per-route `requireUser` / `requireAdmin` checks.
- `docs/DATABASE_SETUP.md` describes an **older, superseded** schema (Supabase-Auth based) and does not reflect the current custom-auth model — follow the migration order above instead.
