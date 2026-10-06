#!/usr/bin/env bash
# Apply migrations to a throwaway database and prove meal rows are per-user.
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kankan_app') THEN
    CREATE ROLE kankan_app NOLOGIN;
  END IF;
END $$;
ALTER ROLE kankan_app INHERIT;
GRANT authenticated TO kankan_app;
SQL

for migration in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
done

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/meal_isolation.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/consume_once.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/guest_claim.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/guest_lease.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/account_deletion.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/ai_slot.sql

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO public.meal_analyses (id, user_id, food_name, calories, protein_g, fat_g, carbs_g, ingredients, verdict, suggestion)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  '并发午饭',
  400, 20, 10, 40,
  '[{"name":"米饭","grams":150}]'::jsonb,
  '可以。',
  '正常吃。'
);
SQL

psql "$DATABASE_URL" -tA -v ON_ERROR_STOP=1 -c "SELECT public.consume_analysis_into_meal('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'lunch', NULL)->>'status'" > /tmp/kankan-consume-a.txt &
psql "$DATABASE_URL" -tA -v ON_ERROR_STOP=1 -c "SELECT public.consume_analysis_into_meal('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'lunch', NULL)->>'status'" > /tmp/kankan-consume-b.txt &
wait
statuses=$(sort /tmp/kankan-consume-a.txt /tmp/kankan-consume-b.txt | tr -d '[:space:]')
if [[ "$statuses" != "already_consumedcreated" ]]; then
  echo "concurrent consume statuses were: $(cat /tmp/kankan-consume-a.txt /tmp/kankan-consume-b.txt)" >&2
  exit 1
fi
meal_count=$(psql "$DATABASE_URL" -tA -c "SELECT count(*) FROM public.meal_records WHERE food_name = '并发午饭'")
if [[ "$meal_count" != "1" ]]; then
  echo "concurrent consume created $meal_count meals" >&2
  exit 1
fi
psql "$DATABASE_URL" -c "INSERT INTO public.ai_usage (user_id, kind) VALUES ('11111111-1111-1111-1111-111111111111', 'guest_success');" > /tmp/kankan-guest-a.txt 2>&1 &
psql "$DATABASE_URL" -c "INSERT INTO public.ai_usage (user_id, kind) VALUES ('11111111-1111-1111-1111-111111111111', 'guest_success');" > /tmp/kankan-guest-b.txt 2>&1 &
wait || true
guest_slots=$(psql "$DATABASE_URL" -tA -c "SELECT count(*) FROM public.ai_usage WHERE user_id = '11111111-1111-1111-1111-111111111111' AND kind = 'guest_success'")
if [[ "$guest_slots" != "1" ]]; then
  echo "concurrent guest reservations created $guest_slots rows" >&2
  cat /tmp/kankan-guest-a.txt /tmp/kankan-guest-b.txt >&2
  exit 1
fi
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO auth.users (id) VALUES ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.ai_usage (user_id, kind, created_at)
SELECT 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'call', now()
FROM generate_series(1, 19);
SQL
psql "$DATABASE_URL" -tA -v ON_ERROR_STOP=1 -c "SELECT set_config('request.jwt.claim.sub', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', false); SELECT public.consume_hourly_ai_slot(20);" > /tmp/kankan-slot-a.txt &
psql "$DATABASE_URL" -tA -v ON_ERROR_STOP=1 -c "SELECT set_config('request.jwt.claim.sub', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', false); SELECT public.consume_hourly_ai_slot(20);" > /tmp/kankan-slot-b.txt &
wait
slot_flags=$(grep -E '^[tf]$' /tmp/kankan-slot-a.txt /tmp/kankan-slot-b.txt | awk -F: '{print $NF}' | sort | tr -d '[:space:]')
if [[ "$slot_flags" != "ft" ]]; then
  echo "concurrent ai slots returned: $(cat /tmp/kankan-slot-a.txt /tmp/kankan-slot-b.txt)" >&2
  exit 1
fi
slot_rows=$(psql "$DATABASE_URL" -tA -c "SELECT count(*) FROM public.ai_usage WHERE user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1' AND created_at >= now() - interval '1 hour'")
if [[ "$slot_rows" != "20" ]]; then
  echo "concurrent ai slots stored $slot_rows rows" >&2
  exit 1
fi
echo "RLS isolation passed"
echo "analysis single-consumption passed"
echo "guest claim passed"
echo "guest slot single-reservation passed"
echo "account deletion passed"
echo "hourly ai slot passed"
