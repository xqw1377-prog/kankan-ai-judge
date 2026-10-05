ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS lease_id uuid,
  ADD COLUMN IF NOT EXISTS lease_generation bigint;

DROP FUNCTION IF EXISTS public.reserve_guest_food_slot(uuid);
DROP FUNCTION IF EXISTS public.release_guest_food_slot(uuid);
DROP FUNCTION IF EXISTS public.release_guest_food_slot(uuid, uuid);
DROP FUNCTION IF EXISTS public.complete_guest_food_slot(uuid);
DROP FUNCTION IF EXISTS public.complete_guest_food_slot(uuid, uuid);
DROP FUNCTION IF EXISTS public.store_guest_analysis_with_lease(uuid, uuid, text, integer, numeric, numeric, numeric, jsonb, text, text, text, text, text, text);

CREATE FUNCTION public.reserve_guest_food_slot(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot public.ai_usage%ROWTYPE;
  issued uuid;
  generation bigint;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'lease_id', NULL, 'generation', NULL);
  END IF;

  IF EXISTS (SELECT 1 FROM public.meal_analyses WHERE user_id = p_user_id) THEN
    UPDATE public.ai_usage
    SET status = 'completed'
    WHERE user_id = p_user_id AND kind = 'guest_success' AND status IS DISTINCT FROM 'completed';
    RETURN jsonb_build_object('status', 'taken', 'lease_id', NULL, 'generation', NULL);
  END IF;

  SELECT * INTO slot
  FROM public.ai_usage
  WHERE user_id = p_user_id AND kind = 'guest_success'
  FOR UPDATE;

  IF NOT FOUND THEN
    BEGIN
      issued := gen_random_uuid();
      INSERT INTO public.ai_usage (user_id, kind, status, lease_id, lease_generation)
      VALUES (p_user_id, 'guest_success', 'reserved', issued, 1);
      RETURN jsonb_build_object('status', 'reserved', 'lease_id', issued, 'generation', 1);
    EXCEPTION WHEN unique_violation THEN
      SELECT * INTO slot
      FROM public.ai_usage
      WHERE user_id = p_user_id AND kind = 'guest_success'
      FOR UPDATE;
    END;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'lease_id', NULL, 'generation', NULL);
  END IF;

  IF slot.status IS DISTINCT FROM 'reserved' THEN
    RETURN jsonb_build_object('status', 'taken', 'lease_id', NULL, 'generation', NULL);
  END IF;

  IF slot.created_at <= now() - interval '2 minutes' THEN
    issued := gen_random_uuid();
    generation := COALESCE(slot.lease_generation, 0) + 1;
    UPDATE public.ai_usage
    SET created_at = now(),
        status = 'reserved',
        lease_id = issued,
        lease_generation = generation
    WHERE id = slot.id;
    RETURN jsonb_build_object('status', 'reclaimed', 'lease_id', issued, 'generation', generation);
  END IF;

  RETURN jsonb_build_object('status', 'taken', 'lease_id', NULL, 'generation', NULL);
END;
$$;

CREATE FUNCTION public.release_guest_food_slot(p_user_id uuid, p_lease_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer := 0;
BEGIN
  IF p_user_id IS NULL OR p_lease_id IS NULL THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meal_analyses WHERE user_id = p_user_id) THEN
    RETURN false;
  END IF;
  DELETE FROM public.ai_usage
  WHERE user_id = p_user_id
    AND kind = 'guest_success'
    AND status = 'reserved'
    AND lease_id = p_lease_id;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed = 1;
END;
$$;

CREATE FUNCTION public.complete_guest_food_slot(p_user_id uuid, p_lease_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated integer := 0;
BEGIN
  IF p_user_id IS NULL OR p_lease_id IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.ai_usage
  SET status = 'completed'
  WHERE user_id = p_user_id
    AND kind = 'guest_success'
    AND status = 'reserved'
    AND lease_id = p_lease_id;
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated = 1;
END;
$$;

CREATE FUNCTION public.store_guest_analysis_with_lease(
  p_user_id uuid,
  p_lease_id uuid,
  p_food_name text,
  p_calories integer,
  p_protein_g numeric,
  p_fat_g numeric,
  p_carbs_g numeric,
  p_ingredients jsonb,
  p_verdict text,
  p_suggestion text,
  p_provider text,
  p_model text,
  p_uncertainty text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot public.ai_usage%ROWTYPE;
  new_id uuid;
  reused boolean := false;
  updated integer := 0;
  v_key text := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
BEGIN
  IF p_user_id IS NULL OR p_lease_id IS NULL THEN
    RETURN jsonb_build_object('status', 'stale_lease');
  END IF;

  SELECT * INTO slot
  FROM public.ai_usage
  WHERE user_id = p_user_id AND kind = 'guest_success'
  FOR UPDATE;

  IF NOT FOUND OR slot.lease_id IS DISTINCT FROM p_lease_id OR slot.status IS DISTINCT FROM 'reserved' THEN
    RETURN jsonb_build_object('status', 'stale_lease');
  END IF;

  BEGIN
    INSERT INTO public.meal_analyses (
      user_id, food_name, calories, protein_g, fat_g, carbs_g, ingredients,
      verdict, suggestion, provider, model, validation_status, uncertainty, idempotency_key
    ) VALUES (
      p_user_id, p_food_name, p_calories, p_protein_g, p_fat_g, p_carbs_g,
      COALESCE(p_ingredients, '[]'::jsonb),
      p_verdict, p_suggestion, p_provider, p_model, 'passed', p_uncertainty, v_key
    )
    RETURNING id INTO new_id;
  EXCEPTION WHEN unique_violation THEN
    reused := true;
    SELECT id INTO new_id
    FROM public.meal_analyses
    WHERE user_id = p_user_id AND idempotency_key = v_key;
    IF new_id IS NULL THEN
      RETURN jsonb_build_object('status', 'error');
    END IF;
  END;

  UPDATE public.ai_usage
  SET status = 'completed'
  WHERE id = slot.id AND lease_id = p_lease_id AND status = 'reserved';
  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated <> 1 THEN
    RAISE EXCEPTION 'lease lost during store';
  END IF;

  RETURN jsonb_build_object('status', 'stored', 'id', new_id, 'reused', reused);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_guest_food_slot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_guest_food_slot(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.reserve_guest_food_slot(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.release_guest_food_slot(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_guest_food_slot(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.release_guest_food_slot(uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.complete_guest_food_slot(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_guest_food_slot(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.complete_guest_food_slot(uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.store_guest_analysis_with_lease(uuid, uuid, text, integer, numeric, numeric, numeric, jsonb, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_guest_analysis_with_lease(uuid, uuid, text, integer, numeric, numeric, numeric, jsonb, text, text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.store_guest_analysis_with_lease(uuid, uuid, text, integer, numeric, numeric, numeric, jsonb, text, text, text, text, text, text) FROM authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.reserve_guest_food_slot(uuid) TO service_role;
    GRANT EXECUTE ON FUNCTION public.release_guest_food_slot(uuid, uuid) TO service_role;
    GRANT EXECUTE ON FUNCTION public.complete_guest_food_slot(uuid, uuid) TO service_role;
    GRANT EXECUTE ON FUNCTION public.store_guest_analysis_with_lease(uuid, uuid, text, integer, numeric, numeric, numeric, jsonb, text, text, text, text, text, text) TO service_role;
  END IF;
END $$;