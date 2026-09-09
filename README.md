# BLACKHAND

A digital art portfolio and identity system — a gallery where visitors sign in to
browse an artist's works, rate them, and leave comments, while admins manage the
catalogue through a dedicated panel.

Built on **Next.js 16 (App Router)** and **React 19** with a **custom, passwordless
authentication** layer (email one-time codes + Google OAuth) on top of **Supabase**.

---

## Features

- **Passwordless auth** — sign in with an emailed one-time code (OTP) or Google OAuth. No passwords are stored.
- **Role-based admin** — a `role` column gates the admin panel; authorization is verified against the live database, not just the session token.
- **Gallery & feed** — a grid `Collection` view and a chronological `Feed`, with per-work detail pages.
- **Ratings & comments** — signed-in users rate works (1–5) and discuss them; list views use a single aggregated request instead of one query per card.
- **Admin panel** — create/edit/delete works, upload up to 6 images per work (via Supabase Storage signed URLs), and set a featured image.
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
```

> **Heads up on OTP email in development:** with Resend's shared `onboarding@resend.dev`
> sender and a test API key, codes are only delivered to the email address that owns the
> Resend account. To send to any address, verify a domain at resend.com and set
> `NEXT_PUBLIC_APP_EMAIL` to an address on that domain. (Google sign-in has no such limit.)

### 3. Set up the database

In the **Supabase → SQL Editor**, run the migrations in `docs/` **in this order**:

1. `docs/DATABASE_SCHEMA_ADMIN.sql` — `works` + `work_images` tables
2. `docs/DATABASE_SCHEMA_RATINGS_COMMENTS.sql` — `work_ratings` + `work_comments` tables
3. `docs/DATABASE_SCHEMA_CUSTOM_AUTH.sql` — `users` + `otp_codes`; swaps foreign keys to the custom `users` table and reworks RLS for the custom-auth model
4. `docs/DATABASE_MIGRATION_ADD_ROLE.sql` — adds the `role` column and promotes the admin account(s)

Then create a **public Storage bucket** named `work-images` (used for work image uploads).

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
| `/gallery`, `/gallery/[id]` | Collection grid + work detail (ratings/comments) | Signed-in |
| `/works`, `/works/[id]` | Activity feed + work detail | Signed-in |
| `/settings` | Profile & session settings | Signed-in |
| `/admin` | Admin dashboard | Admin |
| `/admin/works`, `/admin/works/create`, `/admin/works/[id]/edit` | Manage / create / edit works | Admin |

**API (route handlers under `app/api/`)**

- `auth/otp/request`, `auth/otp/verify`, `auth/google`, `auth/google/callback`, `auth/logout`, `auth/me`
- `profile` — update the signed-in user's profile
- `works/[id]/ratings`, `works/[id]/comments`, `works/ratings/summary` (aggregated list stats), `comments/[id]`
- `admin/stats`, `admin/works`, `admin/works/[id]`, `admin/works/[id]/images`, `admin/works/[id]/images/upload-url`, `admin/images/[id]`

## Project structure

```
app/
  api/            Route handlers (auth, profile, works, admin)
  component/      Reusable UI (Navbar, AuthModal, RatingStars, CommentSection, ...)
  context/        Theme & Toast providers
  hooks/          useAuth
  lib/            session, apiAuth, users, supabase clients, otp, oauth, adminUtils
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

## Notes

- Route protection uses **`proxy.ts`** rather than `middleware.ts` — it is an optimistic UX guard only; the security boundary is the per-route `requireUser` / `requireAdmin` checks.
- `docs/DATABASE_SETUP.md` describes an **older, superseded** schema (Supabase-Auth based) and does not reflect the current custom-auth model — follow the migration order above instead.
