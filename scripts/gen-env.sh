#!/bin/sh
# Creates .env from .env.example, replacing each __GENERATE__ with a strong random secret.
# Secrets are written only to .env (mode 600) and never printed.
set -eu
cd "$(dirname "$0")/.."
if [ -e .env ]; then
  echo ".env already exists — not overwriting." >&2
  exit 1
fi
umask 077
tmp=$(mktemp)
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    *__GENERATE__*) printf '%s\n' "$(printf '%s' "$line" | sed "s/__GENERATE__/$(openssl rand -hex 32)/")" ;;
    *) printf '%s\n' "$line" ;;
  esac
done < .env.example > "$tmp"
mv "$tmp" .env
chmod 600 .env
echo ".env created with generated secrets (values not shown). Review the non-secret settings in it."
