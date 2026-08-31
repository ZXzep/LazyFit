-- Ensure every auth user has exactly one public profile, including accounts
-- created before the trigger reached the remote project.

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
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, display_name)
select
  user_row.id,
  coalesce(
    user_row.raw_user_meta_data ->> 'full_name',
    user_row.raw_user_meta_data ->> 'name'
  )
from auth.users as user_row
on conflict (id) do nothing;
