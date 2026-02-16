
-- Fix RLS policies to use device_id pattern matching existing tables
DROP POLICY IF EXISTS "Users can read own feedbacks" ON public.meal_feedbacks;
DROP POLICY IF EXISTS "Users can insert own feedbacks" ON public.meal_feedbacks;
DROP POLICY IF EXISTS "Users can read own patterns" ON public.habit_patterns;
DROP POLICY IF EXISTS "Users can insert own patterns" ON public.habit_patterns;
DROP POLICY IF EXISTS "Users can update own patterns" ON public.habit_patterns;

-- meal_feedbacks: public read (device filters in app), public insert
CREATE POLICY "Anyone can read feedbacks" ON public.meal_feedbacks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert feedbacks" ON public.meal_feedbacks FOR INSERT WITH CHECK (true);

-- habit_patterns: same pattern as meal_records
CREATE POLICY "Anyone can read patterns" ON public.habit_patterns FOR SELECT USING (true);
CREATE POLICY "Anyone can insert patterns" ON public.habit_patterns FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update patterns" ON public.habit_patterns FOR UPDATE USING (true);
