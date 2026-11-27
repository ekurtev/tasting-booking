#!/bin/sh
# Container entrypoint: apply migrations + one-time seed, then start the Next.js server.
set -e
node scripts/migrate.mjs
exec node server.js
