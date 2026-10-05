-- A guest_success row can be a short lease (reserved) or a finished trial (completed).
-- A lease older than 2 minutes with no stored analysis can be reclaimed.
-- These functions run only as service_role after the edge function has verified auth.uid().

ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS status text;

UPDATE public.ai_usage
  SET status = 'completed'
  WHERE kind = 'guest_success' AND status IS NULL;

CREATE OR REPLACE FUNCTION public.reserve_guest_food_slot(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot public.ai_usage%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'error';
  END IF;

  IF EXISTS (SELECT 1 FROM public.meal_analyses WHERE user_id = p_user_id) THEN
    UPDATE public.ai_usage
    SET status = 'completed'
    WHERE user_id = p_user_id AND kind = 'guest_success';
    RETURN 'taken';
  END IF;

  SELECT * INTO slot
  FROM public.ai_usage
  WHERE user_id = p_user_id AND kind = 'guest_success'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.ai_usage (user_id, kind, status)
    VALUES (p_user_id, 'guest_success', 'reserved');
    RETURN 'reserved';
  END IF;

  IF slot.status IS DISTINCT FROM 'reserved' THEN
    RETURN 'taken';
  END IF;

  IF slot.created_at <= now() - interval '2 minutes' THEN
    UPDATE public.ai_usage
    SET created_at = now(), status = 'reserved'
    WHERE id = slot.id;
    RETURN 'reclaimed';
  END IF;

  RETURN 'taken';
END;
$$;

CREATE OR REPLACE FUNCTION public.release_guest_food_slot(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meal_analyses WHERE user_id = p_user_id) THEN
    UPDATE public.ai_usage
    SET status = 'completed'
    WHERE user_id = p_user_id AND kind = 'guest_success';
    RETURN;
  END IF;
  DELETE FROM public.ai_usage
  WHERE user_id = p_user_id AND kind = 'guest_success' AND status = 'reserved';
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_guest_food_slot(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.ai_usage
  SET status = 'completed'
  WHERE user_id = p_user_id AND kind = 'guest_success';
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_guest_food_slot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_guest_food_slot(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.reserve_guest_food_slot(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.release_guest_food_slot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_guest_food_slot(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.release_guest_food_slot(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.complete_guest_food_slot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_guest_food_slot(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.complete_guest_food_slot(uuid) FROM authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.reserve_guest_food_slot(uuid) TO service_role;
    GRANT EXECUTE ON FUNCTION public.release_guest_food_slot(uuid) TO service_role;
    GRANT EXECUTE ON FUNCTION public.complete_guest_food_slot(uuid) TO service_role;
  END IF;
END $$;
