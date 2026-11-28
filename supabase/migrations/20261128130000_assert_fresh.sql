-- O17c Change bank account (closing brief §2): the payout account changes only after a fresh check (D044,
-- SECURITY.md §3). The new account itself is added by the server with the service key (add_bank_account,
-- which disables the old one, starts the 24-hour hold and alerts the owner); this lets the server ask the
-- database, as the signed-in person, whether this session passed a fresh check in the last 15 minutes.
create function public.assert_fresh() returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not private.fresh_ok() then
    raise exception 'a fresh check is needed' using errcode = '28000';
  end if;
end;
$$;
revoke all on function public.assert_fresh() from public, anon;
grant execute on function public.assert_fresh() to authenticated;
