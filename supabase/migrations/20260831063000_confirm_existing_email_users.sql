-- Email confirmation was disabled after this account was created. Confirm only
-- the explicitly authorized account, identified by a one-way SHA-256 email hash.
do $$
declare
  changed_count integer;
begin
  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now()), confirmation_token = ''
  where encode(extensions.digest(lower(email), 'sha256'), 'hex') =
    'c7ecb651d7c653c203f4bf10a62d08a1807701cbe7924ccb45f47d0f71229b49';

  get diagnostics changed_count = row_count;
  if changed_count <> 1 then
    raise exception 'Expected exactly one authorized account, changed %', changed_count;
  end if;
  raise notice 'Confirmed the explicitly authorized email account';
end;
$$;
