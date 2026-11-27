# Corrections and clarifications

Changes to the specification ([01-specification.md](01-specification.md)) and plan ([01-plan.md](01-plan.md)) agreed with the owner, in order.

## Clarifying questions (before plan v1)

| Topic | Answer |
|---|---|
| Deployment | The droplet already exists: `vkus-lc7`, 188.166.70.45, **AMS3**, Ubuntu 24.04, user `deploy` (SSH key only), Docker + Compose installed, Cloud Firewall done (22 from owner IP, 80/443 all), DNS A record `vkus.eliankurtev.com` → droplet IP (DNS only). Claude does **not** SSH to the server; it ships deploy-ready files (production compose, NPM compose with port 81 bound to 127.0.0.1) and a step-by-step README deploy section. No first-time server setup steps. |
| Slot grid | Start times every 30 min; 15 min buffer after each tasting (per-consultant setting). |
| Admin users | Single admin account only (from `.env`). |
| Booking rules | Booking up to 60 days ahead; cancellation link works only ≥ 24 h before start. |

Defaults chosen by Claude (not asked): earliest bookable slot is now + 2 h; sample consultants have fictional names and work Mon–Fri 09:00–18:00; location addresses are placeholders; guests are optional, 1–50; inside the 24 h window the cancellation page shows `CONTACT_PHONE`.

## Correction #1 (plan v1 → v2)

Plan v1 is kept unchanged in [../plan-versions/01-plan-v1-before-correction-1.md](../plan-versions/01-plan-v1-before-correction-1.md).

1. Drop the GitHub Actions CI workflow. Level 2 (Actions/Portainer) is out of scope; local lint/typecheck/test/build is the gate.
2. Rate limiting must not trust the first `X-Forwarded-For` value (client-controlled). Use `X-Real-IP` set by NGINX Proxy Manager (or the last hop of `X-Forwarded-For`), with a safe fallback locally without the proxy.
3. `compose.prod.yaml`: a Compose override appends to `ports`, it does not replace it. Use `ports: !reset []` for the app and prove it with `docker compose -f compose.yaml -f compose.prod.yaml config`.
4. Remove `user: "70:70"` from the db service — the official postgres image already runs the server as the `postgres` user; verify with `ps`.
5. `/booking/[token]`: send `Referrer-Policy: no-referrer` and `noindex`; never log the raw token. The seed must be insert-only (`ON CONFLICT DO NOTHING`) so it never overwrites admin edits or re-activates deactivated items.
6. Docs naming: `docs/01-specification.md`, `docs/01-plan.md`, `docs/corrections.md`, `plan-versions/`. README includes "What we changed and why", the region note (AMS3 instead of FRA1: Basic Regular plans were unavailable in FRA1; data stays in the EU) and the single-admin limitation (consultant accounts = next step).

Priority: finish PR 1 first and report as soon as `docker compose up -d --build` works from scratch with a booking saved, before starting PR 2.

## Correction #2 (production test, before submission)

Found by the owner while testing the deployed site; fixed on `fix/code-review` together with the code-review findings (see README → "Code review").

1. README deploy section: the real server path is `/opt/apps/tasting-booking` (not `~/tasting-booking`). Document how to add new `.env` keys after a `git pull` (`gen-env.sh` never overwrites an existing `.env`) and the `docker compose … logs` check after an update.
2. README: `Server Reference ID did not match` errors in the logs come from internet scanners probing Next.js Server Actions and are rejected — expected noise.
3. The admin could mark a booking as completed / no-show before it had started. Decision: block it (small change) — the API returns `409 not_started` and the day view offers only cancellation until the start time.

## Specification 2 — clarifying questions (before plan v1)

Spec: [02-specification.md](02-specification.md), plan: [02-plan.md](02-plan.md).

