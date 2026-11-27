# Specification 1 — "Сладка кутия: дегустации" tasting booking

## Goal
Customers book a tasting session of our subscription boxes online, 24/7, without phone calls. I manage bookings, tasting types and schedules from one place. Everything runs on our own server – no Vercel, no Supabase, no external SaaS.

## Who uses it
- Customers in Bulgaria – individuals, parents, office managers – mostly from a phone. All website content is in Bulgarian.
- Me (the owner) and our consultants in the admin panel, mostly from a laptop.

## What it must do
Public site
- Home page: what a tasting is, the tasting types with duration and price in EUR, our locations (Sofia and Burgas).
- Booking: choose a tasting type → a consultant/location → a date → a free time slot → name, phone, email, number of guests (optional), note (optional), consent to personal data processing → confirmation.
- Only truly free slots are shown, based on each consultant's weekly working hours, days off and the duration of the tasting type. Past slots are never shown. Time zone Europe/Sofia.
- Double booking is impossible: if two people take the same slot at the same moment, only one succeeds and the other sees a clear message to choose another slot. This must hold in the database, not only in the UI.
- The confirmation page shows the booking details and a personal cancellation link. Opening the link and confirming cancels the booking and frees the slot. No emails in this step.
- Sample data: 3 tasting types – „Офис дегустация за екип“ (90 min, 120 €), „Лична дегустация“ (45 min, 25 €), „Кутия за детски рожден ден“ (60 min, 60 €); 2 consultants – one in Sofia, one in Burgas – working weekdays.

Admin panel (/admin)
- Sign in with email and password, no self-registration. The first admin is created from server settings (.env); passwords are stored hashed. Anyone who is not signed in sees nothing – neither the pages nor the admin API.
- Day view per consultant: bookings for the chosen day with time, tasting type, customer, phone and status.
- Change booking status: confirmed → completed / no-show / cancelled.
- Manage tasting types (add, edit, deactivate: name, description, duration, price) and each consultant's weekly schedule and days off.

Security and operations
- Everything runs in Docker: the app and Postgres in one Docker Compose. On the server, NGINX Proxy Manager is the only entry point (80/443) and handles HTTPS; it can live in a separate compose file.
- Postgres is never published to the host. The NPM admin port 81 is bound to localhost only (we reach it through an SSH tunnel).
- Containers do not run as root. Secrets live only in .env (never in the repo, never in the chat); commit a .env.example with placeholders. Generate strong passwords yourself and do not show them.
- Database changes as migrations that run automatically on start; sample data as a seed.
- Basic rate limiting on booking, cancellation and sign-in.

## Technologies
Next.js, PostgreSQL, Docker Compose, NGINX Proxy Manager. Server: DigitalOcean droplet (Frankfurt, Ubuntu LTS, user `deploy`, SSH key only). Public URL: https://vkus.eliankurtev.com (DNS in Cloudflare, DNS only). Code in a new private GitHub repo ekurtev/tasting-booking (create it with gh). A direction, not a recipe.

## Done when
- `docker compose up -d --build` from scratch on my Mac brings up the app and the database with migrations and sample data – the only manual step is creating .env from .env.example.
- I book a slot from my phone: the slot disappears from the site and the booking appears in the admin day view; a second booking of the same slot is rejected (also tested with two simultaneous requests); the cancellation link frees the slot.
- A user who is not signed in gets nothing from the admin pages and the admin API.
- Lint, build and tests pass. README explains how to run it locally and on the server.
- Delivered in two PRs: (1) public site, booking, database and Docker; (2) admin panel on top of PR 1.

## Documentation
All documentation, README, commit messages and PR descriptions are in English; only the website content is in Bulgarian. After I approve the plan, save this specification, the plan and my corrections in docs/, and keep a README section "What we changed and why". Add a CLAUDE.md with the project environment and rules.

Make a plan and ask me about anything that is unclear.
