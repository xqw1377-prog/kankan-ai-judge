-- Record which model produced an analysis, and that the numeric contract passed.
-- Uncertainty is a caveat, not a measured confidence score.

ALTER TABLE public.meal_analyses
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS validation_status text,
  ADD COLUMN IF NOT EXISTS uncertainty text;
