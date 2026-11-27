# tasting-booking — "Сладка кутия: дегустации"

Online booking for tastings of our subscription boxes. Customers pick a tasting type, a consultant/location
(Sofia or Burgas), a date and a truly free time slot, and get a personal page with a cancellation link.
The website is in Bulgarian; everything else (code, docs) is in English.

Self-hosted: Next.js 16 + PostgreSQL 17 in Docker Compose, behind NGINX Proxy Manager. No external SaaS.

- Specification: [docs/01-specification.md](docs/01-specification.md)
- Approved plan: [docs/01-plan.md](docs/01-plan.md) (history in [plan-versions/](plan-versions/))
- Corrections and clarifications: [docs/corrections.md](docs/corrections.md)

## How it works

| Piece | Where |
|---|---|
| Free-slot engine (30-min grid, 15-min buffer, 2 h lead time, 60-day horizon, Europe/Sofia, DST-safe) | `src/lib/slots.ts`, `src/lib/time.ts` |
| Booking, cancellation, queries | `src/lib/booking.ts`, `src/app/api/**` |
| Double-booking guard | Postgres exclusion constraint `bookings_no_overlap` in `migrations/001_init.sql` |
| Rate limiting (booking 5/10 min, cancel 10/10 min, sign-in 5/15 min per IP+email and 20/15 min per IP) | `src/lib/rate-limit.ts` |
| Migrations, one-time seed and first-admin bootstrap, run on every container start | `scripts/migrate.mjs`, `migrations/`, `seed/seed.sql` |
| Public pages | `/` home, `/book` booking flow, `/booking/[token]` confirmation + cancel |
| Admin panel | `/admin` day view, `/admin/types`, `/admin/consultants/[id]` — `src/app/admin/**`, `src/app/api/admin/**`, `src/lib/admin.ts` |
| Admin auth | `src/lib/auth.ts`, `src/lib/admin-session.ts`, `src/proxy.ts`, `scripts/password.mjs` |

**Double booking is impossible at the database level.** Each booking blocks the consultant for
`[starts_at, ends_at + buffer)`. An `EXCLUDE USING gist (consultant_id WITH =, tstzrange(...) WITH &&)
WHERE (status <> 'cancelled')` constraint rejects any overlapping active booking, whatever the UI did.
Inserts take a per-consultant transaction-level advisory lock so racing requests fail cleanly with
`23P01` (→ HTTP 409, "Този час току-що беше зает…") instead of deadlocking. Cancelling sets the status
to `cancelled`, which frees the range.

**Cancellation link.** The token is 256 random bits; only its SHA-256 hash is stored. The
`/booking/[token]` page sends `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`,
`Cache-Control: no-store` and robots/referrer meta tags; the app never logs tokens. Online
cancellation is allowed until 24 h before the start; after that the page shows `CONTACT_PHONE`.

## Admin panel (`/admin`)

- **Sign-in** with email and password at `/admin/login`; no self-registration. On first start the
  admin is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (min. 12 characters), only if no admin
  exists yet — later changes to `.env` never overwrite it. Your password is the `ADMIN_PASSWORD` value in
  your `.env`. To set a new one: change it in `.env`, run `docker compose up -d` (so the container gets
  the new value), then:
  ```bash
  docker compose exec app node scripts/migrate.mjs --reset-admin-password
  ```
  (this also signs out existing sessions; in production add `-f compose.yaml -f compose.prod.yaml`).
- Passwords are stored as scrypt hashes. Sessions: random 256-bit token in an `HttpOnly`,
  `SameSite=Lax` cookie (`Secure` when `APP_URL` is https), 7-day expiry, stored as a SHA-256 hash and
  revoked on sign-out.
- **Nothing without a session:** `src/proxy.ts` redirects `/admin/*` to the sign-in page and answers
  `/api/admin/*` with `401` before any handler runs; in addition, the admin layout, every admin page and
  every admin API handler verify the session against the database. State-changing admin requests must
  come from the same origin (CSRF check), otherwise `403`. Admin responses are `noindex` and `no-store`.
- **Day view**: choose a consultant and a date → time, tasting type, customer, phone, status. Confirmed
  bookings can be *cancelled* at any time (this frees the slot). *Completed* and *no-show* are offered
  only once the booking has started — the API rejects them earlier with `409 not_started`. Other
  transitions are rejected.
- **Tasting types**: add, edit (name, description, duration, price) and deactivate. Inactive types
  disappear from the public site; existing bookings keep their data.
