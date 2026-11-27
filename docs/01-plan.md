# Plan — "Сладка кутия: дегустации" tasting booking

## Context
Customers currently book tastings by phone. We build a self-hosted Next.js + Postgres app where customers book free slots 24/7 (mobile-first, Bulgarian UI) and the owner manages bookings, tasting types and schedules in `/admin`. Everything runs in Docker on the existing droplet behind NGINX Proxy Manager. The project folder is empty (greenfield); Node 24, Docker 29 / Compose v5 and `gh` (logged in as `ekurtev`) are available locally.

## Correction #1 (applied in this version, v2)
First implementation step: save plan v1 (the version before this correction, unchanged) to `plan-versions/01-plan-v1-before-correction-1.md`; v2 goes to `plan-versions/02-plan-v2-after-correction-1.md` and `docs/01-plan.md`.
1. No GitHub Actions CI — local lint/typecheck/test/build is the gate.
2. Rate-limit client IP from `X-Real-IP` (set by NPM) or the **last** hop of `X-Forwarded-For`; never the first value. Local fallback without proxy: a fixed `"local"` key.
3. `compose.prod.yaml` uses `ports: !reset []` for app; proven with `docker compose -f compose.yaml -f compose.prod.yaml config`.
4. No `user:` override on db — the official image already runs the server as `postgres`; verified with `ps`.
5. `/booking/[token]`: `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex` + `<meta name="robots" content="noindex">`; raw tokens never logged. Seed is insert-only (`ON CONFLICT DO NOTHING`).
6. Docs: `docs/01-specification.md`, `docs/01-plan.md`, `docs/corrections.md`, `plan-versions/`. README includes "What we changed and why", region note, single-admin limitation.
**Priority**: finish PR 1, then report as soon as `docker compose up -d --build` works from scratch with a booking saved — before starting PR 2 (checkpoint 15:00).

## Decisions from your answers (saved to `docs/corrections.md`)
- **Deploy**: droplet `vkus-lc7`, 188.166.70.45, **AMS3** (not Frankfurt as in the spec), Ubuntu 24.04, Docker installed, firewall + DNS done. I do **not** SSH; I ship deploy-ready files + README deploy section, you run it. No server-setup steps.
- **Slots**: 30-min start grid, 15-min buffer after each tasting (per-consultant setting, default 15).
- **Admin**: single admin account from `.env`, no other users.
- **Rules**: earliest slot = now + 2 h; booking up to 60 days ahead; cancellation link works only ≥ 24 h before start — inside 24 h it shows a contact phone (`CONTACT_PHONE` in `.env`).
- My defaults (change if you disagree): sample consultants are fictional names, Mon–Fri 09:00–18:00; location addresses are placeholders; guests optional 1–50.

## Stack
- Next.js (latest, App Router, TypeScript, `output: "standalone"`), React server components + route handlers.
- Postgres 17 (alpine) via `pg`; **plain SQL migrations** in `migrations/*.sql` with a tiny runner (`schema_migrations` table + advisory lock) — keeps the exclusion constraint native and readable.
- `zod` for input validation, `@date-fns/tz` + `date-fns` for Europe/Sofia math, `node:crypto` scrypt for password hashing (no native deps).
- Vitest for unit + integration tests; ESLint (Next config). No CI — local `npm run lint && npm run typecheck && npm test && npm run build` is the gate.

## Data model (`migrations/001_init.sql`; seed `seed/seed.sql` insert-only with fixed keys + `ON CONFLICT DO NOTHING`, so it never overwrites admin edits or re-activates deactivated items)
- `locations` (Sofia, Burgas), `consultants` (name, location_id, buffer_minutes, active)
- `tasting_types` (name, description, duration_minutes, price_cents EUR, active, sort_order)
- `weekly_hours` (consultant_id, iso_weekday, start_time, end_time — multiple intervals per day allowed)
- `days_off` (consultant_id, date, note)
- `bookings` (uuid, consultant_id, tasting_type_id, starts_at/ends_at/blocked_until timestamptz, customer name/phone/email, guests, note, consent_at, status enum `confirmed|completed|no_show|cancelled`, cancel_token_hash, created_at, cancelled_at)
- **Double-booking guard in the DB**: `btree_gist` +
  `EXCLUDE USING gist (consultant_id WITH =, tstzrange(starts_at, blocked_until) WITH &&) WHERE (status <> 'cancelled')`.
  The API catches SQLSTATE `23P01` → HTTP 409 with a Bulgarian "this slot was just taken, please choose another" message. Cancelling frees the range automatically.
- PR 2 adds `admin_users` (email, scrypt hash) and `admin_sessions` (sha256 of token, expires_at).

## Slot engine (`src/lib/slots.ts`, pure + unit-tested)
For consultant + date (Europe/Sofia): skip if day off or outside today..+60 d; for each weekly interval, generate starts on the 30-min grid where `start + duration ≤ interval end`; drop starts `< now + 2h`; drop any whose `[start, start+duration+buffer)` overlaps an existing non-cancelled booking's `[starts_at, blocked_until)`. DST handled by converting local wall-clock → UTC with the tz library. Server re-validates the chosen slot on POST (and the DB constraint is the final word).

