-- ============================================================================
--  Which built-in activities show in the workout picker (managed in Settings).
--  New users start with just the mini stepper; they enable more themselves.
-- ============================================================================

alter table public.profiles
  add column if not exists activity_keys text[] not null default array['stepper'];
