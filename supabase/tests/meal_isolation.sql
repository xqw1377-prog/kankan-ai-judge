-- Regression: one signed-in user cannot read or write another user's meals.
-- Expects the G0 migration and a non-superuser role `kankan_app`.

INSERT INTO auth.users (id) VALUES
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.meal_records (user_id, food_name, calories)
VALUES
  ('11111111-1111-1111-1111-111111111111', '用户A的午饭', 500),
  ('22222222-2222-2222-2222-222222222222', '用户B的午饭', 700);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('user_profiles', 'meal_records', 'meal_feedbacks', 'habit_patterns', 'ai_usage', 'meal_analyses')
      AND (qual = 'true' OR with_check = 'true')
  ) THEN
    RAISE EXCEPTION 'open RLS policy is still installed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('user_profiles', 'meal_records', 'meal_feedbacks', 'habit_patterns', 'meal_analyses')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ) THEN
    RAISE EXCEPTION 'client write policy is still installed';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO kankan_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kankan_app;

SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
SET ROLE kankan_app;

DO $$
DECLARE
  visible int;
  leaked text;
BEGIN
  SELECT count(*) INTO visible FROM public.meal_records;
  IF visible <> 1 THEN
    RAISE EXCEPTION 'user A should see exactly 1 meal, saw %', visible;
  END IF;

  SELECT food_name INTO leaked
  FROM public.meal_records
  WHERE food_name = '用户B的午饭';
  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'user A read user B meal';
  END IF;

  BEGIN
    INSERT INTO public.meal_records (user_id, food_name, calories)
    VALUES ('22222222-2222-2222-2222-222222222222', '越权写入', 1);
    RAISE EXCEPTION 'user A inserted a meal for user B';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
SET ROLE kankan_app;

DO $$
DECLARE
  own_name text;
BEGIN
  SELECT food_name INTO own_name FROM public.meal_records;
  IF own_name IS DISTINCT FROM '用户B的午饭' THEN
    RAISE EXCEPTION 'user B should see only their own meal, saw %', own_name;
  END IF;
END $$;

RESET ROLE;
