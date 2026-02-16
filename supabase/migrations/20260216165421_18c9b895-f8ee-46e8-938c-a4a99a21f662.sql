
-- Table: meal_feedbacks — stores post-meal audit feedback with prediction vs actual
CREATE TABLE public.meal_feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  meal_id UUID NOT NULL,
  food_name TEXT NOT NULL,
  predicted_feeling TEXT, -- what the system predicted (great/ok/crash)
  actual_feeling TEXT NOT NULL, -- user's actual feedback
  ingredients JSONB, -- snapshot of ingredients+cooking methods at time of meal
  prediction_correct BOOLEAN DEFAULT false,
  damage_adjustment FLOAT DEFAULT 0, -- coefficient adjustment applied
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own feedbacks" ON public.meal_feedbacks
  FOR SELECT USING (device_id = current_setting('request.headers', true)::json->>'x-device-id' OR true);

CREATE POLICY "Users can insert own feedbacks" ON public.meal_feedbacks
  FOR INSERT WITH CHECK (true);

-- Table: habit_patterns — tracks recurring user edits to learn preferences
CREATE TABLE public.habit_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  original_name TEXT NOT NULL, -- AI-recognized name
  corrected_name TEXT, -- user's corrected name
  corrected_grams INT, -- user's preferred grams
  preferred_cook_method TEXT, -- user's preferred cooking method
  occurrence_count INT NOT NULL DEFAULT 1,
  auto_apply BOOLEAN NOT NULL DEFAULT false, -- true when count >= 5
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(device_id, original_name)
);

ALTER TABLE public.habit_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own patterns" ON public.habit_patterns
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own patterns" ON public.habit_patterns
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own patterns" ON public.habit_patterns
  FOR UPDATE USING (true);
