-- Replay key for a lost guest analysis response, and a one-time claim
-- so an existing account can take the meal stored on an anonymous user.
-- issue/claim run only as service_role after the edge function has verified auth.uid().

ALTER TABLE public.meal_analyses
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS meal_analyses_user_idempotency
  ON public.meal_analyses (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.guest_claim_tokens (
  token uuid PRIMARY KEY,
  anonymous_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  consumed_at timestamptz
);

ALTER TABLE public.guest_claim_tokens
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
UPDATE public.guest_claim_tokens
  SET expires_at = created_at + interval '7 days'
  WHERE expires_at IS NULL;
ALTER TABLE public.guest_claim_tokens
  ALTER COLUMN expires_at SET DEFAULT now() + interval '7 days';
ALTER TABLE public.guest_claim_tokens
  ALTER COLUMN expires_at SET NOT NULL;

ALTER TABLE public.guest_claim_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_claim_tokens FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.issue_guest_claim_token(p_anonymous_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  issued uuid := gen_random_uuid();
BEGIN
  IF p_anonymous_user_id IS NULL THEN
    RAISE EXCEPTION 'missing anonymous user';
  END IF;
  INSERT INTO public.guest_claim_tokens (token, anonymous_user_id)
  VALUES (issued, p_anonymous_user_id);
  RETURN issued;
END;
$$;

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

  IF NOT FOUND OR claim.consumed_at IS NOT NULL OR claim.anonymous_user_id = p_owner_id THEN
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
  SET user_id = p_owner_id
  WHERE user_id = claim.anonymous_user_id;
  GET DIAGNOSTICS moved_analyses = ROW_COUNT;

  UPDATE public.guest_claim_tokens
  SET consumed_at = now()
  WHERE token = claim.token;

  RETURN jsonb_build_object(
    'status', 'claimed',
    'meals', moved_meals,
    'analyses', moved_analyses
  );
END;
$$;

REVOKE ALL ON FUNCTION public.issue_guest_claim_token(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_guest_claim_token(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.issue_guest_claim_token(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_guest_meals(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_guest_meals(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.claim_guest_meals(uuid, uuid) FROM authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.issue_guest_claim_token(uuid) TO service_role;
    GRANT EXECUTE ON FUNCTION public.claim_guest_meals(uuid, uuid) TO service_role;
  END IF;
END $$;
