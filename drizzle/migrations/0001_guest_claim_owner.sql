ALTER TABLE public.guest_claim_tokens
  ADD COLUMN IF NOT EXISTS claimed_owner_id uuid;

CREATE OR REPLACE FUNCTION public.claim_guest_meals(p_owner_id uuid, p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claim public.guest_claim_tokens%ROWTYPE;
  moved_meals integer := 0;
  moved_analyses integer := 0;
BEGIN
  IF p_owner_id IS NULL OR p_token IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  SELECT * INTO claim
  FROM public.guest_claim_tokens
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  IF claim.consumed_at IS NOT NULL THEN
    IF claim.claimed_owner_id IS NULL THEN
      RETURN jsonb_build_object('status', 'invalid');
    END IF;
    IF claim.claimed_owner_id = p_owner_id THEN
      RETURN jsonb_build_object(
        'status', 'claimed',
        'meals', 0,
        'analyses', 0,
        'idempotent', true
      );
    END IF;
    RETURN jsonb_build_object('status', 'denied');
  END IF;

  IF claim.anonymous_user_id = p_owner_id THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;
  IF claim.expires_at <= now() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  UPDATE public.meal_records
  SET user_id = p_owner_id
  WHERE user_id = claim.anonymous_user_id;
  GET DIAGNOSTICS moved_meals = ROW_COUNT;

  UPDATE public.meal_analyses
  SET user_id = p_owner_id,
      idempotency_key = NULL
  WHERE user_id = claim.anonymous_user_id;
  GET DIAGNOSTICS moved_analyses = ROW_COUNT;

  UPDATE public.guest_claim_tokens
  SET consumed_at = now(),
      claimed_owner_id = p_owner_id
  WHERE token = claim.token;

  RETURN jsonb_build_object(
    'status', 'claimed',
    'meals', moved_meals,
    'analyses', moved_analyses,
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_guest_meals(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_guest_meals(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_guest_meals(uuid, uuid) FROM authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.claim_guest_meals(uuid, uuid) TO service_role;
  END IF;
END $$;