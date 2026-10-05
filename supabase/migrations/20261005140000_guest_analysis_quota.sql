-- One completed anonymous food analysis per user.
-- Hourly rate-limit rows stay kind = call. guest_success is written only after a real analysis is stored.
-- RLS is unchanged: auth.uid() = user_id. Anonymous sign-ins use the authenticated role.

ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'call';

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_one_guest_success
  ON public.ai_usage (user_id)
  WHERE kind = 'guest_success';