- **Consultants**: weekly hours per weekday (several intervals allowed, e.g. `09:00-12:00, 13:00-18:00`),
  buffer minutes, and days off. Adding a day off on which bookings already exist keeps those bookings and
  warns you to contact the customers.

## Run locally (Mac)

Requirements: Docker Desktop. The only manual step is creating `.env`:

```bash
./scripts/gen-env.sh
```

(or `cp .env.example .env` and replace every `__GENERATE__` with a strong secret). Then:

```bash
docker compose up -d --build
```

Open http://localhost:3000. Migrations and sample data are applied automatically on start
(3 tasting types, consultants in Sofia and Burgas working Mon–Fri 09:00–18:00).

- Postgres is not published to the host; the app listens on `127.0.0.1:3000` only.
- To try it from a phone on the same Wi-Fi, set `APP_BIND=0.0.0.0` in `.env` and re-run the command,
  then open `http://<your-mac-ip>:3000`.
- Reset everything: `docker compose down -v`.

### Development and checks

```bash
npm ci
```

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

`npm test` runs unit tests and integration tests against a disposable `postgres:17-alpine` container
that the test setup starts on a random localhost port (tmpfs, removed afterwards) — Docker must be running.
Set `TEST_DATABASE_URL` to use an existing throwaway database instead. The integration tests include
8 simultaneous bookings of one slot (exactly one 201, the rest 409) and an exclusion-constraint test that
bypasses the app.

Manual concurrency check against the running stack (pick a real slot from `/api/slots`):

```bash
curl -s "http://127.0.0.1:3000/api/slots?consultant=1&type=2&date=2026-12-03"
```

then fire two identical `POST /api/bookings` requests in parallel (`curl … & curl … & wait`): one returns
`201`, the other `409`.

## Deploy to the server

Server: DigitalOcean droplet `vkus-lc7` (188.166.70.45, AMS3, Ubuntu 24.04), user `deploy`, SSH key
only, Docker + Compose installed, Cloud Firewall (22 from the owner IP, 80/443 open), Cloudflare DNS
`vkus.eliankurtev.com` → droplet (DNS only). No first-time server setup is needed.

On the droplet as `deploy`. The app lives in **`/opt/apps/tasting-booking`**; every command below runs
from that directory (`/opt/apps` must be writable by `deploy`).

1. Get the code (private repo — use a deploy key or `gh auth login` on the server):
   ```bash
   git clone git@github.com:ekurtev/tasting-booking.git /opt/apps/tasting-booking && cd /opt/apps/tasting-booking
   ```
2. Create `.env` with generated secrets (not printed), then edit the non-secret values:
   ```bash
   ./scripts/gen-env.sh
   ```
   Set `APP_URL=https://vkus.eliankurtev.com` (this also makes the admin cookie `Secure`), your
   `ADMIN_EMAIL` and the real `CONTACT_PHONE`. `ADMIN_PASSWORD` is generated — read it from `.env` on the
   server when you first sign in. `APP_BIND`/`APP_PORT` are ignored in production.
3. Create the network shared by NPM and the app (once):
   ```bash
   docker network create proxy
   ```
4. Start NGINX Proxy Manager (ports 80/443 public, admin UI on 127.0.0.1:81 only):
   ```bash
   docker compose -f deploy/npm/compose.yaml up -d
   ```
5. Start the app and database (no host ports at all):
   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml up -d --build
   ```
   Check: `docker compose -f compose.yaml -f compose.prod.yaml config` shows no `ports` for `app` or `db`.
6. From your Mac, open an SSH tunnel to the NPM admin UI and browse to http://localhost:8181:
   ```bash
   ssh -L 8181:127.0.0.1:81 deploy@188.166.70.45
   ```
   On first login change the default NPM admin credentials. Add a **Proxy Host**:
   domain `vkus.eliankurtev.com`, scheme `http`, forward host `tasting-app`, port `3000`,
   enable *Block Common Exploits*; on the SSL tab request a Let's Encrypt certificate, enable
   *Force SSL* and *HTTP/2*.
7. Open https://vkus.eliankurtev.com and make a test booking, then sign in at
   https://vkus.eliankurtev.com/admin and find it in the day view.

### Update to a new version

1. Pull the code:
   ```bash
   cd /opt/apps/tasting-booking && git pull
   ```
2. Check for **new `.env` keys**. `gen-env.sh` never touches an existing `.env`, so variables added to
   `.env.example` in a new release must be added by hand. This lists key *names* only (no values) that
   are in `.env.example` but missing from `.env`:
   ```bash
   comm -23 <(grep -oE '^[A-Z0-9_]+=' .env.example | sort) <(grep -oE '^[A-Z0-9_]+=' .env | sort)
   ```
   No output means nothing to do. For each listed key: if its value in `.env.example` is `__GENERATE__`,
   append a fresh secret without printing it (replace `NEW_KEY`):
   ```bash
   printf 'NEW_KEY=%s\n' "$(openssl rand -hex 32)" >> .env
   ```
   otherwise add it with the real value in an editor (`nano .env`).
3. Rebuild with fresh base images (`--pull` fetches the latest patched `node:24-alpine`; a plain
   `--build` would reuse the cached layers forever), refresh Postgres, and restart:
   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml build --pull app
   ```
   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml pull db
   ```
   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml up -d
   ```
