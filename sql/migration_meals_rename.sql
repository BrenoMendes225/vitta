-- Migração para evitar colunas reservadas em meals
ALTER TABLE public.meals RENAME COLUMN IF EXISTS text TO description;
ALTER TABLE public.meals RENAME COLUMN IF EXISTS type TO meal_type;
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS photo_id text;
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS thumb text;
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS meal_type text;
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS description text;
NOTIFY pgrst, 'reload schema';
