begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

-- D037: money settings include time and tier values; a sole super admin approves alone only with a
-- freshly re-entered two-step code, and that is logged.

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('ffffffff-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kemi@freight-africa.com', now(), '{"full_name": "Kemi Adeyemi"}', now(), now()),
  ('ffffffff-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chidi@freight-africa.com', now(), '{"full_name": "Chidi Okeke"}', now(), now());
insert into public.staff_members (user_id, role) values ('ffffffff-0000-4000-8000-000000000001', 'super_admin');

select ok((select bool_and(is_money) from public.settings where key in
  ('auto_release_hours', 'free_waiting_hours', 'tier_established_trips', 'tier_gold_trips', 'tier_gold_rating', 'agent_share_months', 'dispute_window_hours', 'dispute_hold_bps', 'dispute_two_person_kobo')),
  'time, tier, agent share and dispute settings are money settings');
select is((select value from public.settings where key = 'dispute_window_hours'), '48'::jsonb, 'senders have 48 hours to report a problem');
select ok(not (select is_money from public.settings where key = 'max_dropoffs'), 'ordinary settings still change at once');

set local role authenticated;
-- aal2 but the code was verified 20 minutes ago.
select set_config('request.jwt.claims', format('{"sub": "ffffffff-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2", "amr": [{"method": "otp", "timestamp": %s}, {"method": "totp", "timestamp": %s}]}',
  extract(epoch from now())::bigint - 1500, extract(epoch from now())::bigint - 1200), true);
select ok(public.can_self_approve(), 'the only super admin may approve their own request');
select set_config('test.a1', public.change_setting('auto_release_hours', '36', 'Longer for the trial')::text, true);
select ok(current_setting('test.a1') <> '', 'changing auto-release time asks for approval');
select is((select value from public.settings where key = 'auto_release_hours'), '24'::jsonb, 'and does not change yet');
select throws_ok(format('select public.decide_approval(%L, true)', current_setting('test.a1')), '28000', null, 'a stale two-step code is not enough');

-- Code re-entered a minute ago.
select set_config('request.jwt.claims', format('{"sub": "ffffffff-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2", "amr": [{"method": "totp", "timestamp": %s}]}',
  extract(epoch from now())::bigint - 60), true);
select lives_ok(format('select public.decide_approval(%L, true)', current_setting('test.a1')), 'with a fresh code the sole super admin approves');
select is((select value from public.settings where key = 'auto_release_hours'), '36'::jsonb, 'and the setting changes');
reset role;
select ok((select self_approved and approved_by = requested_by from public.approvals where id = current_setting('test.a1')::uuid), 'the approval is marked as decided alone');
select is((select new ->> 'reason' from public.audit_log where action = 'approval_decided_alone' and row_id = current_setting('test.a1')),
  'only super admin; two-step code re-entered', 'the audit log says why one person was enough');

-- Without the code claim at all (aal2 from somewhere else): refused.
set local role authenticated;
select set_config('test.a2', public.change_setting('free_waiting_hours', '5')::text, true);
select set_config('request.jwt.claims', '{"sub": "ffffffff-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok(format('select public.decide_approval(%L, true)', current_setting('test.a2')), '28000', null, 'no verified code, no approval');

-- A second super admin arrives: self-approval stops, even with a fresh code.
reset role;
insert into public.staff_members (user_id, role) values ('ffffffff-0000-4000-8000-000000000002', 'super_admin');
set local role authenticated;
select set_config('request.jwt.claims', format('{"sub": "ffffffff-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2", "amr": [{"method": "totp", "timestamp": %s}]}',
  extract(epoch from now())::bigint - 30), true);
select ok(not public.can_self_approve(), 'with two super admins nobody approves alone');
select throws_ok(format('select public.decide_approval(%L, true)', current_setting('test.a2')), '42501', null, 'the requester is refused even with a fresh code');
reset role;
select throws_ok($$insert into public.approvals (kind, subject_id, payload, requested_by, approved_by) values ('setting_change', 'y', '{}', 'ffffffff-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001')$$,
  '23514', null, 'a row cannot claim the same approver without the decided-alone mark');

select * from finish();
rollback;
