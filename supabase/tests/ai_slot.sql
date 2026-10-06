-- Hourly AI slots are atomic: the limit includes every recent ai_usage row,
-- a refused call does not insert, and rows older than an hour do not count.

INSERT INTO auth.users (id) VALUES
  ('bb000001-0000-0000-0000-000000000001'),
  ('bb000001-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT has_function_privilege('authenticated', 'public.consume_hourly_ai_slot(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should execute consume_hourly_ai_slot';
  END IF;
  IF has_function_privilege('anon', 'public.consume_hourly_ai_slot(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon should not execute consume_hourly_ai_slot';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', 'bb000001-0000-0000-0000-000000000001', true);
  INSERT INTO public.ai_usage (user_id, kind, created_at)
  VALUES ('bb000001-0000-0000-0000-000000000001', 'call', now() - interval '2 hours');
  IF public.consume_hourly_ai_slot(1) IS NOT TRUE THEN
    RAISE EXCEPTION 'a row older than an hour should not fill the slot';
  END IF;
  IF public.consume_hourly_ai_slot(1) IS NOT FALSE THEN
    RAISE EXCEPTION 'the second call inside the hour should be refused';
  END IF;
  IF (
    SELECT count(*) FROM public.ai_usage
    WHERE user_id = 'bb000001-0000-0000-0000-000000000001'
      AND kind = 'call'
      AND created_at >= now() - interval '1 hour'
  ) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'a refused slot inserted a row';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', 'bb000001-0000-0000-0000-000000000002', true);
  INSERT INTO public.ai_usage (user_id, kind)
  VALUES ('bb000001-0000-0000-0000-000000000002', 'guest_success');
  IF public.consume_hourly_ai_slot(1) IS NOT FALSE THEN
    RAISE EXCEPTION 'a recent guest_success row should count toward the hourly limit';
  END IF;
  IF (
    SELECT count(*) FROM public.ai_usage
    WHERE user_id = 'bb000001-0000-0000-0000-000000000002' AND kind = 'call'
  ) IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'guest_success should not be turned into an extra call row';
  END IF;
END $$;
