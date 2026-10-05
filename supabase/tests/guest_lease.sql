-- A crashed guest lease can be reclaimed after two minutes when no analysis was stored.
-- A fresh lease, or any stored analysis, cannot be analysed again.

INSERT INTO auth.users (id) VALUES ('99999999-9999-9999-9999-999999999999')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  uid uuid := '99999999-9999-9999-9999-999999999999';
  first_status text;
  second_status text;
  reclaimed_status text;
  after_analysis text;
BEGIN
  DELETE FROM public.meal_analyses WHERE user_id = uid;
  DELETE FROM public.ai_usage WHERE user_id = uid;

  first_status := public.reserve_guest_food_slot(uid);
  IF first_status IS DISTINCT FROM 'reserved' THEN
    RAISE EXCEPTION 'first lease should be reserved, got %', first_status;
  END IF;

  second_status := public.reserve_guest_food_slot(uid);
  IF second_status IS DISTINCT FROM 'taken' THEN
    RAISE EXCEPTION 'fresh lease should stay taken, got %', second_status;
  END IF;

  UPDATE public.ai_usage
  SET created_at = now() - interval '3 minutes', status = 'reserved'
  WHERE user_id = uid AND kind = 'guest_success';

  reclaimed_status := public.reserve_guest_food_slot(uid);
  IF reclaimed_status IS DISTINCT FROM 'reclaimed' THEN
    RAISE EXCEPTION 'stale lease without an analysis should be reclaimed, got %', reclaimed_status;
  END IF;

  INSERT INTO public.meal_analyses (
    user_id, food_name, calories, protein_g, fat_g, carbs_g, ingredients, verdict, suggestion, idempotency_key
  ) VALUES (
    uid, '试用', 100, 1, 1, 1, '[]'::jsonb, '可以。', '正常吃。', 'same-photo'
  );
  UPDATE public.ai_usage
  SET created_at = now() - interval '3 minutes', status = 'reserved'
  WHERE user_id = uid AND kind = 'guest_success';

  after_analysis := public.reserve_guest_food_slot(uid);
  IF after_analysis IS DISTINCT FROM 'taken' THEN
    RAISE EXCEPTION 'a stored analysis must not be reclaimed, got %', after_analysis;
  END IF;

  IF has_function_privilege('authenticated', 'public.reserve_guest_food_slot(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute reserve_guest_food_slot';
  END IF;
END $$;
