begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('24242424-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kemi@freight-africa.com', now(), '{"full_name": "Kemi Adeyemi"}', now(), now()),
  ('24242424-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ifeoma@freight-africa.com', now(), '{"full_name": "Ifeoma Eze"}', now(), now());

-- Four wrong codes: still open, and none of them locks it.
do $$ begin perform public.fresh_try('24242424-0000-4000-8000-000000000001') from generate_series(1, 4); end $$;
select is(public.fresh_wrong('24242424-0000-4000-8000-000000000001'), false, 'four wrong codes do not lock two-step sign-in');
select is(public.two_step_locked('24242424-0000-4000-8000-000000000001'), false, 'not locked after four');

-- The fifth wrong code locks it, once.
select is(public.fresh_try('24242424-0000-4000-8000-000000000001'), true, 'the fifth code is still checked');
select is(public.fresh_wrong('24242424-0000-4000-8000-000000000001'), true, 'the fifth wrong code locks it (the alert is sent once)');
select is(public.fresh_wrong('24242424-0000-4000-8000-000000000001'), false, 'and only that one reports it');
select is(public.two_step_locked('24242424-0000-4000-8000-000000000001'), true, 'two-step sign-in is locked');
select is(public.fresh_try('24242424-0000-4000-8000-000000000001'), false, 'no code is checked while it is locked');
select is((select count(*)::int from public.audit_log where action = 'two_step.locked' and row_id = '24242424-0000-4000-8000-000000000001'), 1, 'the lock is in the audit log');

-- A right code can't sneak past the lock as a fresh check.
select throws_ok($$select public.record_fresh_check('24242424-0000-4000-8000-000000000001', gen_random_uuid())$$, '28000', null, 'no fresh check is recorded while locked');

-- Only a confirmed email code clears it.
select lives_ok($$select public.clear_two_step_lock('24242424-0000-4000-8000-000000000001')$$, 'an email code clears the lock');
select is(public.fresh_try('24242424-0000-4000-8000-000000000001'), true, 'then codes are checked again, from zero');

-- A failed check (auth service down) gives its try back.
do $$ begin perform public.fresh_try('24242424-0000-4000-8000-000000000002') from generate_series(1, 5); perform public.fresh_refund('24242424-0000-4000-8000-000000000002'); end $$;
select is(public.fresh_try('24242424-0000-4000-8000-000000000002'), true, 'a refunded try does not count');

-- The browser can reach none of it.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "24242424-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$select public.clear_two_step_lock('24242424-0000-4000-8000-000000000001')$$, '42501', null, 'the browser cannot clear a lock');
select throws_ok($$select public.two_step_locked('24242424-0000-4000-8000-000000000002')$$, '42501', null, 'or ask about one');
reset role;

select * from finish();
rollback;
