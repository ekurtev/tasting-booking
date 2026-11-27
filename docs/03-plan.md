# Plan — Specification 3: a beautiful, intuitive website and a real "About us"

## Context
Spec 2 made the site legally complete, but it still looks like a template: three tiles on a plain
background. Spec 3 gives it a warm, premium artisan-sweets identity: a home page that tells a story,
a real „За нас“ page, a restyled booking flow, and one consistent visual style across the site. It also
adds a typography rule: hyphens instead of em/en dashes everywhere visible. Booking rules, DB, admin
logic, security headers and legal content (except dashes) stay unchanged; Lighthouse a11y stays 100.
Deadline: report by **18:10** (planning started 16:59) with whatever is done and passing.
Branch `feat/brand-redesign`, PR not merged.

## Decisions (owner's answers → `docs/corrections.md`)
| Topic | Decision |
|---|---|
| Typography | **Self-hosted font**: one OFL Cyrillic serif for headings (Lora via `@fontsource-variable/lora`, loaded with `next/font/local` from node_modules → served from `/_next/static/media`, `font-src 'self'` unchanged); body stays the system stack. |
| Screenshots | Committed to `docs/screenshots/spec3/` (before/after × mobile/desktop for `/`, `/za-nas`, `/book`), embedded in the PR via GitHub URLs. **Repo is public:** the stack for every screenshot run is started with `CONTACT_PHONE="+359 000 000 000" CONTACT_EMAIL="info@example.com" docker compose up -d` (shell env overrides `.env` for that run; `.env` untouched). Only public pages without booking data; each screenshot checked for real names/phones/e-mails before committing. |
| Rich tasting content | `src/content/tastings.ts` keyed by type slug (who it is for, what happens, icon). Name, duration, price still from the DB; admin-added types fall back to the DB description. `listActiveTypes()` gets `slug` in its SELECT (no DB change). |

## Order of work (priority if time runs short)
0. Branch from `main`; take the **before** screenshots first (current design, placeholder env) at
   375×812 and 1280×900 with the local headless Chrome (`--headless=new --screenshot
   --window-size=…` against 127.0.0.1:3000; no new dependencies).
1. **Design system** in `globals.css`: warm palette (cream / caramel / berry / cocoa; every text pair
   checked ≥ 4.5:1), type scale, spacing tokens, radius/shadow, buttons with ≥ 48px tap targets,
   section and band styles, CSS gradient backgrounds, a subtle inline-SVG pattern (data URI is allowed:
   `img-src 'self' data:`); `prefers-reduced-motion` respected (no animations beyond hover transitions,
   which are disabled under reduce). Header and footer restyled with it.
2. **Home page** (`src/app/page.tsx`): hero (headline, one sentence, primary „Запази час“, secondary
   „Как работи“ → `/kak-raboti`, decorative inline SVG box illustration `aria-hidden`); „Как работи“ in
   4 steps with inline SVG icons; tasting types as distinct cards (icon, who it is for, what happens,
   duration, price, allergen note, „Запази“ → `/book?type=<id>` which already preselects); „За нас“
   teaser → `/za-nas`; locations with hours (from `company.ts`); FAQ teaser (3 questions as
   `<details>` + link to `/vaprosi`); closing CTA band. Icons in `src/components/icons.tsx`.
3. **„За нас“** (`src/app/za-nas/page.tsx`): story, what we do (boxes, how we choose products, the three
   tastings), values, why choose us, CTA. No invented facts: placeholders like „[година на
   основаване]“, „[брой продукта в кутия]“, „[страни, от които доставяме]“ — all listed in README.
4. **Booking page restyle** (`BookingFlow.tsx`, `book/page.tsx`): visible labelled step indicator
   (numbers + names, current highlighted; existing `aria-current` kept), larger choice cards/chips
   (≥ 48px), a sticky „Вашият избор“ summary (type, city, date, time, price) visible from step 2 on
   (sticky on desktop side column, compact bar above the step on mobile). Same flow, same API calls,
   same validation, same a11y behaviour (focus to heading, live region).
5. **Dashes**: replace `—`/`–` in all visible text (pages, components, content, metadata
   descriptions, legal pages, admin UI strings, hours like „09:00 - 18:00“, `formatTime` ranges on the
   booking page). Code comments may keep them. Proof: `grep -rnE "—|–"` over `src/` showing only
   comments, plus `curl` of every public page + `/book` steps' static text piping through
   `grep -c "—\|–"` = 0.
6. Restyle remaining pages lightly through shared classes (info, legal `.prose`, 404/error) so the
   whole site matches.
7. **After** screenshots, Lighthouse a11y on `/`, `/book`, `/poveritelnost` (must be 100), keyboard
   pass of the booking flow.
8. Docs: `docs/03-specification.md` (verbatim), `docs/03-plan.md` (this plan), corrections entry,
   README: "What we changed and why" rows + "Content placeholders" list (company.ts + za-nas
   placeholders + log retention); commit, push, PR with embedded screenshots.

## Critical files
`src/app/globals.css`, `src/app/layout.tsx` (font), `src/app/page.tsx`, `src/app/za-nas/page.tsx`,
`src/app/book/BookingFlow.tsx`, `src/app/book/page.tsx`, new `src/content/tastings.ts`,
`src/components/icons.tsx`, `src/lib/booking.ts` (slug in `listActiveTypes` only), `src/content/company.ts`
(hours dashes), all pages with dashes, `package.json` (+ `@fontsource-variable/lora`).
Unchanged: `next.config.ts`, migrations, API routes, admin logic, legal wording.

## Reuse
`company.locations`, `ALLERGEN_NOTICE` (`src/content/company.ts`), `INFO_LINKS`/`LEGAL_LINKS`
(`src/content/site.ts`), `formatPrice`/`formatDuration` (`src/lib/format.ts`), `CANCEL_CUTOFF_HOURS`,
`getContact()` (`src/lib/contact.ts`), existing `/book?type=` preselection in `book/page.tsx`.

## Verification
1. `npm run lint && npm run typecheck && npm test && npm run build` (security-headers test proves CSP
   unchanged).
2. Docker stack with placeholder env; all public URLs 200; dash search = 0 on rendered HTML.
3. Lighthouse accessibility 100 on `/`, `/book`, `/poveritelnost`; keyboard-only booking flow works,
   summary visible, reduced motion respected (emulated via Chrome flag).
4. Screenshots reviewed for any personal data before commit.
