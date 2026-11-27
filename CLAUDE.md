# CLAUDE.md — tasting-booking

## Project
Booking site for "Сладка кутия: дегустации". Next.js 16 (App Router, TypeScript, standalone output) +
PostgreSQL 17, Docker Compose, NGINX Proxy Manager in front. Spec, plan and corrections live in `docs/`;
plan history in `plan-versions/`.

## Environment
- Local: macOS, Node 24, Docker Desktop. GitHub: private repo `ekurtev/tasting-booking` (commit as the
  GitHub noreply address; private-email push protection is on).
- Server: DigitalOcean droplet `vkus-lc7`, 188.166.70.45, AMS3, Ubuntu 24.04, user `deploy`, SSH key only.
  Public URL https://vkus.eliankurtev.com (Cloudflare DNS only). **Never SSH to the server** — the owner
  deploys using the README steps.
- Time zone for all business logic: `Europe/Sofia` (`src/lib/time.ts`). Never use server local time.

## Commands
- `docker compose up -d --build` — full local stack (app on 127.0.0.1:3000; db not published)
- `npm run lint && npm run typecheck && npm test && npm run build` — the gate before every commit/PR
  (no CI; tests start a disposable Postgres container, so Docker must run)
- `./scripts/gen-env.sh` — create `.env` with generated secrets (never print them)
- `node scripts/admin-user.mjs list|add <email>|remove <email>` — manage admin accounts (inside the app container)
- Production: `docker compose -f compose.yaml -f compose.prod.yaml up -d --build`

## Rules
- Website text is Bulgarian; code, comments, docs, commit messages and PR descriptions are English.
- Secrets only in `.env` (git-ignored). Never commit, echo or paste secret values. Update `.env.example`
  with placeholders when adding variables.
- Schema changes only as new files in `migrations/NNN_name.sql` (never edit an applied migration).
  The seed (`seed/seed.sql`) is insert-only and runs once — never make it update existing rows.
- Invariants belong in the database: double booking is prevented by the `bookings_no_overlap` exclusion
  constraint; keep it. Server re-validates slots; UI checks are convenience only.
- Cancellation tokens: store only SHA-256 hashes, never log raw tokens, keep `no-referrer`/`noindex`
  on `/booking/[token]`.
- Admin area: every `/api/admin/*` handler starts with `requireAdminApi(request)` and every admin page
  calls `requireAdminPage()` — the proxy (`src/proxy.ts`) is only an optimistic cookie check. Keep
  same-origin checks on mutating admin requests. Admin passwords: scrypt via `scripts/password.mjs`.
- The admin bootstrap never overwrites an existing admin; password changes go through
  `node scripts/migrate.mjs --reset-admin-password`.
- Rate-limit by `clientIp()` (X-Real-IP / last X-Forwarded-For hop) — never the first XFF value.
- Containers run non-root; Postgres and the NPM admin port (81) are never exposed publicly.
- Keep `README.md` → "What we changed and why" and `docs/corrections.md` up to date when the owner
  corrects something.
- Delivery: PR 1 public site + booking + DB + Docker; PR 2 admin panel on top of PR 1.
