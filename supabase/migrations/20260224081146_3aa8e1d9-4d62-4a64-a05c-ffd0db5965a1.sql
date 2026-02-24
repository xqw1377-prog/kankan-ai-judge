
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS nickname text,
ADD COLUMN IF NOT EXISTS avatar_url text;
