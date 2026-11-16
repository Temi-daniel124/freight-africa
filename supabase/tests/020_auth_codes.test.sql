begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

-- Only the server may count codes.
set local role anon;
select throws_ok($$select public.auth_code_sending('k-anon-0000000000001', 'ip-a')$$, '42501', null, 'anon cannot start a code');
select throws_ok($$select public.auth_code_failed('k-anon-0000000000001')$$, '42501', null, 'anon cannot record a wrong code');
reset role;

set local role authenticated;
select throws_ok($$select public.auth_code_sending('k-auth-0000000000001', 'ip-a')$$, '42501', null, 'authenticated cannot start a code');
select throws_ok($$select public.auth_code_open('k-auth-0000000000001')$$, '42501', null, 'authenticated cannot read the count');
select throws_ok($$select public.auth_code_passed('k-auth-0000000000001')$$, '42501', null, 'authenticated cannot clear the count');
select throws_ok('select * from private.auth_code_attempts', '42501', null, 'authenticated cannot read the attempts table');
reset role;

set local role service_role;

-- Sending: 5 codes an hour per person.
select ok(public.auth_code_sending('k-ngozi-000000000001', 'ip-a'), 'first code');
select ok(public.auth_code_sending('k-ngozi-000000000001', 'ip-a') and public.auth_code_sending('k-ngozi-000000000001', 'ip-a')
  and public.auth_code_sending('k-ngozi-000000000001', 'ip-a') and public.auth_code_sending('k-ngozi-000000000001', 'ip-a'), 'codes two to five');
select ok(not public.auth_code_sending('k-ngozi-000000000001', 'ip-a'), 'the sixth code in the hour is refused');
select ok(public.auth_code_sending('k-musa-0000000000001', 'ip-a'), 'another person is not affected');

-- One internet address: 60 codes an hour, whoever they are for (7 used above).
select ok((select bool_and(public.auth_code_sending('k-many-' || lpad(n::text, 12, '0'), 'ip-a')) from generate_series(1, 53) n), 'codes 8 to 60 from one address');
select ok(not public.auth_code_sending('k-extra-000000000001', 'ip-a'), 'the 61st code from one address is refused');
select ok(public.auth_code_sending('k-extra-000000000001', 'ip-b'), 'the same person from another address is fine');

-- Wrong tries: 5 per code.
select ok(public.auth_code_open('k-musa-0000000000001'), 'a fresh code is open');
select is(public.auth_code_failed('k-musa-0000000000001'), 4, 'one wrong try leaves 4');
select is(public.auth_code_failed('k-musa-0000000000001'), 3, 'two wrong tries leave 3');
select is(public.auth_code_failed('k-musa-0000000000001'), 2, 'three wrong tries leave 2');
select is(public.auth_code_failed('k-musa-0000000000001'), 1, 'four wrong tries leave 1');
select ok(public.auth_code_open('k-musa-0000000000001'), 'still open with one try left');
select is(public.auth_code_failed('k-musa-0000000000001'), 0, 'the fifth wrong try leaves none');
select ok(not public.auth_code_open('k-musa-0000000000001'), 'after 5 wrong tries the code is closed');
select ok(public.auth_code_sending('k-musa-0000000000001', 'ip-b'), 'a new code can be sent');
select ok(public.auth_code_open('k-musa-0000000000001'), 'and the new code is open again');

-- A right code clears the count.
select is(public.auth_code_failed('k-musa-0000000000001'), 4, 'a wrong try on the new code');
select lives_ok($$select public.auth_code_passed('k-musa-0000000000001')$$,'a right code clears the count');
select ok(public.auth_code_open('k-musa-0000000000001'), 'after a right code nothing is left counting');

reset role;

select * from finish();
rollback;