4. Check that it came up — both services `running`/`healthy`, and the app log shows
   `[migrate] database is up to date` followed by Next.js `Ready`:
   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml ps
   ```
   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml logs --tail=50 app
   ```
   (`logs -f app` follows the log live.)

### Monthly security maintenance

`unattended-upgrades` patches only the Ubuntu host — **container images are never updated
automatically**. Once a month (and when a CVE in nginx, OpenSSL, Node.js or Postgres is announced),
run the update steps above even without new code, and refresh NGINX Proxy Manager, the only
internet-facing container:

```bash
cd /opt/apps/tasting-booking && docker compose -f deploy/npm/compose.yaml pull && docker compose -f deploy/npm/compose.yaml up -d
```

Then remove superseded images:

```bash
docker image prune -f
```

`deploy/npm/data/` (NPM database) and `deploy/npm/letsencrypt/` (TLS private keys) are git-ignored —
never commit or copy them off the server.

**Expected log noise:** errors containing `Server Reference ID did not match` come from internet
scanners probing for Next.js Server Actions (they POST made-up action ids). This app defines no Server
Actions; Next.js rejects those requests and nothing is executed. They can be ignored.

### Security notes

- App container runs as `node` (uid 1000) with a read-only root filesystem and `no-new-privileges`.
- The Postgres server runs as the `postgres` user (the official image drops root itself); the database
  is only on the internal Compose network.
- Secrets live only in `.env` (mode 600, git-ignored). `.env.example` holds placeholders.
- Rate limiting keys on `X-Real-IP`, which NPM sets from the TCP peer address (overwriting anything the
  client sent); otherwise the **last** `X-Forwarded-For` hop. The first `X-Forwarded-For` value is
  client-controlled and never trusted. Without a proxy (local) all requests share one bucket.
- NGINX Proxy Manager's init system starts as root inside its container (upstream image design); its
  services run as `PUID/PGID 1000`. It is the only container with public ports.
- Every response carries a same-origin `Content-Security-Policy` (no third-party scripts, styles,
  fonts or frames; `frame-ancestors 'none'`), `Strict-Transport-Security: max-age=31536000`,
  `X-Frame-Options: DENY`, `nosniff` and a restrictive `Permissions-Policy` (`next.config.ts`).

## Known limitations / next steps

- **Single admin account**: only the admin from `.env` can sign in; there is no user management or
  password change in the UI (use `--reset-admin-password`). Consultant accounts with their own
  permissions (e.g. seeing only their own bookings) are the next step.
- Consultants and locations themselves (names, addresses, adding a new consultant) are edited in the
  database/seed for now; the admin manages their schedules and days off.
- No emails/SMS yet — the confirmation page is the only receipt; customers should keep the link.
- Rate-limit counters are in memory (reset on restart); fine for one app container.
- Location addresses and `CONTACT_PHONE` are placeholders until the real values are set.
- Security hardening next steps (from the CSO audit): a least-privilege Postgres role for the app
  instead of the superuser, encrypted off-droplet database backups, and a retention period for
  customer data.

## What we changed and why

