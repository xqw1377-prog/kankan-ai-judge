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
  claim_token uuid;
  claimed jsonb;
  replay jsonb;
  same_user jsonb;
  owner uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  anon uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
BEGIN
  claim_token := public.issue_guest_claim_token(anon);
  claimed := public.claim_guest_meals(owner, claim_token);
  IF claimed->>'status' IS DISTINCT FROM 'claimed' THEN
    RAISE EXCEPTION 'claim should succeed, got %', claimed;
  END IF;
  IF (SELECT user_id FROM public.meal_records WHERE food_name = '试用午饭') IS DISTINCT FROM owner THEN
    RAISE EXCEPTION 'meal stayed on the anonymous user';
  END IF;
  IF (SELECT user_id FROM public.meal_analyses WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff') IS DISTINCT FROM owner THEN
    RAISE EXCEPTION 'analysis stayed on the anonymous user';
  END IF;
  IF (SELECT idempotency_key FROM public.meal_analyses WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff') IS NOT NULL THEN
    RAISE EXCEPTION 'claim should clear the guest replay hash';
  END IF;
  IF (SELECT t.claimed_owner_id FROM public.guest_claim_tokens AS t WHERE t.token = claim_token) IS DISTINCT FROM owner THEN
    RAISE EXCEPTION 'claim should bind claimed_owner_id, got %', claimed;
  END IF;

  -- lost-response replay: same owner succeeds, a different owner is denied
  replay := public.claim_guest_meals(owner, claim_token);
  IF replay->>'status' IS DISTINCT FROM 'claimed' OR replay->>'idempotent' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'same owner lost-response replay should succeed, got %', replay;
  END IF;
  IF (SELECT count(*) FROM public.meal_records WHERE food_name = '试用午饭') IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'lost-response replay duplicated a meal';
  END IF;

  INSERT INTO auth.users (id) VALUES ('12121212-1212-1212-1212-121212121212')
  ON CONFLICT (id) DO NOTHING;
  IF public.claim_guest_meals('12121212-1212-1212-1212-121212121212', claim_token)->>'status' IS DISTINCT FROM 'denied' THEN
    RAISE EXCEPTION 'different owner should be denied';
  END IF;
  IF (SELECT user_id FROM public.meal_records WHERE food_name = '试用午饭') IS DISTINCT FROM owner THEN
    RAISE EXCEPTION 'denied owner took the meal';
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

  -- two anonymous users, same image hash, both claimable into one account
  INSERT INTO auth.users (id) VALUES
    ('13131313-1313-1313-1313-131313131313'),
    ('14141414-1414-1414-1414-141414141414')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.meal_analyses (
    id, user_id, food_name, calories, protein_g, fat_g, carbs_g, ingredients, verdict, suggestion, idempotency_key
  ) VALUES
    ('15151515-1515-1515-1515-151515151515', '13131313-1313-1313-1313-131313131313', '同图甲', 110, 1, 1, 1, '[]'::jsonb, '可以。', '正常吃。', 'same-image-hash'),
    ('16161616-1616-1616-1616-161616161616', '14141414-1414-1414-1414-141414141414', '同图乙', 120, 1, 1, 1, '[]'::jsonb, '可以。', '正常吃。', 'same-image-hash');
  IF public.claim_guest_meals(owner, public.issue_guest_claim_token('13131313-1313-1313-1313-131313131313'))->>'status' IS DISTINCT FROM 'claimed' THEN
    RAISE EXCEPTION 'first same-hash guest should be claimable';
  END IF;
  IF public.claim_guest_meals(owner, public.issue_guest_claim_token('14141414-1414-1414-1414-141414141414'))->>'status' IS DISTINCT FROM 'claimed' THEN
    RAISE EXCEPTION 'two anonymous users with the same image hash should both be claimable';
  END IF;
  IF (SELECT count(*) FROM public.meal_analyses WHERE id IN ('15151515-1515-1515-1515-151515151515', '16161616-1616-1616-1616-161616161616') AND user_id = owner AND idempotency_key IS NULL) IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'both same-hash analyses should belong to the owner with a cleared replay key';
  END IF;
END $$;
