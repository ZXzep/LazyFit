-- ============================================================================
--  Per-user accent theme (chosen in Settings). 'lime' is the original look.
-- ============================================================================

alter table public.profiles
  add column if not exists theme text not null default 'lime';
