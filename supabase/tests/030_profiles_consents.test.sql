begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

-- Two people, made the way Supabase Auth makes them.
insert into auth.users (id, instance_id, aud, role, email, phone, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'Ngozi.Okafor@Example.com', null, '{"full_name": "Ngozi Okafor"}', now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '2348031234567', '{}', now(), now());

-- Profiles are made by the trigger.
select is((select email from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 'ngozi.okafor@example.com', 'a new account gets a profile with its email in lower case');
select is((select full_name from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 'Ngozi Okafor', 'the name from Google is kept');
select is((select phone from public.profiles where id = '22222222-2222-4222-8222-222222222222'), '+2348031234567', 'a phone account gets its number in E.164');
select is((select kyc_status::text || '/' || status::text || '/' || language::text from public.profiles where id = '22222222-2222-4222-8222-222222222222'), 'not_started/active/en', 'defaults');

-- Sign-up never fails on odd data: a very long name, a phone that isn't a number, an email already taken.
insert into auth.users (id, instance_id, aud, role, email, phone, raw_user_meta_data, is_sso_user, created_at, updated_at)
values
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'musa@example.com', '12', jsonb_build_object('name', repeat('A', 300)), false, now(), now()),
  ('44444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'NGOZI.OKAFOR@EXAMPLE.COM', null, '{}', true, now(), now());
select is((select char_length(full_name) from public.profiles where id = '33333333-3333-4333-8333-333333333333'), 120, 'a very long name is cut to 120 characters');
select is((select phone from public.profiles where id = '33333333-3333-4333-8333-333333333333'), null, 'a phone that is not a real number is left out');
select ok(exists (select 1 from public.profiles where id = '44444444-4444-4444-8444-444444444444'), 'an email that clashes after lower-casing still gets a profile');
select is((select email from public.profiles where id = '44444444-4444-4444-8444-444444444444'), null, 'but without the clashing email');

-- Nobody signed out can see anything.
set local role anon;
select throws_ok('select * from public.profiles', '42501', null, 'anon cannot read profiles');
select throws_ok('select * from public.consents', '42501', null, 'anon cannot read consents');
select throws_ok($$select public.give_onboarding_consents('2026-11-15', false)$$, '42501', null, 'anon cannot give consents');
reset role;

-- Ngozi, signed in.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'she sees one profile');
select is((select id from public.profiles), '11111111-1111-4111-8111-111111111111'::uuid, 'and it is her own');
select is((select count(*)::int from public.profiles where id = '22222222-2222-4222-8222-222222222222'), 0, 'another person''s phone and email are hidden');

select lives_ok($$update public.profiles set full_name = 'Ngozi A. Okafor', language = 'ig' where id = '11111111-1111-4111-8111-111111111111'$$, 'she can change her name and language');
select is((select full_name from public.profiles), 'Ngozi A. Okafor', 'the change is saved');
select throws_ok($$update public.profiles set kyc_status = 'approved' where id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'she cannot mark herself verified');
select throws_ok($$update public.profiles set email = 'other@example.com' where id = '11111111-1111-4111-8111-111111111111'$$, '42501', null, 'she cannot change her verified email directly');
select throws_ok($$update public.profiles set status = 'active' where id = '22222222-2222-4222-8222-222222222222'$$, '42501', null, 'she cannot touch another profile''s status');
with changed as (update public.profiles set full_name = 'Taken' where id = '22222222-2222-4222-8222-222222222222' returning 1)
select is((select count(*)::int from changed), 0, 'and cannot rename another person');
select throws_ok($$insert into public.profiles (id) values (gen_random_uuid())$$, '42501', null, 'she cannot create profiles');

select ok(not public.has_accepted_terms('2026-11-15'), 'before the role step she has not accepted the terms');
select lives_ok($$select public.give_onboarding_consents('2026-11-15', false, 'ip-hash', 'Mozilla/5.0')$$, 'she gives her consents');
select ok(public.has_accepted_terms('2026-11-15'), 'after it she has');
select is((select string_agg(kind::text || '=' || granted::text, ',' order by kind) from public.consents), 'terms=true,privacy=true,whatsapp=true,marketing=false', 'four rows: three required, news declined');
select throws_ok($$insert into public.consents (user_id, kind, version, granted) values ('11111111-1111-4111-8111-111111111111', 'marketing', 'x', true)$$, '42501', null, 'consents are written only through the function');
select throws_ok($$delete from public.consents$$, '42501', null, 'consents cannot be deleted');
reset role;

-- The other person sees none of Ngozi's consents.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}', true);
select is((select count(*)::int from public.consents), 0, 'another person cannot read her consents');
reset role;

select * from finish();
rollback;