## PR 1 — public site, booking, database, Docker (branch `feat/public-booking`)
Pages (Bulgarian, mobile-first, plain CSS modules):
- `/` — what a tasting is, tasting types with duration + € price, locations.
- `/book` — stepper: type → consultant/location → date → free slot → form (name, phone, email, guests?, note?, consent checkbox) → submit.
- `/booking/[token]` — confirmation with details + cancel button (confirm dialog); shows "cancelled" state; enforces 24 h rule. Headers `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow` (via `next.config` headers) + robots meta; no logging of request paths/bodies containing tokens.
API: `GET /api/types`, `GET /api/consultants`, `GET /api/slots?consultant&type&date`, `POST /api/bookings`, `POST /api/bookings/cancel` (token in body). Cancel token = 32 random bytes base64url, only its SHA-256 stored.
Rate limiting (`src/lib/rate-limit.ts`, in-memory sliding window, fine for a single app container; `clientIp()` uses `X-Real-IP` set by NPM, else the last hop of `X-Forwarded-For`, else `"local"`; unit-tested against spoofed headers): booking 5/10 min, cancel 10/10 min, (PR 2) sign-in 5/15 min per IP+email. 429 with Bulgarian message.
Docker:
- `Dockerfile` multi-stage `node:24-alpine`, standalone output, runs as `node` (uid 1000); entrypoint runs migrations + seed, then `node server.js`.
- `compose.yaml`: `db` (postgres:17-alpine, no `user:` override — the image runs the server as `postgres`; named volume, **no ports**, healthcheck) + `app` (depends_on healthy db, published only as `127.0.0.1:3000:3000` for local use). `no-new-privileges`, restart policies.
- `compose.prod.yaml` override: app `ports: !reset []`, joins external network `proxy`; checked with `docker compose -f compose.yaml -f compose.prod.yaml config` (no `ports` on app or db).
- `deploy/npm/compose.yaml`: NGINX Proxy Manager with `80:80`, `443:443`, `127.0.0.1:81:81`, network `proxy`.
- `.env.example` with placeholders (`POSTGRES_PASSWORD`, `DATABASE_URL`, `APP_URL`, `CONTACT_PHONE`, later `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`); `.gitignore` excludes `.env`. `scripts/gen-env.sh` fills a fresh `.env` with `openssl rand` secrets without printing them. I create the local `.env` this way and never echo it.
Tests: slot engine unit tests (grid, buffer, past, days off, DST day, horizon); integration tests against Postgres: booking flow, **two concurrent POSTs for one slot → exactly one 201 and one 409**, cancel frees slot, 24 h rule, rate limit.
Docs in PR 1: `docs/01-specification.md` (your spec verbatim), `docs/01-plan.md` (approved plan), `docs/corrections.md` (Q&A answers + Correction #1), `plan-versions/` (v1, v2), `CLAUDE.md` (environment, commands, rules: English docs/commits, Bulgarian UI, no secrets, migrations only, DB-level invariants), `README.md` (local run, tests, deploy steps, "What we changed and why", region note: AMS3 instead of FRA1 because Basic Regular plans were unavailable in FRA1 — data stays in the EU; limitation: single admin account, consultant accounts are the next step).
**Checkpoint**: after PR 1 is up and a from-scratch `docker compose up -d --build` has saved a booking, I stop and report to you before starting PR 2.

## PR 2 — admin panel (branch `feat/admin-panel`, based on PR 1)
- Migration `003_admin.sql`; on start the entrypoint upserts the admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` if no admin exists (hashed with scrypt).
- `/admin/login` → httpOnly, Secure (in prod), SameSite=Lax session cookie, 7-day expiry; logout. Same-origin check on mutating admin requests.
- Protection in depth: `middleware.ts` redirects `/admin/*` without cookie; `requireAdmin()` verifies the session in the admin layout **and** in every `/api/admin/*` handler (401 JSON, no data).
- `/admin` day view: pick consultant + date → bookings (time, type, customer, phone, status) with status actions confirmed → completed / no-show / cancelled.
- `/admin/types`: add / edit / deactivate (name, description, duration, price).
- `/admin/consultants/[id]`: weekly hours editor, buffer, days off add/remove.
- Tests: unauthenticated requests to every admin page/API return redirect/401 with no data; login rate limit; status transitions; deactivated type hidden from public site.
- README + "What we changed and why" updated.

## Git / GitHub
`git init`, initial commit on `main` (README skeleton, .gitignore), `gh repo create ekurtev/tasting-booking --private`, push. PR 1 `feat/public-booking` → `main`; PR 2 `feat/admin-panel` stacked on PR 1 (base `feat/public-booking`, retarget to `main` after PR 1 merges). English commits/PR bodies with the attribution lines.

## Deploy (README section, you run it)
On the droplet as `deploy`: clone repo → `scripts/gen-env.sh` (set `ADMIN_EMAIL`, `APP_URL=https://vkus.eliankurtev.com`) → `docker network create proxy` → `docker compose -f deploy/npm/compose.yaml up -d` → `docker compose -f compose.yaml -f compose.prod.yaml up -d --build` → SSH tunnel `ssh -L 8181:127.0.0.1:81 deploy@188.166.70.45` → in NPM add proxy host `vkus.eliankurtev.com` → `app:3000`, request Let's Encrypt cert, force SSL. Update = `git pull` + same compose command.

## Verification
1. `npm run lint`, `npm run typecheck`, `npm test` (with a test Postgres from compose), `npm run build` — all green locally.
2. From scratch: `docker compose down -v`, create `.env`, `docker compose up -d --build` → migrations + seed applied; restart → seed changes nothing; `docker compose ps` shows db with no host ports; `docker compose exec app id` (uid 1000) and `docker compose exec db ps -o user,comm` (postgres server as `postgres`); `docker compose -f compose.yaml -f compose.prod.yaml config` shows no ports on app/db.
3. In the browser pane (mobile viewport): book a slot → slot disappears from `/book`; confirmation shows details + link; cancel link frees the slot (and refuses inside 24 h).
4. Concurrency: script firing two simultaneous `curl` POSTs for the same slot → one 201, one 409.
5. PR 2: unauthenticated `curl` on `/admin`, `/api/admin/*` → redirect / 401 with no data; sign in → booking visible in day view; status change works.
