
ALTER TABLE public.user_profiles
ADD COLUMN health_conditions text[] DEFAULT '{}';

COMMENT ON COLUMN public.user_profiles.health_conditions IS 'Array of health conditions from medical reports, e.g. high_uric_acid, high_blood_sugar';
