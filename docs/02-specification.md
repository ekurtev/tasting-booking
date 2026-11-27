# Specification 2 — make it a real, trustworthy booking website

## Goal
The site should look and feel like a real booking business that customers trust and that is legally complete for a Bulgarian/EU business collecting personal data — not like a demo.

## Who uses it
The same customers as before, mostly on phones, all content in Bulgarian. Some use a keyboard or a screen reader.

## What it must do
Structure and trust
- A proper footer on every public page: brand, phone, email, the two locations with working hours, and links to all pages below.
- New pages: „За нас“, „Как работи“ (steps from booking to tasting), „Често задавани въпроси“ (incl. cancellation, kids' events, office tastings, payment on site, allergens), „Контакти“ (phone, email, both locations, hours; a plain link to a map, no embedded map).
- Allergen information: each tasting type says the boxes may contain common allergens and that customers with allergies should contact us before the tasting. Do NOT add an allergy field to the form (health data).
- All company details (legal name, ЕИК, registered address, phone, email, addresses) live in one content/config file with clear placeholders like „[Име на фирмата] ЕООД“, so I can replace them in one place.

Legal pages (Bulgarian, templates for later legal review)
- „Общи условия“: who we are, how booking works, prices in EUR incl. VAT note, payment on site, the 24-hour online cancellation rule and what happens inside 24 h, no-shows, kids' events (parent supervision), liability, complaints, consumer rights incl. КЗП and the EU ODR platform link, applicable law.
- „Политика за поверителност“ (GDPR): controller and contact, what data we collect at booking, purpose and legal basis, retention period (12 months after the tasting, then deleted or anonymised), recipients (none; hosting in the EU), data subject rights, how to exercise them, complaint to КЗЛД.
- „Политика за бисквитки“: we use only a strictly necessary admin session cookie and no analytics or tracking — so no cookie banner.
- „Декларация за достъпност“: target WCAG 2.2 AA, what we tested, known limitations, contact for accessibility problems.
- The consent checkbox in the booking form links to the terms and the privacy policy.

Accessibility (real, not only a page)
- Semantic landmarks, a skip link, one h1 per page, visible focus, labelled form fields, errors and slot-list updates announced to screen readers, keyboard-only booking works end to end, colour contrast AA, respects reduced motion.

Polish
- Favicon, a page title and meta description per page, Open Graph tags, sitemap.xml and robots.txt (excluding /admin and /booking/), friendly custom 404 and error pages.
- If small: actually enforce the 12-month retention (anonymise customer fields of bookings older than 12 months after the tasting), since the privacy policy promises it.

## Constraints
Keep the strict security setup from the CSO audit: no external scripts, fonts, maps or analytics; CSP stays as strict as it is. No changes to the booking rules, the database invariants or the admin panel except what is needed above.

## Done when
All pages are reachable from the footer and linked from the booking consent; keyboard-only booking works; an automated accessibility check (axe or Lighthouse) shows no serious issues on home, /book and one legal page; lint, typecheck, tests and build pass; a PR on a new branch, not merged.

## Documentation
English docs as before: docs/02-specification.md, docs/02-plan.md, corrections, README "What we changed and why" (including that legal texts are templates to be reviewed by a lawyer).
