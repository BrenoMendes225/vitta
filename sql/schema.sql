-- Vitta Supabase schema
-- Run in Supabase SQL editor

-- Profiles linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  birth_date date,
  height numeric,
  onboarding_concluido boolean default false,
  onboarding_concluido_at timestamptz,
  created_at timestamptz default now()
);

-- Weights
create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  kg numeric,
  note text,
  photo_id text,
  created_at timestamptz default now()
);

-- Measurements
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  chest numeric,
  waist numeric,
  hip numeric,
  arm numeric,
  thigh numeric,
  note text,
  created_at timestamptz default now()
);

-- Meals
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  time time,
  type text,
  text text,
  kcal numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  comment text,
  confidence text,
  photo_id text,
  thumb text,
  created_at timestamptz default now()
);

-- Workouts
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  type text,
  minutes numeric,
  note text,
  created_at timestamptz default now()
);

-- Symptoms
create table if not exists public.symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  data jsonb,
  note text,
  created_at timestamptz default now()
);

-- Injections
create table if not exists public.injections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  dose text,
  site text,
  note text,
  created_at timestamptz default now()
);

-- Settings
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Photos
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  kind text,
  url text,
  note text,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.weights enable row level security;
alter table public.measurements enable row level security;
alter table public.meals enable row level security;
alter table public.workouts enable row level security;
alter table public.symptoms enable row level security;
alter table public.injections enable row level security;
alter table public.settings enable row level security;
alter table public.photos enable row level security;

-- Policies
create policy "user can manage own profiles" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "user can manage own weights" on public.weights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user can manage own measurements" on public.measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user can manage own meals" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user can manage own workouts" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user can manage own symptoms" on public.symptoms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user can manage own injections" on public.injections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user can manage own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user can manage own photos" on public.photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
