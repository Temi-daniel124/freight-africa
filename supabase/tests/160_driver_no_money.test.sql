begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- BUILD.md Phase 2: a driver can't see any money table (D003), even in a business with money in it.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('f3f3f3f3-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@example.com', now(), '{"full_name": "Ibrahim Musa"}', now(), now()),
  ('f3f3f3f3-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sani@example.com', now(), '{"full_name": "Sani Abubakar"}', now(), now());
insert into public.organizations (id, kind, name, tier) values ('a4a4a4a4-0000-4000-8000-000000000001', 'transporter', 'Musa Haulage Ltd', 'new');
insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values
  ('a4a4a4a4-0000-4000-8000-000000000001', 'f3f3f3f3-0000-4000-8000-000000000001', 'owner', false),
  ('a4a4a4a4-0000-4000-8000-000000000001', 'f3f3f3f3-0000-4000-8000-000000000002', 'driver', true);
set local role service_role;
select public.add_bank_account('f3f3f3f3-0000-4000-8000-000000000001', 'a4a4a4a4-0000-4000-8000-000000000001', '058', 'GTBank', '0123456789', 'IBRAHIM MUSA', 100);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f3f3f3f3-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is((select count(*)::int from public.bank_accounts), 0, 'a driver sees no bank account');
select is((select count(*)::int from public.ledger_accounts), 0, 'no ledger account');
select is((select count(*)::int from public.ledger_entries), 0, 'no ledger entry');
select is((select count(*)::int from public.approvals), 0, 'no money approval');
select ok(not public.can_in_org('a4a4a4a4-0000-4000-8000-000000000001', 'see_money'), 'and the app''s money rights say no (D003)');

select * from finish();
rollback;
