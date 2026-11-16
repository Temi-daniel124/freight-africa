begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

set local role anon;
select throws_ok($$select public.auth_code_try('k-anon-0000000000001')$$, '42501', null, 'anon cannot count a try');
reset role;

set local role authenticated;
select throws_ok($$select public.auth_code_try('k-auth-0000000000001')$$, '42501', null, 'authenticated cannot count a try');
select throws_ok($$select public.auth_code_refund('k-auth-0000000000001')$$, '42501', null, 'authenticated cannot give a try back');
reset role;

set local role service_role;

-- Five tries a code, counted before the code is checked.
select ok(public.auth_code_sending('k-ngozi-000000000001', 'ip-a'), 'a code is sent');
select is(public.auth_code_try('k-ngozi-000000000001'), 4, 'first try leaves 4');
select is(public.auth_code_try('k-ngozi-000000000001'), 3, 'second try leaves 3');
select is(public.auth_code_try('k-ngozi-000000000001'), 2, 'third try leaves 2');
select is(public.auth_code_try('k-ngozi-000000000001'), 1, 'fourth try leaves 1');
select is(public.auth_code_try('k-ngozi-000000000001'), 0, 'fifth try leaves none');
select is(public.auth_code_try('k-ngozi-000000000001'), -1, 'a sixth try is refused');
select is(public.auth_code_try('k-ngozi-000000000001'), -1, 'and stays refused');

-- A try that could not be checked is given back.
select lives_ok($$select public.auth_code_refund('k-ngozi-000000000001')$$, 'a try can be given back');
select is(public.auth_code_try('k-ngozi-000000000001'), 0, 'the returned try can be used once');
select is(public.auth_code_try('k-ngozi-000000000001'), -1, 'and no more');

-- A new code starts again; a right code clears the count.
select ok(public.auth_code_sending('k-ngozi-000000000001', 'ip-a'), 'a new code is sent');
select is(public.auth_code_try('k-ngozi-000000000001'), 4, 'the new code has its own five tries');
select lives_ok($$select public.auth_code_passed('k-ngozi-000000000001')$$, 'a right code clears the count');

-- One internet address: 60 codes an hour (2 used above).
select ok((select bool_and(public.auth_code_sending('k-many-' || lpad(n::text, 12, '0'), 'ip-a')) from generate_series(1, 58) n), 'codes 3 to 60 from one address');
select ok(not public.auth_code_sending('k-extra-000000000001', 'ip-a'), 'the 61st code from one address is refused');

reset role;

select * from finish();
rollback;
