# Plan — Specification 2: a real, trustworthy booking website

## Context
The site works but looks like a demo: a one-line footer, no info/legal pages, no GDPR texts, a consent
checkbox that links nowhere, and accessibility only by accident. Spec 2 adds structure, trust pages,
Bulgarian legal templates, real accessibility, SEO polish and enforcement of the 12-month retention
promised in the privacy policy — without touching booking rules, DB invariants, CSP or the admin panel
beyond what is needed. Delivered as one PR on branch `feat/trust-and-legal`, not merged.

## Decisions (owner's answers, also recorded in `docs/corrections.md`)
| Topic | Decision |
|---|---|
| EU ODR link | The EU ODR platform closed on 20 July 2025 (Reg. 2024/3228). Terms link **КЗП** (kzp.bg) and its conciliation commissions (ADR) and say ODR no longer exists. |
| Accessibility check | One-off **Lighthouse** run (local Chrome, `npx lighthouse`) on `/`, `/book`, `/privacy` against the Docker stack; results in README. No new dependencies. |
| Retention | Daily job inside the app (Next.js `instrumentation.ts`): at start and every 24 h. |
| Addresses / hours | **Config file only**, keyed by DB location slug (`sofia`, `burgas`). Footer, Контакти, home and booking page read it. |

Defaults chosen by me (not asked): prices stated as "в евро, с включен ДДС"; `CONTACT_PHONE` env var
is replaced by the config phone (removed from `.env.example`, README update note); the footer lives in
the root layout, so it also shows under `/admin` (harmless, avoids moving every route into a group).

## 1. Company config — `src/content/company.ts`
Single typed object with clear placeholders: `legalName: "[Име на фирмата] ЕООД"`, `brand`, `eik:
"[ЕИК]"`, `vatNumber`, `registeredAddress: "[Седалище и адрес на управление]"`, `phone`, `email`,
`accessibilityEmail`, `locations: [{ slug, city, address, hours: [{ days: "Пон–Пет", time: "09:00–18:00" }],
mapUrl }]` (plain OpenStreetMap search link, opens in a new tab only as an `<a>`, no embed), `legalUpdated`
date. A `locationBySlug()` helper; `listLocations()` in `src/lib/booking.ts` already returns slug-less rows —
add `slug` to its SELECT and to `BookingDetails` so the booking page can show the config address
(fallback to DB address). Also `src/content/site.ts` with the nav list (footer/sitemap share it).

## 2. Layout, footer, landmarks — `src/app/layout.tsx`, `globals.css`
- Skip link „Към съдържанието“ → `<main id="main" tabIndex={-1}>`; header `<nav aria-label="Основна">`.
- New `src/components/SiteFooter.tsx`: brand, phone (`tel:`), email (`mailto:`), both locations with
  address + hours + map link, two link lists (Информация: За нас, Как работи, ЧЗВ, Контакти; Правна
  информация: Общи условия, Поверителност, Бисквитки, Достъпност), legal name + ЕИК line.
- CSS: global `:focus-visible` outline (3px, offset) for links/buttons/chips; `.skip-link`;
  `@media (prefers-reduced-motion: reduce)` disables transitions and smooth scroll; BookingFlow uses
  `behavior: "auto"` when reduced motion is set. Footer grid styles. Verify contrast of `--muted`,
  `--brand` on `--bg`/white; darken if Lighthouse flags anything.
- Metadata: `metadataBase` from `APP_URL`, default Open Graph (`siteName`, `locale: bg_BG`, `type`),
  `icons`. Favicon: `src/app/icon.svg` (simple brand-colour box glyph) — served same-origin.

## 3. New pages (server components, Bulgarian, one h1, own `title` + `description`)
Shared `src/components/LegalPage.tsx` (h1, „Последна актуализация: …“, a `.prose` style). The
"template, to be reviewed by a lawyer" note goes in README/docs and as a code comment, not on the public page.
- `/za-nas` За нас, `/kak-raboti` Как работи (ordered list: choose type → consultant/city → date/time →
  details → confirmation link → cancel ≥24 h → tasting, pay on site), `/vaprosi` ЧЗВ using
  `<details>/<summary>` (cancellation, inside 24 h, kids' events + parent supervision, office tastings,
  payment on site, allergens, data), `/kontakti` Контакти.
- Legal: `/obshti-usloviya`, `/poveritelnost`, `/biskvitki`, `/dostapnost`, with the sections listed in
  the spec. Privacy also names technical server logs (IP addresses at the reverse proxy) honestly, the
  data actually collected (name, phone, email, guests, note, consent time), legal basis (Art. 6(1)(b)
  contract steps), 12-month retention, EU hosting (DigitalOcean AMS3) as processor, rights, КЗЛД.
  Cookies page: only `tb_admin_session` (admin only, strictly necessary), no analytics → no banner.
  Accessibility statement: WCAG 2.2 AA target, what was tested (keyboard, VoiceOver, Lighthouse
  scores), known limitations, contact.
- Cancellation/24 h text, prices and durations reuse `CANCEL_CUTOFF_HOURS` and `formatPrice` so legal
  text can't drift from the rules.
- Slugs are Latin transliterations for clean URLs; spec's page names are the titles.

## 4. Allergens
Static allergen notice (constant in `company.ts`) rendered under every tasting type card on home, in
the type step of `BookingFlow`, and in ЧЗВ/Общи условия: may contain gluten, milk, eggs, nuts, soy…;
customers with allergies contact us before the tasting. **No form field.**

