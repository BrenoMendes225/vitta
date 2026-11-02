-- Migração Vitta 2026-11-01: alinhar colunas e schema cache
-- Adiciona colunas faltantes em public.meals
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS photo_id text,
  ADD COLUMN IF NOT EXISTS thumb text;

-- Garante created_at com default
ALTER TABLE public.meals
  ALTER COLUMN created_at SET DEFAULT now();

-- Garante created_at em demais tabelas já existentes
ALTER TABLE public.weights  ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.measurements  ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.injections ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.workouts ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.symptoms ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.photos ALTER COLUMN created_at SET DEFAULT now();

-- RLS já existe, reforça políticas de ownership
-- Garante que cada usuário só acesse suas linhas
DO $$
BEGIN
  -- weights
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='weights' AND policyname='user can manage own weights') THEN
    CREATE POLICY "user can manage own weights" ON public.weights
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Recarrega schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
