begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, phone, raw_user_meta_data, created_at, updated_at)
values
  ('12121212-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adaeze@okaforfoods.ng', now(), '2348031234567', '{"full_name": "Adaeze Okafor"}', now(), now()),
  ('12121212-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'musa@example.com', now(), null, '{"full_name": "Musa Ibrahim"}', now(), now()),
  ('12121212-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ifeoma@freight-africa.com', now(), null, '{"full_name": "Ifeoma Nwosu"}', now(), now());
insert into public.staff_members (user_id, role) values ('12121212-0000-4000-8000-000000000003', 'super_admin');

-- Link tokens.
select set_config('test.link', private.new_link_token(), true);
select ok(current_setting('test.link') ~ '^[A-Za-z0-9_-]{32}$', 'a link token is 32 URL-safe characters (24 random bytes)');
select isnt(private.new_link_token(), current_setting('test.link'), 'and different every time');
select is(private.link_token_hash(current_setting('test.link')), encode(extensions.digest(current_setting('test.link'), 'sha256'), 'hex'), 'only its SHA-256 is stored');

-- notify(): one row per channel, nowhere-to-send channels left out, in-app rows complete at once.
select is(private.notify('load.funded', 'load.funded', array['whatsapp', 'email', 'in_app']::public.notify_channel[], '{"reference": "FA-7K3Q9"}', '12121212-0000-4000-8000-000000000001'), 3, 'a person with a phone and an email gets WhatsApp, email and in-app');
select is((select to_phone from public.notifications where user_id = '12121212-0000-4000-8000-000000000001' and channel = 'whatsapp'), '+2348031234567', 'the number comes from the profile');
select is((select status::text from public.notifications where user_id = '12121212-0000-4000-8000-000000000001' and channel = 'in_app'), 'delivered', 'an in-app notification is there straight away');
select is(private.notify('load.funded', 'load.funded', array['whatsapp', 'email']::public.notify_channel[], '{}', '12121212-0000-4000-8000-000000000002'), 1, 'someone without a phone gets only the email');
select is(private.notify('trip.link', 'trip.link', array['whatsapp', 'push']::public.notify_channel[], '{}', null, '+2348099990000'), 1, 'a receiver without an account gets WhatsApp, never push');

-- Duplicates and preferences.
select is(private.notify('load.funded', 'load.funded', array['email']::public.notify_channel[], '{}', '12121212-0000-4000-8000-000000000002', null, null, 'load:L1:funded'), 1, 'with a dedupe key the first call queues');
select is(private.notify('load.funded', 'load.funded', array['email']::public.notify_channel[], '{}', '12121212-0000-4000-8000-000000000002', null, null, 'load:L1:funded'), 0, 'and the same call again queues nothing');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "12121212-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select lives_ok($$select public.set_notification_preference('load.new_fitting', 'whatsapp', false)$$, 'a person switches an event off');
select throws_ok($$select public.set_notification_preference('safety.sos', 'whatsapp', false)$$, '22023', null, 'but not a safety message');
reset role;
update public.profiles set phone = '+2348031110002' where id = '12121212-0000-4000-8000-000000000002';
select is(private.notify('load.new_fitting', 'load.new_fitting', array['whatsapp', 'in_app']::public.notify_channel[], '{}', '12121212-0000-4000-8000-000000000002'), 1, 'a switched-off channel is left out');
insert into public.notification_preferences (user_id, event, channel, enabled) values ('12121212-0000-4000-8000-000000000002', 'code.delivery', 'whatsapp', false);
select is(private.notify('code.delivery', 'code.delivery', array['whatsapp']::public.notify_channel[], '{}', '12121212-0000-4000-8000-000000000002'), 1, 'codes are sent even if switched off');

-- The dispatcher claims each row exactly once (BUILD.md Phase 1 acceptance).
delete from public.notifications;
select is(private.notify('system.test', 'system.test', array['email']::public.notify_channel[], '{"reference": "FA-TEST1"}', null, null, 'ops@freight-africa.com'), 1, 'a test notification is queued');
set local role service_role;
select set_config('test.claimed', (select string_agg(id::text, ',') from public.claim_notifications(10)), true);
select is(array_length(string_to_array(current_setting('test.claimed'), ','), 1), 1, 'the dispatcher claims it');
select is((select count(*)::int from public.claim_notifications(10)), 0, 'a second run at the same time gets nothing');
select lives_ok(format($$select public.finish_notification(%L, 'sent', 'msg_1')$$, current_setting('test.claimed')), 'and reports it sent');
select lives_ok(format($$select public.finish_notification(%L, 'failed', null, 'late duplicate report')$$, current_setting('test.claimed')), 'a late duplicate report changes nothing');
reset role;
select is((select status::text || ' ' || attempts from public.notifications where id = current_setting('test.claimed')::uuid), 'sent 1', 'sent once, after one attempt');

-- Retries, then failure and the SMS fallback for WhatsApp.
select private.notify('trip.started', 'trip.started', array['whatsapp']::public.notify_channel[], '{}', null, '+2348099990001');
update public.notifications set attempts = 4 where channel = 'whatsapp' and to_phone = '+2348099990001';
set local role service_role;
select set_config('test.wa', (select id::text from public.claim_notifications(10)), true);
select public.finish_notification(current_setting('test.wa')::uuid, 'failed', null, 'WhatsApp answered 500');
reset role;
select is((select status::text from public.notifications where id = current_setting('test.wa')::uuid), 'failed', 'after five attempts a WhatsApp message fails');
select is((select count(*)::int from public.notifications where fallback_of = current_setting('test.wa')::uuid and channel = 'sms' and status = 'queued'), 1, 'and an SMS is queued in its place');

-- Who can do what.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "12121212-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$select * from public.claim_notifications(10)$$, '42501', null, 'people cannot claim the queue');

-- The cron job is scheduled.
reset role;
select is((select schedule from cron.job where jobname = 'jobs-dispatch'), '* * * * *', 'the dispatcher is called every minute');

select * from finish();
rollback;
