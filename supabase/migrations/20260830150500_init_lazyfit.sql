-- ============================================================================
--  LazyFit — initial schema
--  Applied by the Supabase CLI:  supabase db reset  /  supabase db push
--  Guards (if not exists / drop ... if exists) keep it safe to re-run.
-- ============================================================================

create extension if not exists "pgcrypto";        -- gen_random_uuid()

-- ----------------------------------------------------------------------------
--  1. profiles  —  one row per auth user, all "lazy defaults" live here
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                    uuid        primary key references auth.users (id) on delete cascade,
  display_name          text,
  avatar_url            text,
  timezone              text        not null default 'Asia/Bangkok',
  -- a brand-new user never has to configure anything to start using the app
  daily_calorie_target  integer     not null default 1800  check (daily_calorie_target between 800 and 6000),
  weekly_cheat_quota    smallint    not null default 3     check (weekly_cheat_quota between 0 and 21),
  week_starts_on        smallint    not null default 1     check (week_starts_on between 0 and 6),  -- 1 = Monday
  current_weight_kg     numeric(5,2) check (current_weight_kg between 20 and 400),
  goal_weight_kg        numeric(5,2) check (goal_weight_kg between 20 and 400),
  height_cm             numeric(5,1) check (height_cm between 80 and 260),
  stepper_met           numeric(3,1) not null default 4.5,   -- MET value used to estimate mini-stepper burn
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
comment on table public.profiles is 'Per-user settings. Auto-created by handle_new_user() on signup.';

-- ----------------------------------------------------------------------------
--  2. meals  —  every logged meal (mostly from the AI estimator)
-- ----------------------------------------------------------------------------
create table if not exists public.meals (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users (id) on delete cascade,
  eaten_at      timestamptz not null default now(),
  food_name     text        not null,
  calories      integer     not null check (calories >= 0),
  protein_g     numeric(6,1) not null default 0 check (protein_g >= 0),
  carbs_g       numeric(6,1) not null default 0 check (carbs_g   >= 0),
  fat_g         numeric(6,1) not null default 0 check (fat_g     >= 0),
  meal_type     text        not null default 'normal' check (meal_type in ('clean', 'normal', 'cheat')),
  source        text        not null default 'ai_text' check (source in ('ai_text', 'ai_image', 'manual')),
  ai_tip        text,
  ai_confidence numeric(3,2) check (ai_confidence between 0 and 1),
  raw_input     text,        -- what the user typed, or 'photo'
  created_at    timestamptz not null default now()
);
create index if not exists meals_user_eaten_idx on public.meals (user_id, eaten_at desc);
create index if not exists meals_user_cheat_idx  on public.meals (user_id, eaten_at) where meal_type = 'cheat';

-- ----------------------------------------------------------------------------
--  3. workouts  —  one-tap mini-stepper sessions (and manual entries)
-- ----------------------------------------------------------------------------
create table if not exists public.workouts (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  performed_at     timestamptz not null default now(),
  activity         text        not null default 'stepper',
  duration_min     integer     not null check (duration_min > 0 and duration_min <= 600),
  calories_burned  integer     not null check (calories_burned >= 0),
  source           text        not null default 'quick_button' check (source in ('quick_button', 'manual')),
  created_at       timestamptz not null default now()
);
create index if not exists workouts_user_performed_idx on public.workouts (user_id, performed_at desc);

-- ----------------------------------------------------------------------------
--  4. weight_logs  —  at most one entry per user per calendar day
-- ----------------------------------------------------------------------------
create table if not exists public.weight_logs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  logged_on   date        not null default ((now() at time zone 'Asia/Bangkok')::date),
  weight_kg   numeric(5,2) not null check (weight_kg between 20 and 400),
  note        text,
  created_at  timestamptz not null default now(),
  unique (user_id, logged_on)
);
create index if not exists weight_logs_user_day_idx on public.weight_logs (user_id, logged_on desc);

-- ============================================================================
--  Triggers
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile row automatically the moment a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
--  Row Level Security  —  "the owner can do everything, nobody else can"
-- ============================================================================
alter table public.profiles    enable row level security;
alter table public.meals       enable row level security;
alter table public.workouts    enable row level security;
alter table public.weight_logs enable row level security;

-- profiles ---------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- meals / workouts / weight_logs share the exact same owner-only shape --------
do $$
declare
  t text;
begin
  foreach t in array array['meals', 'workouts', 'weight_logs']
  loop
    execute format('drop policy if exists "%1$s_select_own" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$s', t);

    execute format('create policy "%1$s_select_own" on public.%1$s for select using ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s_insert_own" on public.%1$s for insert with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s_update_own" on public.%1$s for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s_delete_own" on public.%1$s for delete using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- ============================================================================
--  Convenience views  (security_invoker => the caller's RLS still applies)
--  Day boundaries respect each user's own timezone.
-- ============================================================================
create or replace view public.v_daily_nutrition
with (security_invoker = true) as
select
  m.user_id,
  (m.eaten_at at time zone p.timezone)::date            as day,
  count(*)::int                                         as meal_count,
  count(*) filter (where m.meal_type = 'cheat')::int    as cheat_count,
  coalesce(sum(m.calories), 0)::int                     as calories_in,
  round(coalesce(sum(m.protein_g), 0), 1)               as protein_g,
  round(coalesce(sum(m.carbs_g),  0), 1)                as carbs_g,
  round(coalesce(sum(m.fat_g),    0), 1)                as fat_g
from public.meals m
join public.profiles p on p.id = m.user_id
group by m.user_id, (m.eaten_at at time zone p.timezone)::date;

create or replace view public.v_daily_burn
with (security_invoker = true) as
select
  w.user_id,
  (w.performed_at at time zone p.timezone)::date        as day,
  coalesce(sum(w.duration_min), 0)::int                 as active_min,
  coalesce(sum(w.calories_burned), 0)::int              as calories_out
from public.workouts w
join public.profiles p on p.id = w.user_id
group by w.user_id, (w.performed_at at time zone p.timezone)::date;

-- ============================================================================
--  RPC: get_week_summary(week_start)  —  one row per day for the dashboard
--  Client:  supabase.rpc('get_week_summary', { p_week_start: '2026-08-25' })
-- ============================================================================
create or replace function public.get_week_summary(p_week_start date)
returns table (
  day          date,
  calories_in  int,
  calories_out int,
  net          int,
  cheat_count  int
)
language sql
stable
security invoker
as $$
  with days as (
    select generate_series(p_week_start::timestamp, (p_week_start + 6)::timestamp, interval '1 day')::date as day
  )
  select
    d.day,
    coalesce(n.calories_in, 0)                                   as calories_in,
    coalesce(b.calories_out, 0)                                  as calories_out,
    coalesce(n.calories_in, 0) - coalesce(b.calories_out, 0)     as net,
    coalesce(n.cheat_count, 0)                                   as cheat_count
  from days d
  left join public.v_daily_nutrition n on n.user_id = (select auth.uid()) and n.day = d.day
  left join public.v_daily_burn      b on b.user_id = (select auth.uid()) and b.day = d.day
  order by d.day;
$$;