## 5. Booking form accessibility — `src/app/book/BookingFlow.tsx`
- Consent label links to `/obshti-usloviya` and `/poveritelnost` (`target="_blank" rel="noopener"`
  with visually-hidden „(отваря се в нов прозорец)“).
- Step heading gets `tabIndex={-1}` and receives focus on every step change (keyboard/screen-reader
  users land on the new step); a visually-hidden `aria-live="polite"` region announces "Стъпка N от 5:
  …", "Зареждане…", "Намерени са N свободни часа", "Няма свободни часове".
- Progress `<ol>`: items get visually-hidden text (step names, current via `aria-current="step"`).
- Fields: `aria-describedby` → error id, `aria-required`; on server field errors focus the first
  invalid field; consent error linked to the checkbox. Day/slot chips get full `aria-label`
  ("сряда, 3 декември, 4 свободни часа").
- Notice alert keeps `role="alert"`.
- No change to request payloads or server validation.

## 6. Polish
- `src/app/sitemap.ts` (home, /book, all info + legal pages, from `site.ts`), `src/app/robots.ts`
  (allow `/`, disallow `/admin`, `/api`, `/booking/`, sitemap URL from `APP_URL`).
- `not-found.tsx` friendlier (links to home, booking, contacts); new `src/app/error.tsx` (client,
  "Нещо се обърка" + retry + phone) and `global-error.tsx` (minimal html/body).
- Per-page `metadata` (title, description, `alternates.canonical`); booking page keeps noindex.

## 7. Retention — anonymise after 12 months
- `migrations/003_retention.sql`: `ALTER TABLE bookings ADD COLUMN anonymized_at timestamptz;`
  index `bookings_retention_idx ON bookings (starts_at) WHERE anonymized_at IS NULL`.
- `src/lib/retention.ts` `anonymizeExpiredBookings(now)`: one UPDATE for rows with
  `starts_at < now - interval '12 months'` and `anonymized_at IS NULL` → `customer_name =
  'Анонимизиран клиент'`, `customer_phone = '000000'`, `customer_email = 'anonymized@invalid'`, `note =
  NULL`, `cancel_token_hash = 'anonymized:' || id` (old links 404), `anonymized_at = now`. Satisfies the
  existing CHECKs; status, times, type and consultant stay for statistics; exclusion constraint untouched.
  Returns the count; logs only the count.
- `src/instrumentation.ts` `register()`: on `NEXT_RUNTIME === "nodejs"` run once and `setInterval` 24 h
  (`unref()`), errors caught and logged. Wrapped in `pg_try_advisory_lock` to be safe with >1 instance.
- Admin day view: show "анонимизиран" badge if `anonymized_at` (small, optional).

## 8. Tests (vitest, existing Postgres container)
- `tests/retention.test.ts`: old booking anonymised, 11-month-old untouched, idempotent, token page 404.
- `tests/site.test.ts`: `robots()` disallows `/admin` and `/booking/`; `sitemap()` contains every
  footer page and no admin/booking URL; company config has every required key.
- Security-headers test unchanged and still passing (CSP untouched).

## 9. Documentation
- `docs/02-specification.md` (spec 2 verbatim, English headings as given), `docs/02-plan.md` (this
  plan), `plan-versions/03-plan-spec2-v1.md` copy.
- `docs/corrections.md`: new "Specification 2 — clarifying questions" table (the 4 decisions above).
- README: new sections "Public pages and legal texts" (where `src/content/company.ts` is, what to
  replace), "Accessibility" (Lighthouse results), "Data retention"; "What we changed and why" rows —
  legal texts are **templates to be reviewed by a lawyer**, ODR replaced by КЗП/ADR, config instead of
  DB addresses, `CONTACT_PHONE` removed, no cookie banner because no non-essential cookies, no allergy
  field (health data); remove the retention item from "Known limitations"; deploy note: migration 003
  runs automatically.

## Critical files
`src/app/layout.tsx`, `src/app/globals.css`, `src/app/book/BookingFlow.tsx`, `src/app/page.tsx`,
`src/app/booking/[token]/page.tsx`, `src/app/api/bookings/cancel/route.ts` (phone from config),
`src/lib/booking.ts` (slug only), new `src/content/*`, `src/components/*`, new page dirs under `src/app/`,
`src/app/{sitemap,robots}.ts`, `src/app/{error,global-error}.tsx`, `src/instrumentation.ts`,
`src/lib/retention.ts`, `migrations/003_retention.sql`, `.env.example`, `README.md`, `docs/*`.
`next.config.ts` CSP is **not** changed.

## Verification
1. `npm run lint && npm run typecheck && npm test && npm run build` (Docker running).
2. `docker compose up -d --build`; check every footer link returns 200, `/sitemap.xml`, `/robots.txt`,
   a bogus URL shows the custom 404; response headers still have the same CSP.
3. Keyboard-only booking end to end in the in-app browser (Tab/Enter/Space only): skip link, each step,
   focus lands on step heading, form errors announced/focused, booking created, cancel link works.
4. `npx lighthouse http://localhost:3000/{,book,poveritelnost} --only-categories=accessibility` with
   local Chrome; fix until no serious issues; record scores in README.
5. Retention: test suite + manual insert of a 13-month-old booking locally → anonymised after restart.
6. Commit (noreply author), push `feat/trust-and-legal`, open PR (not merged).
