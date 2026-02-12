
-- User profiles (for onboarding data)
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  age INTEGER,
  height_cm INTEGER,
  weight_kg INTEGER,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'high', 'extreme')),
  goal TEXT CHECK (goal IN ('fat_loss', 'muscle_gain', 'sugar_control', 'maintain')),
  diet_preference TEXT,
  cooking_source TEXT,
  allergies TEXT,
  tdee INTEGER,
  target_calories INTEGER,
  target_protein_g INTEGER,
  target_fat_g INTEGER,
  target_carbs_g INTEGER,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meal records
CREATE TABLE public.meal_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  food_name TEXT NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  calories INTEGER NOT NULL DEFAULT 0,
  protein_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  fat_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  ingredients JSONB DEFAULT '[]'::jsonb,
  verdict TEXT,
  suggestion TEXT,
  image_url TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_records ENABLE ROW LEVEL SECURITY;

-- For MVP without auth, allow all access (will tighten with auth later)
CREATE POLICY "Allow all access to user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to meal_records" ON public.meal_records FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_meal_records_device_id ON public.meal_records(device_id);
CREATE INDEX idx_meal_records_recorded_at ON public.meal_records(recorded_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meal_records_updated_at
  BEFORE UPDATE ON public.meal_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
