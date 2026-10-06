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

# package-lock.json is the only lockfile. npm ci is what CI runs.
# A stale bun.lock makes Lovable Publish fail on `bun install --frozen-lockfile`.
if [[ -e bun.lock || -e bun.lockb ]]; then
  fail "Found bun.lock or bun.lockb. Delete them so package-lock.json stays the only lockfile."
fi

lockfiles=(package-lock.json npm-shrinkwrap.json yarn.lock pnpm-lock.yaml bun.lock bun.lockb)
for lock in "${lockfiles[@]}"; do
  if [[ -f "$lock" ]] && grep -q -a -E 'drizzle' "$lock"; then
    fail "$lock mentions drizzle. Remove Drizzle from that lockfile."
  fi
done

echo "No Drizzle mirror. Migrations stay in supabase/migrations."
