-- Review of 20261125190000: my_staff_role() must keep meaning "is this person staff at all". Several
-- deny-for-staff checks rely on it (a staff member can't use a user's backup code to drop the
-- authenticator, can't turn two-step off in Settings, and must reach aal2 before the app opens).
-- Returning nothing while locked made a locked staff member look like a user to those checks.
create or replace function public.my_staff_role() returns public.staff_role language sql stable security definer set search_path = '' as $$
  select s.role from public.staff_members s where s.user_id = (select auth.uid()) and s.active;
$$;

-- The lock goes into the session's assurance level instead: while locked, a session counts as aal1
-- wherever our database checks for aal2, however it got there.
create function private.session_aal() returns text language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from private.two_step_locks l where l.user_id = (select auth.uid())) then 'aal1'
    else coalesce((select auth.jwt() ->> 'aal'), '')
  end;
$$;
revoke all on function private.session_aal() from public;

-- Every function that reads the aal claim directly (the money, trip and backup-code functions) is
-- rewritten to read private.session_aal() instead. Their bodies are otherwise unchanged.
do $$
declare
  f record;
  v_def text;
begin
  for f in
    select p.oid, n.nspname, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
      and p.proname <> 'session_aal'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and pg_get_functiondef(p.oid) like '%auth.jwt() ->> ''aal''%'
  loop
    v_def := pg_get_functiondef(f.oid);
    v_def := replace(v_def, 'coalesce((select auth.jwt() ->> ''aal''), '''')', '(select private.session_aal())');
    v_def := replace(v_def, 'coalesce((SELECT (auth.jwt() ->> ''aal''::text)), ''''::text)', '(select private.session_aal())');
    if v_def like '%auth.jwt() ->> ''aal''%' then
      raise exception 'could not rewrite the aal check in %.%', f.nspname, f.proname;
    end if;
    execute v_def;
  end loop;
end;
$$;
