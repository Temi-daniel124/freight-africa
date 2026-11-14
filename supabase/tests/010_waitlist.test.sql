begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- Locked down
select ok(
  (select relrowsecurity from pg_class where oid = 'public.waitlist_signups'::regclass),
  'RLS is on for waitlist_signups'
);
select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'waitlist_signups'),
  0,
  'waitlist_signups has no policies'
);

set local role anon;
select throws_ok('select * from public.waitlist_signups', '42501', null, 'anon cannot read the waitlist');
select throws_ok(
  $$insert into public.waitlist_signups (name, phone, role, consent_at) values ('Ngozi Okafor', '+2348031234567', 'shipper', now())$$,
  '42501', null, 'anon cannot write to the waitlist'
);
select throws_ok(
  $$select public.join_waitlist('Ngozi Okafor', '+2348031234567', null, 'shipper', '{}', null, 'website', 'ip-a')$$,
  '42501', null, 'anon cannot call join_waitlist'
);
reset role;

set local role authenticated;
select throws_ok('select * from public.waitlist_signups', '42501', null, 'authenticated cannot read the waitlist');
select throws_ok(
  $$insert into public.waitlist_signups (name, phone, role, consent_at) values ('Ngozi Okafor', '+2348031234567', 'shipper', now())$$,
  '42501', null, 'authenticated cannot write to the waitlist'
);
select throws_ok(
  $$select public.join_waitlist('Ngozi Okafor', '+2348031234567', null, 'shipper', '{}', null, 'website', 'ip-a')$$,
  '42501', null, 'authenticated cannot call join_waitlist'
);
reset role;

-- The server (service_role) path
set local role service_role;
select is(
  public.join_waitlist('Ngozi Okafor', '+2348031234567', ' Ngozi@Example.com ', 'shipper', '{lagos-kano}', null, 'website', 'ip-a'),
  'joined', 'a new phone joins'
);
select is(
  public.join_waitlist('Ngozi Okafor', '+2348031234567', null, 'shipper', '{}', null, 'website', 'ip-a'),
  'duplicate', 'the same phone again is reported as a duplicate'
);
select is(
  (select email from public.waitlist_signups where phone = '+2348031234567'),
  'ngozi@example.com', 'email is trimmed and lower-cased'
);
select is(public.join_waitlist('Musa Ibrahim', '+2348051234567', null, 'owner', '{}', 3, 'website', 'ip-a'), 'joined', 'third request from one IP');
select is(public.join_waitlist('Chioma Eze', '+2348061234567', null, 'agent', '{}', null, 'website', 'ip-a'), 'joined', 'fourth request from one IP');
select is(public.join_waitlist('Tunde Bello', '+2348071234567', null, 'shipper', '{}', null, 'website', 'ip-a'), 'joined', 'fifth request from one IP');
select is(
  public.join_waitlist('Aisha Musa', '+2348081234567', null, 'shipper', '{}', null, 'website', 'ip-a'),
  'rate_limited', 'the sixth request from one IP in an hour is refused'
);
select throws_ok(
  $$select public.join_waitlist('Emeka Obi', '+2349031234567', null, 'shipper', '{}', 4, 'website', 'ip-b')$$,
  '23514', null, 'only truck owners can give a number of trucks'
);
select throws_ok('select * from private.rate_limits', '42501', null, 'the server cannot read the rate limit table directly');
reset role;

select * from finish();

rollback;
