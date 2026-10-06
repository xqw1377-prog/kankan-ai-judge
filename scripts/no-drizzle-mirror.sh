#!/usr/bin/env bash
# Supabase migrations are the only database source of truth.
set -euo pipefail

fail() {
  echo "error: Database migrations belong in supabase/migrations." >&2
  echo "$*" >&2
  exit 1
}

if [[ -d drizzle || -e drizzle ]]; then
  fail "Found drizzle/. Remove that Drizzle mirror."
fi

shopt -s nullglob
configs=(drizzle.config.*)
if ((${#configs[@]} > 0)); then
  fail "Found ${configs[*]}. Remove the Drizzle config."
fi

if grep -Eq '"drizzle-kit"|"drizzle-orm"' package.json; then
  fail "package.json lists drizzle-kit or drizzle-orm. Remove those dependencies."
fi

echo "No Drizzle mirror. Migrations stay in supabase/migrations."
