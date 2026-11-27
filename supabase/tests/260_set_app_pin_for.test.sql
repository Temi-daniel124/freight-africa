begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('26262626-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chiamaka@freight-africa.com', now(), '{"full_name": "Chiamaka Okafor"}', now(), now());

-- Only our server (the service key) may call it; never the browser.
select is(has_function_privilege('authenticated', 'public.set_app_pin_for(uuid, text)', 'execute'), false, 'a signed-in browser cannot call set_app_pin_for');
select is(has_function_privilege('anon', 'public.set_app_pin_for(uuid, text)', 'execute'), false, 'a visitor cannot call set_app_pin_for');
select is(has_function_privilege('service_role', 'public.set_app_pin_for(uuid, text)', 'execute'), true, 'the server can');

select throws_ok($$select public.set_app_pin_for('26262626-0000-4000-8000-000000000001', '123456')$$, '22023', null, 'a weak PIN is refused');
select throws_ok($$select public.set_app_pin_for(gen_random_uuid(), '480157')$$, 'P0002', null, 'an unknown person is refused');

select lives_ok($$select public.set_app_pin_for('26262626-0000-4000-8000-000000000001', '480157')$$, 'a good PIN is saved');

-- Replacing it clears a lockout.
update private.app_pins set failed = 5 where user_id = '26262626-0000-4000-8000-000000000001';
select public.set_app_pin_for('26262626-0000-4000-8000-000000000001', '730194');
select is((select failed from private.app_pins where user_id = '26262626-0000-4000-8000-000000000001'), 0, 'a new PIN clears the wrong tries');

select * from finish();
rollback;
