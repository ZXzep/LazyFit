-- ============================================================================
--  Onboarding fields — collected in the welcome sheet, used to compute
--  daily_calorie_target (Mifflin-St Jeor BMR × activity × goal).
-- ============================================================================

alter table public.profiles
  add column if not exists sex             text     check (sex in ('male', 'female')),
  add column if not exists birth_year      smallint check (birth_year between 1920 and 2018),
  add column if not exists activity_level  text     not null default 'light'
    check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  add column if not exists goal            text     not null default 'lose'
    check (goal in ('lose', 'maintain', 'gain')),
  add column if not exists onboarded_at    timestamptz;

comment on column public.profiles.onboarded_at is 'Set when the welcome sheet is completed; NULL = show onboarding.';
