-- ============================================================================
--  Signup collects only email + password — the nickname is asked in the
--  first-login onboarding sheet. So don't guess display_name from the email;
--  leave it NULL (only use a name if an OAuth provider supplies one).
-- ============================================================================

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
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;
