begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('34034034-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'temi@freight-africa.com', now(), '{"full_name": "Temi Adebayo"}', now(), now()),
  ('34034034-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chinedu@freight-africa.com', now(), '{"full_name": "Chinedu Eze"}', now(), now());
insert into public.staff_members (user_id, role) values
  ('34034034-0000-4000-8000-000000000001', 'super_admin'),
  ('34034034-0000-4000-8000-000000000002', 'finance');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "34034034-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok($$select public.change_setting_reasoned('max_dropoffs', '5', 'ok')$$, '22023', null, 'a setting change needs a reason');
select ok(public.change_setting_reasoned('max_dropoffs', '5', 'Trial with five drops') is null, 'an ordinary setting changes at once');
reset role;
select is((select new ->> 'reason' from public.audit_log where action = 'setting.changed' and row_id = 'max_dropoffs' order by id desc limit 1), 'Trial with five drops', 'the reason is in the audit log');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "34034034-0000-4000-8000-000000000002", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok($$select public.approve_money_out('payout', '34034034-0000-4000-8000-00000000dead', 'Checked the bank details')$$, 'P0002', null, 'approving nothing is an error, not a silent success');
select throws_ok($$select public.approve_money_out('payout', '34034034-0000-4000-8000-00000000dead', 'ok')$$, '22023', null, 'approving money out needs a reason');
-- Inviting a super admin needs a fresh check; finance can't invite at all.
select set_config('request.jwt.claims', '{"sub": "34034034-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok($$select public.invite_staff('new.admin@freight-africa.com', 'super_admin')$$, '28000', null, 'a new super admin needs a fresh check');
select ok(char_length(public.invite_staff('tolu@freight-africa.com', 'support')) = 32, 'a support invite needs none');

select * from finish();
rollback;
