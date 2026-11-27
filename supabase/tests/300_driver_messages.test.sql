begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- Cast: Musa Haulage with its owner (Musa Danladi), an Admin (Zainab) and a driver (Musa Ibrahim);
-- another business (Emeka Transport) with its own driver (Obi).
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('30303030-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'musa@musahaulage.ng', now(), '{"full_name": "Musa Danladi"}', now(), now()),
  ('30303030-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zainab@musahaulage.ng', now(), '{"full_name": "Zainab Ali"}', now(), now()),
  ('30303030-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@musahaulage.ng', now(), '{"full_name": "Musa Ibrahim"}', now(), now()),
  ('30303030-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'obi@emeka.ng', now(), '{"full_name": "Obi Eze"}', now(), now());
insert into public.organizations (id, kind, name, tier) values
  ('30303030-0000-4000-8000-0000000000b1', 'transporter', 'Musa Haulage Ltd', 'gold'),
  ('30303030-0000-4000-8000-0000000000b2', 'transporter', 'Emeka Transport', 'new');
insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values
  ('30303030-0000-4000-8000-0000000000b1', '30303030-0000-4000-8000-000000000001', 'owner', false),
  ('30303030-0000-4000-8000-0000000000b1', '30303030-0000-4000-8000-000000000002', 'manager', false),
  ('30303030-0000-4000-8000-0000000000b1', '30303030-0000-4000-8000-000000000003', 'driver', true),
  ('30303030-0000-4000-8000-0000000000b2', '30303030-0000-4000-8000-000000000004', 'driver', true);
insert into public.drivers (user_id, org_id, status) values
  ('30303030-0000-4000-8000-000000000003', '30303030-0000-4000-8000-0000000000b1', 'active'),
  ('30303030-0000-4000-8000-000000000004', '30303030-0000-4000-8000-0000000000b2', 'active')
on conflict (user_id) do update set org_id = excluded.org_id, status = 'active';

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;

set local role authenticated;
-- The driver messages their owner.
select set_config('request.jwt.claims', '{"sub": "30303030-0000-4000-8000-000000000003", "role": "authenticated"}', true);
insert into ids select 'msg', public.send_driver_message('30303030-0000-4000-8000-0000000000b1', 'repair', 'Front tyre is cut. I am at Lokoja, safe.');
select is((select reason::text from public.driver_messages where id = (select id from ids where name = 'msg')), 'repair', 'a driver sends a message with a reason');
select throws_ok($$select public.send_driver_message('30303030-0000-4000-8000-0000000000b2', 'other', 'hello')$$, '42501', null, 'only to their own business');
select throws_ok($$select public.send_driver_message('30303030-0000-4000-8000-0000000000b1', 'other', 'x', '30303030-0000-4000-8000-0000000000b1/30303030-0000-4000-8000-000000000004/30303030-0000-4000-8000-00000000ffff.webm', 4)$$, '42501', null, 'a voice note must be in their own folder');
select throws_ok($$select public.reply_driver_message((select id from ids where name = 'msg'), 'ok')$$, '42501', null, 'a driver can''t reply to themselves');
reset role;
select is((select count(*)::int from public.notifications where event = 'fleet.driver_message' and user_id in ('30303030-0000-4000-8000-000000000001', '30303030-0000-4000-8000-000000000002') and channel = 'in_app'), 2,
  'the owner and the Admin hear about it in the app');

-- A driver who isn't active can't send; another business's Admin can't reply.
reset role;
update public.drivers set status = 'banned' where user_id = '30303030-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30303030-0000-4000-8000-000000000004", "role": "authenticated"}', true);
select throws_ok($$select public.send_driver_message('30303030-0000-4000-8000-0000000000b2', 'other', 'hello')$$, '42501', null, 'a banned driver can''t send');
select set_config('request.jwt.claims', '{"sub": "30303030-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select throws_ok($$select public.send_driver_message('30303030-0000-4000-8000-0000000000b1', 'other', '   ')$$, '22023', null, 'a message has words or a voice note');
select throws_ok($$select public.send_driver_message('30303030-0000-4000-8000-0000000000b1', 'other', 'listen', '30303030-0000-4000-8000-0000000000b1/30303030-0000-4000-8000-000000000003/30303030-0000-4000-8000-00000000ffff.webm', 4)$$, '22023', null, 'a voice note must have uploaded');

-- Another business's driver sees nothing.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30303030-0000-4000-8000-000000000004", "role": "authenticated"}', true);
select is((select count(*)::int from public.driver_messages), 0, 'another driver sees no messages');

-- The Admin reads and replies; the reply reaches the driver's Notifications.
select set_config('request.jwt.claims', '{"sub": "30303030-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is((select count(*)::int from public.driver_messages), 1, 'the Admin sees the business''s messages');
select lives_ok($$select public.read_driver_message((select id from ids where name = 'msg'))$$, 'and marks one read');
select lives_ok($$select public.reply_driver_message((select id from ids where name = 'msg'), 'Stay with the truck. Sending a mechanic.')$$, 'and replies');
select throws_ok($$select public.reply_driver_message((select id from ids where name = 'msg'), '   ')$$, '22023', 'write a reply', 'a reply has words');
reset role;
select is((select count(*)::int from public.notifications where event = 'fleet.owner_reply' and user_id = '30303030-0000-4000-8000-000000000003' and channel = 'in_app'), 1,
  'the driver gets the reply in Notifications');

-- The driver sees their message with the reply, and can't write to the table directly.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30303030-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is((select reply from public.driver_messages where id = (select id from ids where name = 'msg')), 'Stay with the truck. Sending a mechanic.', 'the driver reads the reply');
select throws_ok($$update public.driver_messages set reply = 'mine' where id = (select id from ids where name = 'msg')$$, '42501', null, 'and can''t change it');

select * from finish();
rollback;
