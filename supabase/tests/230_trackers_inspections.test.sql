begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('23232323-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@musahaulage.ng', now(), '{"full_name": "Ibrahim Musa"}', now(), now()),
  ('23232323-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kemi@freight-africa.com', now(), '{"full_name": "Kemi Balogun"}', now(), now()),
  ('23232323-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tayo@freight-africa.com', now(), '{"full_name": "Tayo Adewale"}', now(), now());
insert into public.organizations (id, kind, name) values ('23232323-0000-4000-8000-0000000000b1', 'transporter', 'Musa Haulage Ltd');
insert into public.organization_members (org_id, user_id, transporter_role) values ('23232323-0000-4000-8000-0000000000b1', '23232323-0000-4000-8000-000000000001', 'owner');
insert into public.trucks (id, org_id, plate_number, truck_type_id, capacity_kg, status) values
  ('23232323-0000-4000-8000-0000000000c1', '23232323-0000-4000-8000-0000000000b1', 'KAN123XY', (select id from public.truck_types where code = 'flatbed_30t'), 30000, 'pending_review');
insert into public.staff_members (user_id, role) values ('23232323-0000-4000-8000-000000000002', 'verification'), ('23232323-0000-4000-8000-000000000003', 'field_agent');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "23232323-0000-4000-8000-000000000001", "role": "authenticated"}', true);
create temp table keys (k text);
grant all on keys to authenticated, service_role;
insert into keys select public.set_truck_tracker('23232323-0000-4000-8000-0000000000c1', '86-1234-5678-901');
select ok((select char_length(k) from keys) = 36, 'the owner connects a tracker and gets its key once');
reset role;
set local role service_role;
select is(public.tracker_ping((select k from keys), 6.6018, 3.3515, now()), true, 'its position arrives with the key');
select is(public.tracker_ping('8612345678901', 6.6, 3.3, now()), false, 'the IMEI alone moves nothing (no spoofing)');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "23232323-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select ok((select lat from public.truck_signal('23232323-0000-4000-8000-0000000000c1')) between 6.6 and 6.61, 'Test connection shows where the signal came from');
select throws_ok($$select public.tracker_ping('0123456789abcdef0123456789abcdef0123', 1, 1, now())$$, '42501', null, 'the browser can never send positions');

select set_config('request.jwt.claims', '{"sub": "23232323-0000-4000-8000-000000000002", "role": "authenticated", "aal": "aal2"}', true);
create temp table task_ids (id uuid);
grant all on task_ids to authenticated;
insert into task_ids select public.create_inspection('23232323-0000-4000-8000-0000000000c1', '23232323-0000-4000-8000-000000000003', now() + interval '1 day');
select is((select count(*)::int from public.field_tasks), 1, 'verification sends a field agent');

select set_config('request.jwt.claims', '{"sub": "23232323-0000-4000-8000-000000000003", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok($$select public.complete_inspection((select id from task_ids), '{}', '{}', false, '')$$, '22023', null, 'a problem needs a reason');
select lives_ok($$select public.complete_inspection((select id from task_ids), '{"plate_matches": true, "roadworthy": false}', '{}', false, 'Front tyres worn')$$, 'the agent reports a problem');
reset role;
select like((select review_note from public.trucks where id = '23232323-0000-4000-8000-0000000000c1'), 'Field inspection: Front tyres worn', 'verification sees it on the truck');

select * from finish();
rollback;
