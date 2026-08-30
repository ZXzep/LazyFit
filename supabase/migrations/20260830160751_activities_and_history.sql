-- ============================================================================
--  Multiple workout activities (built-ins live in code; customs live here)
--  + richer workout rows for the history list / timer.
-- ============================================================================

create table if not exists public.user_activities (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  emoji      text,
  met        numeric(3,1) not null default 4.0 check (met between 1 and 20),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists user_activities_user_idx on public.user_activities (user_id, created_at);

alter table public.user_activities enable row level security;

drop policy if exists "user_activities_select_own" on public.user_activities;
drop policy if exists "user_activities_insert_own" on public.user_activities;
drop policy if exists "user_activities_update_own" on public.user_activities;
drop policy if exists "user_activities_delete_own" on public.user_activities;
create policy "user_activities_select_own" on public.user_activities
  for select using ((select auth.uid()) = user_id);
create policy "user_activities_insert_own" on public.user_activities
  for insert with check ((select auth.uid()) = user_id);
create policy "user_activities_update_own" on public.user_activities
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_activities_delete_own" on public.user_activities
  for delete using ((select auth.uid()) = user_id);

-- workouts: display emoji + allow the timer as a source
alter table public.workouts
  add column if not exists activity_emoji text;

alter table public.workouts drop constraint if exists workouts_source_check;
alter table public.workouts
  add constraint workouts_source_check check (source in ('quick_button', 'timer', 'manual'));
