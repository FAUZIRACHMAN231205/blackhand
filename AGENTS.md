<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI follows the locked design system

The look and the copy are decided in `docs/DESIGN.md`. Read it before touching any page or component.

- Build screens from `app/component/ui` (Button, Tag, Price, CatalogCard, PageHeader, fields, EmptyState, FilterTabs, TabLinks). Links to pages come from `app/lib/routes.ts`. Don't hand-style buttons, tags, fields or cards inside pages.
- Colours come only from the tokens: `paper`, `ink`, `mute`, `line`, `sheet`, `accent`, `on-accent`, `accent-text`. They switch for dark mode on their own, so don't add `dark:` colour variants, `violet-*`/`slate-*`/`zinc-*`/`amber-*` classes or hex values.
- Use red (`accent`) only for the single Beli/Bayar button, the discount tag, active links, error text and the focus ring. Delete actions use the dashed `danger` button with a confirmation step.
- Use square corners and no shadows. Keep touch targets at least 44 px and check layouts at 320 px.
- All visible text is in Indonesian, using the names in `docs/DESIGN.md` → Copy.
- Run `npm run dev` and open `/design` to see every component live.
