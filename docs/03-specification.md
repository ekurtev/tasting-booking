# Specification 3 — a beautiful, intuitive website and a real "About us"

## Goal
The site should look like a real, premium artisan-sweets brand that people want to book with — warm, inviting and easy to use — not like a template with three tiles.

## Who uses it
The same customers, mostly on phones, all content in Bulgarian.

## What it must do
Home page — a clear story instead of three tiles:
- A hero section: a strong headline about tasting our boxes, one supporting sentence, a primary "Запази час" button and a secondary "Как работи" link.
- "Как работи" in 3-4 visual steps (icons, short text).
- Tasting types as rich, distinct sections or cards with who it is for, what happens during the tasting, duration, price and a direct "Запази" button that preselects that type in /book.
- A short "За нас" teaser with a link to the full page, the two locations (Sofia, Burgas) with hours, a short FAQ teaser and a closing call-to-action band.
- Visual identity: a warm, appetising palette and typography, generous spacing, subtle decorative elements (our own inline SVG illustrations or patterns, CSS gradients). No stock photos of people, no external images or fonts (self-hosted only) — the CSP stays exactly as strict as now.

"За нас" page — who we are, what we do and why:
- Our story: a subscription box with specialty sweets and snacks from Bulgaria and around the world; why we started tastings (people want to taste before they subscribe; offices and families want a shared experience).
- What we do: the boxes, how we choose products, the tastings (office, personal, kids' birthday).
- Our values (e.g. quality ingredients, small producers, honesty about allergens) and a "why choose us" section.
- Write it as believable marketing copy, but do NOT invent facts that could be false: no founding year, no customer counts, no awards, no named people or testimonials. Where a real fact is needed, use a clear placeholder like „[година на основаване]“ and list all placeholders for me in the README.

Booking page: same flow and rules, but restyled to match (clear step indicator, larger tap targets, the selected tasting summary always visible).

Typography rule: use the normal hyphen "-" everywhere in visible text instead of em or en dashes (— and –), including time ranges like "09:00 - 18:00" and the legal pages. Keep Bulgarian quotes „ “.

## Constraints
No changes to booking rules, database, admin logic, security headers or legal content (except dashes). Accessibility must stay at Lighthouse 100 on /, /book and one legal page; respect reduced motion; mobile first.

## Done when
The home page and "За нас" are redesigned, the whole site uses one consistent visual style, no em/en dashes remain in visible text (prove it with a search), Lighthouse accessibility stays 100, lint, typecheck, tests and build pass, before/after screenshots (mobile + desktop) are attached to a PR on a new branch, not merged.

## Documentation
English: docs/03-specification.md, docs/03-plan.md, corrections, README "What we changed and why" and the list of content placeholders.
