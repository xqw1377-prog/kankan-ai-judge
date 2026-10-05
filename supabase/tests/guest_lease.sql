-- A crashed guest lease can be reclaimed after two minutes when no analysis was stored.
-- The reclaimed lease has a new id and generation. The old request cannot
-- release, complete, or store against that newer lease.

INSERT INTO auth.users (id) VALUES ('99999999-9999-9999-9999-999999999999')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  uid uuid := '99999999-9999-9999-9999-999999999999';
  first_status jsonb;
  second_status jsonb;
  reclaimed_status jsonb;
  after_analysis jsonb;
  stale_store jsonb;
  fresh_store jsonb;
  old_lease uuid;
  new_lease uuid;
BEGIN
  DELETE FROM public.meal_analyses WHERE user_id = uid;
  DELETE FROM public.ai_usage WHERE user_id = uid;

  first_status := public.reserve_guest_food_slot(uid);
  IF first_status->>'status' IS DISTINCT FROM 'reserved' THEN
    RAISE EXCEPTION 'first lease should be reserved, got %', first_status;
  END IF;
  IF first_status->>'lease_id' IS NULL OR (first_status->>'generation')::bigint IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'first lease should return a lease id and generation 1, got %', first_status;
  END IF;
  old_lease := (first_status->>'lease_id')::uuid;

  second_status := public.reserve_guest_food_slot(uid);
  IF second_status->>'status' IS DISTINCT FROM 'taken' OR second_status->>'lease_id' IS NOT NULL THEN
    RAISE EXCEPTION 'fresh lease should stay taken and not hand out the lease id, got %', second_status;
  END IF;
  IF (SELECT lease_id FROM public.ai_usage WHERE user_id = uid AND kind = 'guest_success') IS DISTINCT FROM old_lease THEN
    RAISE EXCEPTION 'overlapping reserve rotated a live lease';
  END IF;

  UPDATE public.ai_usage
  SET created_at = now() - interval '3 minutes', status = 'reserved'
  WHERE user_id = uid AND kind = 'guest_success';

  reclaimed_status := public.reserve_guest_food_slot(uid);
  IF reclaimed_status->>'status' IS DISTINCT FROM 'reclaimed' THEN
    RAISE EXCEPTION 'stale lease without an analysis should be reclaimed, got %', reclaimed_status;
  END IF;
  IF reclaimed_status->>'lease_id' IS NULL OR (reclaimed_status->>'generation')::bigint IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'reclaim should return generation 2, got %', reclaimed_status;
  END IF;
  new_lease := (reclaimed_status->>'lease_id')::uuid;
  IF new_lease = old_lease THEN
    RAISE EXCEPTION 'reclaim reused the old lease id';
  END IF;

  -- overlapping old-request/new-request
  IF public.complete_guest_food_slot(uid, old_lease) THEN
    RAISE EXCEPTION 'overlapping old request completed a newer lease';
  END IF;
  IF public.release_guest_food_slot(uid, old_lease) THEN
    RAISE EXCEPTION 'overlapping old request released a newer lease';
  END IF;
  IF (SELECT lease_id FROM public.ai_usage WHERE user_id = uid AND kind = 'guest_success') IS DISTINCT FROM new_lease THEN
    RAISE EXCEPTION 'stale release removed the newer lease';
  END IF;
  IF (SELECT status FROM public.ai_usage WHERE user_id = uid AND kind = 'guest_success') IS DISTINCT FROM 'reserved' THEN
    RAISE EXCEPTION 'stale complete changed the newer lease';
  END IF;

  stale_store := public.store_guest_analysis_with_lease(
    uid, old_lease, '旧请求', 80, 1, 1, 1,
    '[]'::jsonb, '可以。', '正常吃。', 'test', 'test-model', 'visual', 'old-request'
  );
  IF stale_store->>'status' IS DISTINCT FROM 'stale_lease' THEN
    RAISE EXCEPTION 'overlapping old request stored against a newer lease, got %', stale_store;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meal_analyses WHERE user_id = uid AND food_name = '旧请求') THEN
    RAISE EXCEPTION 'stale lease inserted an analysis';
  END IF;
  IF (SELECT status FROM public.ai_usage WHERE user_id = uid AND kind = 'guest_success') IS DISTINCT FROM 'reserved' THEN
    RAISE EXCEPTION 'stale store completed the newer lease';
  END IF;

  fresh_store := public.store_guest_analysis_with_lease(
    uid, new_lease, '新请求', 90, 1, 1, 1,
    '[]'::jsonb, '可以。', '正常吃。', 'test', 'test-model', 'visual', 'new-request'
  );
  IF fresh_store->>'status' IS DISTINCT FROM 'stored' OR fresh_store->>'id' IS NULL THEN
    RAISE EXCEPTION 'matching lease should store and complete, got %', fresh_store;
  END IF;
  IF (SELECT status FROM public.ai_usage WHERE user_id = uid AND kind = 'guest_success') IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'stored analysis left the lease reserved';
  END IF;
  IF public.complete_guest_food_slot(uid, old_lease) THEN
    RAISE EXCEPTION 'stale holder completed the lease after the new request stored';
  END IF;
  IF public.release_guest_food_slot(uid, old_lease) THEN
    RAISE EXCEPTION 'stale holder released the lease after the new request stored';
  END IF;

  DELETE FROM public.meal_analyses WHERE user_id = uid;
  DELETE FROM public.ai_usage WHERE user_id = uid;
  INSERT INTO public.meal_analyses (
    user_id, food_name, calories, protein_g, fat_g, carbs_g, ingredients, verdict, suggestion, idempotency_key
  ) VALUES (
    uid, '试用', 100, 1, 1, 1, '[]'::jsonb, '可以。', '正常吃。', 'same-photo'
  );
  INSERT INTO public.ai_usage (user_id, kind, status, created_at, lease_id, lease_generation)
  VALUES (uid, 'guest_success', 'reserved', now() - interval '3 minutes', gen_random_uuid(), 4);

  after_analysis := public.reserve_guest_food_slot(uid);
  IF after_analysis->>'status' IS DISTINCT FROM 'taken' OR after_analysis->>'lease_id' IS NOT NULL THEN
    RAISE EXCEPTION 'a stored analysis must not be reclaimed, got %', after_analysis;
  END IF;

  IF has_function_privilege('authenticated', 'public.reserve_guest_food_slot(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute reserve_guest_food_slot';
  END IF;
  IF has_function_privilege('authenticated', 'public.release_guest_food_slot(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute release_guest_food_slot';
  END IF;
  IF has_function_privilege('authenticated', 'public.complete_guest_food_slot(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute complete_guest_food_slot';
  END IF;
  IF has_function_privilege('anon', 'public.store_guest_analysis_with_lease(uuid, uuid, text, integer, numeric, numeric, numeric, jsonb, text, text, text, text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute store_guest_analysis_with_lease';
  END IF;
  IF has_function_privilege('authenticated', 'public.store_guest_analysis_with_lease(uuid, uuid, text, integer, numeric, numeric, numeric, jsonb, text, text, text, text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute store_guest_analysis_with_lease';
  END IF;
END $$;