| Change | Why |
|---|---|
| Server is in **AMS3 instead of FRA1** | Basic Regular droplet plans were unavailable in FRA1; Amsterdam keeps the data in the EU. |
| Claude does not deploy; repo ships deploy-ready files + README steps | Owner runs the deploy on the existing droplet; no SSH access from the assistant. |
| 30-min start grid, 15-min buffer after each tasting, 2 h lead time, 60-day horizon | Owner's choice in the planning Q&A (buffer = travel/setup time; per-consultant setting). |
| Online cancellation only ≥ 24 h before the start; afterwards the page shows a phone number | Owner's choice; protects consultants from last-minute gaps. |
| Single admin account | Owner's choice for this iteration; consultant accounts are the next step. |
| No GitHub Actions CI | Correction #1: CI/Portainer ("level 2") is out of scope; local lint/typecheck/test/build is the gate. |
| Rate limiting uses `X-Real-IP` / last `X-Forwarded-For` hop | Correction #1: the first `X-Forwarded-For` value is client-controlled and could bypass the limit. |
| `compose.prod.yaml` uses `ports: !reset []` | Correction #1: Compose overrides append to `ports`; without `!reset` the local port would leak into production. |
| No `user:` override on the db service | Correction #1: the official image already runs the server as `postgres` (verified with `docker compose exec db ps -o user,comm`). |
| `no-referrer` + `noindex` on the booking page; tokens never logged; only token hashes stored | Correction #1: the URL is a bearer secret. |
| Seed is insert-only and runs once (`ON CONFLICT DO NOTHING` + `seed:v1` marker) | Correction #1: restarts must never overwrite admin edits, re-activate deactivated items or re-create deleted hours. |
| Advisory lock around booking inserts | Found in testing: simultaneous inserts racing on the exclusion constraint can deadlock in Postgres; the lock turns that into a clean 409 while the constraint stays the final guard. |
| Admin is created from `.env` only when no admin exists; explicit `--reset-admin-password` to change it | Restarts must never silently overwrite credentials; a password change should be a deliberate operator action that also revokes sessions. |
| Admin protection in three layers: proxy, layout/page, API handler | Spec: a signed-in check must hold for pages *and* the API. The proxy is only an optimistic cookie check (Next.js guidance), so every page and handler verifies the session in the database too; pages check themselves because layouts and pages render in parallel. |
| Same-origin check on state-changing admin requests and sign-in | CSRF defence in addition to `SameSite=Lax` cookies. |
| Status changes only from *confirmed* | Spec lists confirmed → completed / no-show / cancelled; anything else (e.g. un-cancelling into a slot that may be taken) is rejected. |
| Days off do not cancel existing bookings | Silently cancelling customers is worse than a warning; the admin gets the number of affected bookings and decides. |
| Plain SQL migrations with a tiny runner instead of an ORM | The key invariant is a native Postgres exclusion constraint; SQL keeps it explicit and reviewable. |
| *Completed* / *no-show* only after the booking has started | Correction #2 (production test): the admin could mark a future booking as a no-show. Blocked in the API (`409 not_started`) and hidden in the day view; cancelling stays possible at any time. |
| Deploy docs use `/opt/apps/tasting-booking`, explain adding new `.env` keys and the post-update logs check | Correction #2: the real server path differs from `~/tasting-booking`, and `gen-env.sh` never overwrites an existing `.env`. |
| README notes the `Server Reference ID did not match` log lines as scanner noise | Correction #2: seen in production logs; they are rejected probes, not app errors. |

## Code review

Before submission the whole of `main` was reviewed with the `code_review` skill (security, correctness,
quality) — all of `src/`, migrations, scripts, Docker/Compose files and tests; `npm audit --omit=dev`
reported 0 vulnerabilities.

**Found:** no Critical issues (no committed secrets, parameterized SQL only, no raw HTML rendering,
session checked in every admin page and handler, double booking blocked in the database).

| Severity | Finding | Outcome |
|---|---|---|
| Warning | Admin could set a future booking to *completed* / *no-show* (`src/lib/admin.ts`) | **Fixed**: SQL only allows it when `starts_at <= now`, API answers `409 not_started`, the day view shows only *Отмени* before the start; tests cover both cases. |
| Warning | Deploy docs had the wrong server path and no procedure for new `.env` keys after `git pull` (a missing required key stops `docker compose up`) | **Fixed**: see "Update to a new version". |
| Suggestion | Public `/api/days` and `/api/slots` are not rate limited | Left: read-only, cheap (a few indexed queries), no data exposure; revisit if traffic grows. |
| Suggestion | `/api/days` and `/api/slots` parse ids with `Number()` instead of `parseId()` | Left: harmless — ids are only matched against lists in JS, never sent to SQL. |
| Suggestion | `POST /api/bookings` returns the generic message instead of the first field message | Left: the booking form shows the per-field `fieldErrors`, so users already see specific messages. |
| Suggestion | Rate-limiter sweep is O(n) per request once >10k keys are active within an hour | Left: needs >10k distinct client IPs per hour (IPv6 is disabled at NPM); fine for one small container. |
| Suggestion | Cookie `Secure` flag depends on `APP_URL` being `https://` | Left: documented in the deploy steps; production `APP_URL` is https. |

