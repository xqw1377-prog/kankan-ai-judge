-- An existing account can take the anonymous user's meal once.
-- The token is single-use, and client roles cannot call the functions.

INSERT INTO auth.users (id) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.meal_records (user_id, food_name, calories)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', '试用午饭', 320);

INSERT INTO public.meal_analyses (
  id, user_id, food_name, calories, protein_g, fat_g, carbs_g, ingredients, verdict, suggestion, idempotency_key
) VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '试用午饭',
  320, 10, 8, 40,
  '[]'::jsonb,
  '可以。',
  '正常吃。',
  'trial-key'
);

DO $$
DECLARE
  token uuid;
  claimed jsonb;
  replay jsonb;
  same_user jsonb;
  owner uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  anon uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
BEGIN
  token := public.issue_guest_claim_token(anon);
  claimed := public.claim_guest_meals(owner, token);
  IF claimed->>'status' IS DISTINCT FROM 'claimed' THEN
    RAISE EXCEPTION 'claim should succeed, got %', claimed;
  END IF;
  IF (SELECT user_id FROM public.meal_records WHERE food_name = '试用午饭') IS DISTINCT FROM owner THEN
    RAISE EXCEPTION 'meal stayed on the anonymous user';
  END IF;
  IF (SELECT user_id FROM public.meal_analyses WHERE idempotency_key = 'trial-key') IS DISTINCT FROM owner THEN
    RAISE EXCEPTION 'analysis stayed on the anonymous user';
  END IF;

  replay := public.claim_guest_meals(owner, token);
  IF replay->>'status' IS DISTINCT FROM 'invalid' THEN
    RAISE EXCEPTION 'token should be single-use, got %', replay;
  END IF;

  same_user := public.claim_guest_meals(anon, public.issue_guest_claim_token(anon));
  IF same_user->>'status' IS DISTINCT FROM 'invalid' THEN
    RAISE EXCEPTION 'a user cannot claim their own token, got %', same_user;
  END IF;

  IF has_function_privilege('authenticated', 'public.claim_guest_meals(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute claim_guest_meals';
  END IF;
  IF has_function_privilege('authenticated', 'public.issue_guest_claim_token(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute issue_guest_claim_token';
  END IF;
  IF has_function_privilege('anon', 'public.claim_guest_meals(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute claim_guest_meals';
  END IF;
  IF has_function_privilege('authenticated', 'public.consume_analysis_into_meal(uuid, uuid, text, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute consume_analysis_into_meal';
  END IF;

  INSERT INTO public.meal_records (user_id, food_name, calories)
  VALUES (anon, '过期试用', 100);
  INSERT INTO public.guest_claim_tokens (token, anonymous_user_id, expires_at)
  VALUES ('abababab-abab-abab-abab-abababababab', anon, now() - interval '1 minute');
  IF public.claim_guest_meals(owner, 'abababab-abab-abab-abab-abababababab')->>'status' IS DISTINCT FROM 'expired' THEN
    RAISE EXCEPTION 'expired token should not move meals';
  END IF;
  IF (SELECT user_id FROM public.meal_records WHERE food_name = '过期试用') IS DISTINCT FROM anon THEN
    RAISE EXCEPTION 'expired claim moved a meal';
  END IF;
END $$;
