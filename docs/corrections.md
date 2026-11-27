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
