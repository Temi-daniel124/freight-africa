begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select is((select count(*)::int from public.corridors where active), 4, 'four corridors at launch (D013)');
select is((select name from public.corridors where slug = 'eastern-loop'), 'Port Harcourt ⇄ Aba ⇄ Onitsha ⇄ Enugu', 'the eastern loop');
select is((select count(*)::int from public.cities where is_corridor_hub), 7, 'seven hub cities');
select ok((select extensions.st_distance(a.location, b.location) / 1000 between 700 and 900 from public.cities a, public.cities b where a.slug = 'lagos' and b.slug = 'kano'),
  'cities have real positions (Lagos to Kano is about 800 km in a straight line)');
select ok((select bool_and(not exists (select 1 from public.truck_type_goods tg where tg.goods_category_id = g.id)) from public.goods_categories g where g.is_banned),
  'no truck type carries banned goods');
select ok((select specialist_only from public.goods_categories where code = 'fuel'), 'fuel is for specialists only');
select is((select array_length(required_doc_type_ids, 1) from public.goods_categories where code = 'livestock'), 1, 'livestock needs a vet certificate');
select is((select count(*)::int from public.document_types where applies_to = 'truck' and required and blocks_when_expired), 3, 'three truck papers block a truck when they expire');

set local role anon;
select is((select count(*)::int from public.truck_types), 6, 'anyone can read the truck types');
select throws_ok($$insert into public.cities (slug, name, state, location) values ('ikeja', 'Ikeja', 'Lagos', 'SRID=4326;POINT(3.35 6.6)')$$, '42501', null, 'nobody changes the catalogue from outside');

select * from finish();
rollback;