## Security audit (CSO)

Before making the repository public, `main` was audited with the `/cso` skill in comprehensive mode.
It covered attack surface, secrets archaeology over the **full git history**, the dependency supply
chain, CI/CD, infrastructure, webhooks, LLM, OWASP Top 10, STRIDE and data classification. The
production context was taken into account: DigitalOcean Cloud Firewall (22 from one admin IP, 80/443
public), key-only SSH, `unattended-upgrades`, NPM admin on `127.0.0.1:81` via SSH tunnel, and the
droplet's cloud-init.

**Found clean:**
- **Git history:** no secrets in any of the 7 commits. Every author is the GitHub noreply address,
  and the only env file ever committed is `.env.example`, with placeholders. No AWS, OpenAI, GitHub,
  Slack, DigitalOcean, JWT or private-key patterns.
- **Dependencies:** `npm audit` reports 0 vulnerabilities, the lockfile is tracked, and no
  production dependency has install scripts.
- **App code:** parameterized SQL only, no raw HTML rendering, no `eval`, no open redirects, no
  outbound requests (no SSRF). The admin session is verified in the database on every admin page
  and API call. Admin mutations are checked for same-origin. Tokens are stored only as hashes.
  Rate limiting cannot be bypassed via `X-Forwarded-For`.
- **Not applicable:** CI/CD workflows, webhooks, file uploads and LLM integrations.

**Result:** 0 Critical, 0 High, 4 Medium, 6 Low.

| Sev | Finding | Outcome |
|---|---|---|
| Medium | No `Content-Security-Policy` or HSTS header (`next.config.ts`) | **Fixed.** Same-origin CSP plus `Strict-Transport-Security`. The booking flow, admin sign-in and home page were checked in a browser against the production build with no CSP violations. `tests/security-headers.test.ts` guards it. |
| Medium | Container images were never refreshed. `unattended-upgrades` patches only the host, and the update step reused cached base layers. NPM (internet-facing) had no update step at all. | **Fixed (docs).** The update step uses `build --pull` and `pull db`, and a new "Monthly security maintenance" section refreshes NPM and prunes old images. |
| Medium | `deploy/npm/data/` (NPM database) and `deploy/npm/letsencrypt/` (TLS private keys) live in the server's clone but weren't git-ignored | **Fixed.** Both are git-ignored, as are local `.gstack/` audit reports. |
| Medium | The app connects to Postgres as the superuser created by the official image. Not exploitable today (no SQL injection), but any future injection bug could escalate to `COPY … PROGRAM`. | **Accepted for now.** The fix needs a separate least-privilege role, a migration with grants, a second credential in `.env` and changes to the deploy steps. That's the next hardening step. |
| Low | Admin cookie has no `__Host-` prefix, and `Secure` depends on `APP_URL` being https | Accepted. Production `APP_URL` is https (deploy step 2), and NPM forces SSL. |
| Low | No MFA for the single admin; fixed 7-day session with no idle timeout | Accepted. One admin with a generated 64-hex password, rate-limited sign-in, and sessions revoked on sign-out or password reset. |
| Low | Image tags not pinned by digest (`node:24-alpine`, `postgres:17-alpine`, `jc21/nginx-proxy-manager:2`) | Accepted. Floating tags are what make the monthly `--pull` deliver security fixes. Pinning would require manual digest bumps. |
| Low | Droplet (outside the repo): `deploy` has passwordless sudo and docker group membership, so a stolen SSH key means root. Docker was installed with `curl get.docker.com \| sh`. | Accepted. Key-only SSH from one IP behind the cloud firewall. The installer is the official Docker script, run once at provisioning. |
| Low | Customer name, phone and email are kept indefinitely, and there are no documented database backups | Accepted. A retention period plus encrypted off-droplet backups are next steps. |
| Low | The public repo shows the droplet IP, user `deploy` and the domain | Accepted. They're already public via DNS. Port 22 accepts only the admin IP, and that IP is not in the repo. |
