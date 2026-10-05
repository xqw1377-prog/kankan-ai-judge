-- G0: rows belong to auth.uid(), not a shared device_id bucket.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.meal_records
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.meal_feedbacks
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.habit_patterns
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_profiles ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE public.meal_records ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE public.meal_feedbacks ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE public.habit_patterns ALTER COLUMN device_id DROP NOT NULL;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
CREATE INDEX IF NOT EXISTS meal_records_user_id_idx ON public.meal_records(user_id);
CREATE INDEX IF NOT EXISTS meal_feedbacks_user_id_idx ON public.meal_feedbacks(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS habit_patterns_user_name_uidx
  ON public.habit_patterns(user_id, original_name);

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx ON public.ai_usage(user_id, created_at DESC);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage FORCE ROW LEVEL SECURITY;

-- Drop every open policy on the personal tables, including USING (true).
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('user_profiles', 'meal_records', 'meal_feedbacks', 'habit_patterns', 'ai_usage')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.meal_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.meal_feedbacks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.habit_patterns FORCE ROW LEVEL SECURITY;

CREATE POLICY user_profiles_select ON public.user_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_profiles_insert ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_profiles_update ON public.user_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_profiles_delete ON public.user_profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY meal_records_select ON public.meal_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY meal_records_insert ON public.meal_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY meal_records_update ON public.meal_records
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY meal_records_delete ON public.meal_records
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY meal_feedbacks_select ON public.meal_feedbacks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY meal_feedbacks_insert ON public.meal_feedbacks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY meal_feedbacks_update ON public.meal_feedbacks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY meal_feedbacks_delete ON public.meal_feedbacks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY habit_patterns_select ON public.habit_patterns
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY habit_patterns_insert ON public.habit_patterns
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY habit_patterns_update ON public.habit_patterns
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY habit_patterns_delete ON public.habit_patterns
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY ai_usage_select ON public.ai_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ai_usage_insert ON public.ai_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_feedbacks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_patterns TO authenticated;
GRANT SELECT, INSERT ON public.ai_usage TO authenticated;
