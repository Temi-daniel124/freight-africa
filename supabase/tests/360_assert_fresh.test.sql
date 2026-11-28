-- O17c: public.assert_fresh() passes only for a session the server recorded a fresh check for (D044).
begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('36000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'musa@musahaulage.ng', now(), '{"full_name": "Musa Danladi"}', now(), now());

set local role anon;
select throws_ok($$select public.assert_fresh()$$, '42501', null, 'anonymous callers are refused');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "36000000-0000-4000-8000-000000000001", "role": "authenticated", "session_id": "36000000-0000-4000-8000-0000000000f1"}', true);
select throws_ok($$select public.assert_fresh()$$, '28000', null, 'no fresh check yet: 28000');

reset role;
do $$ begin perform public.record_fresh_check('36000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-0000000000f1'); end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "36000000-0000-4000-8000-000000000001", "role": "authenticated", "session_id": "36000000-0000-4000-8000-0000000000f1"}', true);
select lives_ok($$select public.assert_fresh()$$, 'after the server records a fresh check for this session, it passes');

select set_config('request.jwt.claims', '{"sub": "36000000-0000-4000-8000-000000000001", "role": "authenticated", "session_id": "36000000-0000-4000-8000-0000000000f2"}', true);
select throws_ok($$select public.assert_fresh()$$, '28000', null, 'another session of the same person is not fresh');

reset role;
update private.fresh_checks set at = now() - interval '16 minutes' where user_id = '36000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "36000000-0000-4000-8000-000000000001", "role": "authenticated", "session_id": "36000000-0000-4000-8000-0000000000f1"}', true);
select throws_ok($$select public.assert_fresh()$$, '28000', null, 'a check older than 15 minutes no longer counts');

reset role;
select ok(not has_function_privilege('anon', 'public.assert_fresh()', 'execute'), 'anon has no execute grant');
select ok(has_function_privilege('authenticated', 'public.assert_fresh()', 'execute'), 'authenticated may call it');

select * from finish();
rollback;
