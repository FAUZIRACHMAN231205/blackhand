# Blackhand design system

The approved, locked UI/UX for the whole site. **Every new or changed screen
follows this file.** To change the look, change this file first (and the design
book), then the code — never the other way round.

- Visual reference (owner's design book, private link): https://claude.ai/artifact/2ujYb2Lf4J4h9ifCcvrv5i
- Live component gallery (development only): `npm run dev`, then open `/design`

## Locked decisions

| | |
| --- | --- |
| Style | Monochrome editorial: black, white and grey; sharp corners; no shadows, no blur |
| Accent | Dark red, and only for: the one **Beli / Bayar** button per screen, the discount tag, active links, error text, the focus ring |
| Language | Indonesian everywhere, visitors and admin. A display headline may stay English as a design element |
| Focus | Artworks first; merchandise supports them |
| Corners | 0 px on buttons, cards, fields and images. Only avatars are round |

## Colours

Use the token utilities. They follow light/dark on their own, so **no `dark:`
variants and no raw colours** (no `violet-*`, `slate-*`, `zinc-*`, `amber-*`, hex).

| Utility | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg-paper` | `#FFFFFF` | `#0A0A0A` | Page background |
| `text-ink` / `bg-ink` / `border-ink` | `#0A0A0A` | `#F5F5F5` | Text, primary buttons, solid tags, strong rules |
| `text-mute` | `#6B6B6B` | `#9B9B9B` | Secondary text, labels |
| `border-line` | `#E4E4E4` | `#262626` | 1 px dividers |
| `bg-sheet` | `#F4F4F4` | `#161616` | Image placeholders, quiet panels |
| `bg-accent` + `text-on-accent` | `#B91C1C` | `#DC2626` | Beli/Bayar button, discount tag |
| `text-accent-text` | `#B91C1C` | `#F87171` | Active link, error message, focus ring |

Defined in `app/globals.css` (`--bh-*` raw values, `@theme inline` utilities).

## Type

| Role | Font | Style |
| --- | --- | --- |
| Display / headings / UI | Poppins (`font-sans`) | Bold, UPPERCASE, tight tracking |
| Names of artworks and products, the logo | Cormorant Garamond (`font-serif`) | Italic |
| Body text | Poppins | Regular, 16 px |
| Labels | Poppins | 11 px, bold, UPPERCASE, `tracking-[0.2em]` |
| Prices | Poppins | Bold, `tabular-nums` |

Augustus is **not** used for paragraphs (hard to read in long text). At most a
short quote on the Manifesto page.

## Space and layout

- Spacing scale: 4, 8, 16, 24, 40, 64 px.
- Catalog grids: 2 columns on phones, 3 on tablets, 4 on desktop; 16 px gap.
- Phone first: design at 375 px, check at 320 px. Touch targets at least 44 px.

## Components — `app/component/ui`

Import from `@/app/component/ui` (or `../component/ui`). Pages do not style their
own buttons, tags, fields or cards.

| Component | Use |
| --- | --- |
| `Button` | `variant`: `buy` (the one red Beli/Bayar), `primary` (ink), `secondary` (outline), `ghost` (cancel/back), `danger` (dashed; delete, always with a confirmation). `href` makes it a link; `loading` shows a spinner |
| `Tag` | Status by shape: `solid` = can't be bought (Terjual, Stok habis), `outline` = info (Milik Anda, Baru, Pilihan), `dashed` = temporary (Sedang dibeli), `sale` = discount (the only red tag) |
| `Price` | Rupiah, with the original struck through only for a real discount |
| `CatalogCard` | One card for artworks and products: image, tags, italic name, category left / price or status right |
| `PageHeader` | Top of every page: eyebrow, the page's only `h1`, description, actions |
| `TextField`, `TextAreaField`, `SelectField` | Labelled, bottom-ruled fields; `error` replaces `hint` and is tied to the control for screen readers |
| `EmptyState` | Nothing to show yet: what will appear and the way forward |
| `FilterTabs` | Category/filter row; the caller updates the URL so filtered views can be shared |
| `TabLinks` | Tabs that are separate pages (Akun, later Admin), marked with `aria-current` |
| `ImageViewer` | The big picture on a detail page: arrows, counter, thumbnails. `fit="contain"` for artworks, `"cover"` for products |
| `Notice` | A boxed message: `info` (solid), `pending` (dashed: Sedang dibeli, menunggu bayar), `error` (red text, announced) |
| `QuantityStepper` | − n + for how many to buy |

Grids use `WorkCard` and `ProductCard` from `app/component/CatalogCards.tsx`, which
decide the one tag a card shows. Dialogs (`AuthModal`, `ConfirmDialog`) follow the
same rules: square, ink border, `bg-ink/60` backdrop, Escape closes.

Site-wide pieces outside the kit: `Navbar` (Karya · Toko · Manifesto, account menu,
full-screen menu on phones) and `SiteFooter`. The menu, the Akun tabs and the
redirects for retired addresses all come from `app/lib/routes.ts`.

## Structure (target)

- Public: **Beranda** (`/`), **Karya** (`/gallery`, `/gallery/[id]`; replaces Feed
  and Collection), **Toko** (`/shop`, `/shop/[id]`), **Manifesto**.
- **Akun**: one page with tabs — Koleksi (`/account`: bought works, downloads),
  Pesanan (`/account/orders`: merch orders, tracking), Profil (`/account/profile`).
  Replaces Dashboard, Settings, Album Saya and Pesanan Saya. Signing in lands here.
- **Admin** (`/admin`): tabs Ringkasan · Karya · Produk · Pesanan from one layout
  (`app/admin/layout.tsx`) that also does the admin check. Same components,
  denser layout: lists are `AdminRow`s, forms are `FormSection`s, photos are
  `PhotoTile`s (`app/admin/_components`). Edit is a secondary button, delete the
  dashed one with a confirmation; there is no red button in admin.
- Old URLs redirect permanently to the new ones so shared links keep working.
  Signed-out visitors of Akun or Admin land on `/?masuk=1`, which opens sign-in.

## Copy

- Indonesian. Buttons name what happens: "Beli karya ini", "Bayar", "Unduh ZIP",
  "Muat lebih banyak". Not "Submit", not "Load more".
- Errors say what went wrong and how to fix it: "Nomor HP harus 8–15 digit."
- Names: Karya (not Feed/Collection), Toko (not Shop), Koleksi (not Album Saya),
  Akun (not Dashboard / Digital Identity), Pilihan (not Featured).

## Rollout

1. **Fondasi** — tokens and the UI kit. ✅
2. **Struktur** — Karya merge, Akun tabs, redirects, navigation and footer. ✅
3. **Halaman publik** — Beranda, Karya, Detail, Toko, Produk, Pembayaran, Manifesto. ✅
4. **Akun dan admin.** ✅
5. **Rapikan** — Indonesian copy everywhere, remove old components, final check at
   320 / 375 / 768 / 1280 px, light and dark.
