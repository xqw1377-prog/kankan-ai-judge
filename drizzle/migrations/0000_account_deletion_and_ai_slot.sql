-- Account deletion coverage and an atomic hourly AI slot.
-- Supabase migrations remain the only database source of truth.
--
-- ON DELETE CASCADE already covers user_profiles, meal_records, meal_analyses,
-- ai_usage, meal_feedbacks, and habit_patterns (user_id → auth.users).
-- guest_claim_tokens had no foreign key. Avatar bytes live in
-- user_profiles.avatar_url. Food photos are not stored in a storage bucket.

DELETE FROM public.guest_claim_tokens AS t
WHERE NOT EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = t.anonymous_user_id);

UPDATE public.guest_claim_tokens AS t
SET claimed_owner_id = NULL
WHERE t.claimed_owner_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = t.claimed_owner_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guest_claim_tokens_anonymous_user_id_fkey'
  ) THEN
    ALTER TABLE public.guest_claim_tokens
      ADD CONSTRAINT guest_claim_tokens_anonymous_user_id_fkey
      FOREIGN KEY (anonymous_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guest_claim_tokens_claimed_owner_id_fkey'
  ) THEN
    ALTER TABLE public.guest_claim_tokens
      ADD CONSTRAINT guest_claim_tokens_claimed_owner_id_fkey
      FOREIGN KEY (claimed_owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Explicit clean for rows that were not cascaded before this migration.
-- Called by delete-account after auth.getUser, with the service role only.
CREATE OR REPLACE FUNCTION public.purge_user_owned_rows(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'missing user';
  END IF;
  DELETE FROM public.guest_claim_tokens
  WHERE anonymous_user_id = p_user_id
     OR claimed_owner_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_user_owned_rows(uuid) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.purge_user_owned_rows(uuid) TO service_role;
  END IF;
END $$;

-- One hourly slot per signed-in user, including anonymous users.
-- Counts every ai_usage row in the last hour, then inserts kind = call.
-- Advisory lock closes the count-then-insert race. auth.uid() is the caller.
CREATE OR REPLACE FUNCTION public.consume_hourly_ai_slot(p_limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  n integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'missing user';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'invalid limit';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('kankan.ai_slot'), hashtext(uid::text));
  SELECT count(*)::integer INTO n
  FROM public.ai_usage
  WHERE user_id = uid
    AND created_at >= now() - interval '1 hour';
  IF n >= p_limit THEN
    RETURN false;
  END IF;
  INSERT INTO public.ai_usage (user_id, kind) VALUES (uid, 'call');
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_hourly_ai_slot(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_hourly_ai_slot(integer) TO authenticated;