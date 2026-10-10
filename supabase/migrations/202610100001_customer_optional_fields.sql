begin;

-- Keep empty strings instead of nulls so existing customer search and snapshots remain compatible.
alter table public.customers
  drop constraint customers_company_name_check,
  drop constraint customers_email_check,
  drop constraint customers_address_check,
  alter column company_name set default '',
  alter column email set default '',
  alter column address set default '',
  add constraint customers_company_name_check check (char_length(btrim(company_name)) between 0 and 150),
  add constraint customers_email_check check (char_length(btrim(email)) = 0 or char_length(btrim(email)) between 3 and 254),
  add constraint customers_address_check check (char_length(btrim(address)) between 0 and 1000);

notify pgrst, 'reload schema';
commit;
