-- Founder decisions of 28 Nov 2026 (D056): three settings, no money moves.
-- vat_on_service_fee is a money setting (D037: a second super admin to change it); off, so no VAT line
-- appears on prices or PDFs. company_postal_address and support_phone start empty: PDFs show no postal
-- address and Help shows no Call button until a super admin fills them in (Settings, X21).
insert into public.settings (key, value, is_money, description) values
  ('vat_on_service_fee', 'false', true, 'Add 7.5% VAT to the service fee on prices and PDFs (off until the founder decides).'),
  ('company_postal_address', '""', false, 'Freight Africa''s postal address on PDFs; empty shows none.'),
  ('support_phone', '""', false, 'Support phone number for the Call button in Help; empty hides the button.')
on conflict (key) do nothing;