| Topic | Answer |
|---|---|
| EU ODR link in the terms | The EU ODR platform was closed on 20 July 2025 (Regulation (EU) 2024/3228). The terms link **КЗП** (kzp.bg) and its conciliation commissions (ADR) and state that ODR no longer exists. |
| Automated accessibility check | One-off **Lighthouse** run with the local Chrome against the Docker stack; results in the README. No new dependencies. |
| 12-month retention | Enforced by a **daily job inside the app** (Next.js `instrumentation.ts`): at server start and every 24 h. |
| Addresses and working hours | **Config file only** (`src/content/company.ts`), keyed by the DB location slug. |

## Correction #3 (spec 2 plan v1 → v2)

Plan v1 is kept unchanged in [../plan-versions/03-plan-spec2-v1-before-correction-3.md](../plan-versions/03-plan-spec2-v1-before-correction-3.md).

1. The repository is now **public**: no real phone or e-mail in `src/content/company.ts`. `CONTACT_PHONE` stays in `.env` / `.env.example` (production already has it — the deploy must not break); new `CONTACT_EMAIL` and `ACCESSIBILITY_EMAIL` (defaults to `CONTACT_EMAIL`). The server reads them at request time with obvious placeholders as fallbacks.
2. The booking checkbox is **not GDPR consent** — the legal basis is Art. 6(1)(b). Label: „Запознах се с Общите условия и Политиката за поверителност“ (both linked); still required; the timestamp is still stored (`consent_at`). The privacy policy says the same.
3. Deadline: submission before 19:00, report by 17:45. Priority if time runs short: (a) footer + legal pages + consent links, (b) info pages + allergens, (c) accessibility fixes + Lighthouse, (d) sitemap/robots/404/error, (e) retention job.

## Specification 3 — clarifying questions (before plan v1)

Spec: [03-specification.md](03-specification.md), plan: [03-plan.md](03-plan.md).

| Topic | Answer |
|---|---|
| Typography | **Self-hosted font**: Lora (SIL OFL 1.1, Cyrillic) for headings from the `@fontsource-variable/lora` package via `next/font/local`, served from our own origin; body text keeps the system font. CSP unchanged. |
| Before/after screenshots | Committed to `docs/screenshots/spec3/` and embedded in the PR. **The repo is public:** every screenshot run used `CONTACT_PHONE="+359 000 000 000"` and `CONTACT_EMAIL="info@example.com"` as a shell override for that run only (`.env` untouched); no real name, phone, e-mail or booking may be visible. |
| Rich tasting content | `src/content/tastings.ts` keyed by type slug; name, duration and price still from the database; types added later fall back to their database description. |

## Correction #4 (PR #6, before merge)

1. Step 3 of „Как работи“ showed a spoon-like icon that read as a broken magnifier. Redrawn as a clear magnifier (`IconMagnifier`: round lens + angled handle) with the same 1.8 stroke, 24-unit grid and 28px size as the other icons.
2. Subtle hover/focus animations, 150-250 ms, using only transform / opacity / box-shadow / colour: cards with a link or button lift 3px with a softer, wider shadow (step cards too); buttons darken and move up 2px; header links and „→“ links get an underline that grows from the left (in-text links keep their permanent underline so they stay distinguishable); icons in step, tasting and location cards scale to 1.12. Keyboard focus (`:focus-visible` / `:focus-within`) triggers the same effects. All movement is inside `@media (prefers-reduced-motion: no-preference)`; with reduced motion only instant colour changes remain.
3. Calendar on /book. **Checked first:** for the next Saturday and Sunday, `/api/slots` returns 0 slots, and `/api/days` lists no weekend day. Days off are excluded by the same code (`computeSlots` gets no intervals / `isDayOff`). **Not a bug:** the calendar only lists days that have free slots, so non-working days and days off are hidden, which is one of the two allowed options. Added `tests/calendar.test.ts`, a regression test with its own consultant (Mon-Fri hours plus one day off). It asserts no slots on Saturday, Sunday or the day off, and that `/api/days` leaves them out. A visible hint under the calendar now explains that only days with free slots are shown.
