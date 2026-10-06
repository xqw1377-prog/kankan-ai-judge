-- Deleting an auth user removes cascaded personal rows.
-- Claim tokens are purged explicitly and also cascade.

INSERT INTO auth.users (id) VALUES
  ('aa000001-0000-0000-0000-000000000001'),
  ('aa000001-0000-0000-0000-000000000002'),
  ('aa000001-0000-0000-0000-000000000003'),
  ('aa000001-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (user_id, nickname, avatar_url)
VALUES ('aa000001-0000-0000-0000-000000000001', '甲', 'data:image/png;base64,aaaa');

INSERT INTO public.meal_records (user_id, food_name, calories)
VALUES
  ('aa000001-0000-0000-0000-000000000001', '删号午饭', 320),
  ('aa000001-0000-0000-0000-000000000002', '保留午饭', 280);

INSERT INTO public.meal_analyses (user_id, food_name, calories, protein_g, fat_g, carbs_g)
VALUES ('aa000001-0000-0000-0000-000000000001', '删号午饭', 320, 10, 8, 40);

INSERT INTO public.ai_usage (user_id, kind)
VALUES ('aa000001-0000-0000-0000-000000000001', 'call');

INSERT INTO public.meal_feedbacks (user_id, meal_id, food_name, actual_feeling)
VALUES ('aa000001-0000-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000011', '删号午饭', 'ok');

INSERT INTO public.habit_patterns (user_id, original_name)
VALUES ('aa000001-0000-0000-0000-000000000001', '米饭');

INSERT INTO public.guest_claim_tokens (token, anonymous_user_id, claimed_owner_id) VALUES
  ('aa000001-0000-0000-0000-0000000000a1', 'aa000001-0000-0000-0000-000000000001', NULL),
  ('aa000001-0000-0000-0000-0000000000a2', 'aa000001-0000-0000-0000-000000000002', 'aa000001-0000-0000-0000-000000000001'),
  ('aa000001-0000-0000-0000-0000000000a3', 'aa000001-0000-0000-0000-000000000002', NULL),
  ('aa000001-0000-0000-0000-0000000000a4', 'aa000001-0000-0000-0000-000000000003', NULL),
  ('aa000001-0000-0000-0000-0000000000a5', 'aa000001-0000-0000-0000-000000000002', 'aa000001-0000-0000-0000-000000000004');

DO $$
DECLARE
  rel text;
BEGIN
  FOREACH rel IN ARRAY ARRAY[
    'user_profiles', 'meal_records', 'meal_analyses', 'ai_usage', 'meal_feedbacks', 'habit_patterns'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint AS c
      JOIN pg_class AS t ON t.oid = c.conrelid
      JOIN pg_namespace AS n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = rel
        AND c.contype = 'f'
        AND c.confdeltype = 'c'
        AND pg_get_constraintdef(c.oid) LIKE '%auth.users%'
    ) THEN
      RAISE EXCEPTION '% is missing ON DELETE CASCADE to auth.users', rel;
    END IF;
  END LOOP;

  IF (
    SELECT count(*)
    FROM pg_constraint
    WHERE conname IN (
      'guest_claim_tokens_anonymous_user_id_fkey',
      'guest_claim_tokens_claimed_owner_id_fkey'
    )
      AND confdeltype = 'c'
  ) IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'guest claim tokens are not both ON DELETE CASCADE';
  END IF;

  IF has_function_privilege('authenticated', 'public.purge_user_owned_rows(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute purge_user_owned_rows';
  END IF;
  IF has_function_privilege('anon', 'public.purge_user_owned_rows(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute purge_user_owned_rows';
  END IF;

  PERFORM public.purge_user_owned_rows('aa000001-0000-0000-0000-000000000001');

  IF EXISTS (
    SELECT 1 FROM public.guest_claim_tokens
    WHERE token IN (
      'aa000001-0000-0000-0000-0000000000a1',
      'aa000001-0000-0000-0000-0000000000a2'
    )
  ) THEN
    RAISE EXCEPTION 'purge left claim tokens for the deleted user';
  END IF;
  IF (SELECT count(*) FROM public.meal_records WHERE food_name = '删号午饭') IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'purge removed a cascaded meal before the auth user was deleted';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guest_claim_tokens WHERE token = 'aa000001-0000-0000-0000-0000000000a3'
  ) THEN
    RAISE EXCEPTION 'purge removed another user''s claim token';
  END IF;
END $$;

DELETE FROM auth.users WHERE id = 'aa000001-0000-0000-0000-000000000001';
DELETE FROM auth.users WHERE id = 'aa000001-0000-0000-0000-000000000003';
DELETE FROM auth.users WHERE id = 'aa000001-0000-0000-0000-000000000004';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = 'aa000001-0000-0000-0000-000000000001')
    OR EXISTS (SELECT 1 FROM public.meal_records WHERE user_id = 'aa000001-0000-0000-0000-000000000001')
    OR EXISTS (SELECT 1 FROM public.meal_analyses WHERE user_id = 'aa000001-0000-0000-0000-000000000001')
    OR EXISTS (SELECT 1 FROM public.ai_usage WHERE user_id = 'aa000001-0000-0000-0000-000000000001')
    OR EXISTS (SELECT 1 FROM public.meal_feedbacks WHERE user_id = 'aa000001-0000-0000-0000-000000000001')
    OR EXISTS (SELECT 1 FROM public.habit_patterns WHERE user_id = 'aa000001-0000-0000-0000-000000000001')
    OR EXISTS (
      SELECT 1 FROM public.guest_claim_tokens
      WHERE anonymous_user_id = 'aa000001-0000-0000-0000-000000000001'
         OR claimed_owner_id = 'aa000001-0000-0000-0000-000000000001'
         OR token IN (
           'aa000001-0000-0000-0000-0000000000a4',
           'aa000001-0000-0000-0000-0000000000a5'
         )
    )
  THEN
    RAISE EXCEPTION 'account deletion left user-owned rows';
  END IF;
  IF (SELECT food_name FROM public.meal_records WHERE user_id = 'aa000001-0000-0000-0000-000000000002') IS DISTINCT FROM '保留午饭' THEN
    RAISE EXCEPTION 'another user''s meal was deleted';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.guest_claim_tokens WHERE token = 'aa000001-0000-0000-0000-0000000000a3'
  ) THEN
    RAISE EXCEPTION 'unrelated claim token was deleted';
  END IF;
END $$;
