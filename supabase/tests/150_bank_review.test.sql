begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('d1d1d1d1-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@example.com', now(), '{"full_name": "Ibrahim Musa"}', now(), now()),
  ('d1d1d1d1-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ngozi@freight-africa.com', now(), '{"full_name": "Ngozi Eze"}', now(), now()),
  ('d1d1d1d1-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kemi@freight-africa.com', now(), '{"full_name": "Kemi Balogun"}', now(), now());
insert into public.staff_members (user_id, role) values ('d1d1d1d1-0000-4000-8000-000000000002', 'finance'), ('d1d1d1d1-0000-4000-8000-000000000003', 'verification');
insert into public.organizations (id, kind, name, tier) values ('e2e2e2e2-0000-4000-8000-000000000001', 'transporter', 'Musa Haulage Ltd', 'new');
insert into public.organization_members (org_id, user_id, transporter_role) values ('e2e2e2e2-0000-4000-8000-000000000001', 'd1d1d1d1-0000-4000-8000-000000000001', 'owner');
set local role service_role;
select set_config('test.b1', public.add_bank_account('d1d1d1d1-0000-4000-8000-000000000001', 'e2e2e2e2-0000-4000-8000-000000000001', '058', 'GTBank', '0123456789', 'MUSA TRADING', 40)::text, true);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "d1d1d1d1-0000-4000-8000-000000000003", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok(format('select public.decide_bank_account(%L, true)', current_setting('test.b1')), '42501', null, 'verification staff don''t decide bank accounts');
select set_config('request.jwt.claims', '{"sub": "d1d1d1d1-0000-4000-8000-000000000002", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok(format('select public.decide_bank_account(%L, false)', current_setting('test.b1')), '22023', null, 'a rejection needs a reason');
select lives_ok(format('select public.decide_bank_account(%L, true)', current_setting('test.b1')), 'finance approve it');
reset role;
select is((select status from public.bank_accounts where id = current_setting('test.b1')::uuid), 'pending_hold', 'it still waits out its 24 hours');
update public.bank_accounts set usable_from = now() - interval '1 minute' where id = current_setting('test.b1')::uuid;
select is(private.release_bank_holds(), 1, 'the hold job releases it');
select is((select status from public.bank_accounts where id = current_setting('test.b1')::uuid), 'active', 'and payouts can go to it');

select * from finish();
rollback;
