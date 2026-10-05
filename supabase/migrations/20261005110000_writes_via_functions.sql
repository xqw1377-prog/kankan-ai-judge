-- Client roles can read their own rows. Writes go through edge functions
-- that set user_id from the verified JWT.

CREATE TABLE IF NOT EXISTS public.meal_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  calories integer NOT NULL,
  protein_g numeric(6,1) NOT NULL,
  fat_g numeric(6,1) NOT NULL,
  carbs_g numeric(6,1) NOT NULL,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  verdict text,
  suggestion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);

ALTER TABLE public.meal_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_analyses FORCE ROW LEVEL SECURITY;

CREATE POLICY meal_analyses_select ON public.meal_analyses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

GRANT SELECT ON public.meal_analyses TO authenticated;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('user_profiles', 'meal_records', 'meal_feedbacks', 'habit_patterns')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.user_profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.meal_records FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.meal_feedbacks FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.habit_patterns FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.meal_records FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.meal_feedbacks FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.habit_patterns FROM anon;
