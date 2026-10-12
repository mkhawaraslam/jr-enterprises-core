begin;

do $$
declare missing_tables text[];
begin
  select array_agg('public.' || name order by name) into missing_tables
  from unnest(array['businesses', 'business_asset_cleanup', 'customers', 'products', 'quotations']) as required(name)
  where to_regclass(format('public.%I', name)) is null;
  if missing_tables is not null then
    raise exception using message = 'Sales document prerequisites are missing: ' || array_to_string(missing_tables, ', '),
      hint = 'Use the project configured by NEXT_PUBLIC_SUPABASE_URL. Apply the missing 202610080001 through 202610080006 migrations in order before this migration. Do not rerun migrations already applied.';
  end if;
end;
$$;

create table public.sales_document_counters (
  business_id uuid not null references public.businesses(id) on delete restrict,
  kind text not null check (kind in ('invoice', 'challan')),
  year integer not null check (year between 2000 and 2099),
  last_number integer not null check (last_number > 0),
  primary key (business_id, kind, year)
);

create table public.sales_documents (
  id uuid primary key,
  kind text not null check (kind in ('invoice', 'challan')),
  business_id uuid not null references public.businesses(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  reference text not null,
  date date not null check (date between '2000-01-01' and '2099-12-31'),
  due_date date check (due_date >= date and due_date <= '2099-12-31'),
  customer_reference text not null default '' check (char_length(customer_reference) <= 100),
  delivery_address text not null default '' check (char_length(delivery_address) <= 2000),
  subject text not null default '' check (char_length(subject) <= 500),
  notes text not null default '' check (char_length(notes) <= 5000),
  business_snapshot jsonb not null,
  customer_snapshot jsonb not null,
  layout_id text not null check (layout_id in ('industrial', 'ledger', 'minimal', 'reference-classic')),
  layout_version smallint not null check (layout_version = 1),
  format_hash text,
  accent text not null check (accent ~ '^#[0-9a-fA-F]{6}$'),
  total bigint check (total between 0 and 999999999999),
  quantity_total integer not null check (quantity_total between 1 and 100000000),
  request_fingerprint text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (id, kind),
  unique (business_id, kind, reference),
  check ((kind = 'invoice' and total is not null and delivery_address = '')
    or (kind = 'challan' and total is null and due_date is null))
);

create table public.sales_document_items (
  document_id uuid not null,
  kind text not null,
  position smallint not null check (position between 1 and 100),
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  description text not null check (char_length(btrim(description)) between 1 and 500),
  quantity integer not null check (quantity between 1 and 1000000),
  price integer check (price >= 0),
  amount bigint generated always as (quantity::bigint * price::bigint) stored,
  primary key (document_id, position),
  foreign key (document_id, kind) references public.sales_documents(id, kind) on delete restrict,
  check ((kind = 'invoice' and price is not null) or (kind = 'challan' and price is null))
);
create index sales_documents_business_created_idx on public.sales_documents (kind, business_id, created_at desc, id);
create index sales_documents_created_idx on public.sales_documents (kind, created_at desc, id);
create index sales_documents_customer_idx on public.sales_documents (customer_id);
create index sales_document_items_product_idx on public.sales_document_items (product_id);
alter table public.sales_document_counters enable row level security;
alter table public.sales_documents enable row level security;
alter table public.sales_document_items enable row level security;
revoke all on public.sales_document_counters, public.sales_documents, public.sales_document_items from public, anon, authenticated;
grant all on public.sales_document_counters, public.sales_documents, public.sales_document_items to service_role;
grant select (id, kind, business_id, customer_id, reference, date, due_date, customer_reference, delivery_address, subject, notes,
  business_snapshot, customer_snapshot, layout_id, layout_version, format_hash, accent, total, quantity_total, created_at) on public.sales_documents to authenticated;
grant select on public.sales_document_items to authenticated;
create policy sales_documents_authenticated_read on public.sales_documents for select to authenticated using (true);
create policy sales_document_items_authenticated_read on public.sales_document_items for select to authenticated using (true);

create function public.list_sales_documents(p_kind text, p_business_id uuid default null, p_search text default '', p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with matched as (
    select id, kind, business_id, reference, date, due_date, total, quantity_total, created_at,
      business_snapshot->>'name' as business_name, customer_snapshot->>'name' as customer_name,
      customer_snapshot->>'company_name' as customer_company
    from public.sales_documents
    where kind = p_kind and (p_business_id is null or business_id = p_business_id)
      and strpos(lower(concat_ws(' ', reference, customer_reference, business_snapshot->>'name', customer_snapshot->>'name', customer_snapshot->>'company_name')),
        lower(left(coalesce(p_search, ''), 100))) > 0
  ), page as (
    select * from matched order by created_at desc, id limit 12 offset (greatest(1, least(coalesce(p_page, 1), 1000000)) - 1) * 12
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_strip_nulls(to_jsonb(p)) order by p.created_at desc, p.id) from page p), '[]'::jsonb),
    'count', (select count(*) from matched));
$$;
revoke all on function public.list_sales_documents(text, uuid, text, integer) from public, anon;
grant execute on function public.list_sales_documents(text, uuid, text, integer) to authenticated;

create function public.create_sales_document(p_id uuid, p_kind text, p_values jsonb, p_layout jsonb, p_fingerprint text, p_actor uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare b public.businesses%rowtype; c public.customers%rowtype; p public.products%rowtype;
  prior public.sales_documents%rowtype; item jsonb; product_key uuid; rows jsonb := '[]'::jsonb;
  qty integer; rate integer; subtotal bigint := 0; total_quantity integer := 0;
  sequence_number integer; document_year integer; position integer := 0; prefix text;
begin
  if p_id is null or p_actor is null or p_fingerprint is null or p_kind is null or p_kind not in ('invoice', 'challan') then raise exception 'invalid_request'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 0));
  select * into prior from public.sales_documents where id = p_id;
  if found then
    if prior.created_by is distinct from p_actor or prior.request_fingerprint is distinct from p_fingerprint or prior.kind <> p_kind then raise exception 'sales_document_conflict'; end if;
    return p_id;
  end if;
  select * into b from public.businesses where id = (p_values->>'business_id')::uuid for share;
  if not found or b.deletion_pending or b.revision is distinct from (p_values->>'business_revision')::integer then raise exception 'sales_document_source_changed'; end if;
  select * into c from public.customers where id = (p_values->>'customer_id')::uuid for share;
  if not found or c.revision is distinct from (p_values->>'customer_revision')::integer then raise exception 'sales_document_source_changed'; end if;
  if jsonb_typeof(p_values->'items') is distinct from 'array' then raise exception 'invalid_items'; end if;
  if jsonb_array_length(p_values->'items') not between 1 and 100 then raise exception 'invalid_items'; end if;
  -- Stable product locks keep numbering, snapshots and amounts in one transaction.
  for product_key in select distinct (value->>'product_id')::uuid from jsonb_array_elements(p_values->'items') order by 1 loop
    perform 1 from public.products where id = product_key for share;
    if not found then raise exception 'sales_document_source_changed'; end if;
  end loop;
  for item in select value from jsonb_array_elements(p_values->'items') loop
    select * into p from public.products where id = (item->>'product_id')::uuid;
    if not found or p.revision is distinct from (item->>'revision')::integer then raise exception 'sales_document_source_changed'; end if;
    if coalesce(item->>'quantity', '') !~ '^[0-9]+$' then raise exception 'invalid_items'; end if;
    qty := (item->>'quantity')::integer;
    if qty not between 1 and 1000000 then raise exception 'invalid_items'; end if;
    rate := null;
    if p_kind = 'invoice' then
      if coalesce(item->>'price', '') !~ '^[0-9]+$' then raise exception 'invalid_items'; end if;
      rate := (item->>'price')::integer;
      if rate < 0 then raise exception 'invalid_items'; end if;
      subtotal := subtotal + qty::bigint * rate::bigint;
    end if;
    total_quantity := total_quantity + qty; position := position + 1;
    rows := rows || jsonb_build_array(jsonb_build_object('position', position, 'product_id', p.id, 'product_name', p.name,
      'description', btrim(item->>'description'), 'quantity', qty, 'price', rate));
  end loop;
  if subtotal > 999999999999 then raise exception 'invalid_total'; end if;
  document_year := extract(year from (p_values->>'date')::date);
  prefix := case when p_kind = 'invoice' then 'INV' else 'DC' end;
  insert into public.sales_document_counters (business_id, kind, year, last_number) values (b.id, p_kind, document_year, 1)
    on conflict (business_id, kind, year) do update set last_number = public.sales_document_counters.last_number + 1 returning last_number into sequence_number;
  insert into public.sales_documents (id, kind, business_id, customer_id, reference, date, due_date, customer_reference, delivery_address,
    subject, notes, business_snapshot, customer_snapshot, layout_id, layout_version, format_hash, accent, total, quantity_total, request_fingerprint, created_by)
  values (p_id, p_kind, b.id, c.id, prefix || '-' || upper(left(replace(b.id::text, '-', ''), 8)) || '-' || document_year::text || '-' || lpad(sequence_number::text, greatest(4, char_length(sequence_number::text)), '0'),
    (p_values->>'date')::date, case when p_kind = 'invoice' then nullif(p_values->>'due_date', '')::date else null end,
    coalesce(p_values->>'customer_reference', ''), case when p_kind = 'challan' then coalesce(p_values->>'delivery_address', '') else '' end,
    coalesce(p_values->>'subject', ''), coalesce(p_values->>'notes', ''),
    jsonb_build_object('id', b.id, 'name', b.name, 'ntn', b.ntn, 'email', b.email, 'phone', b.phone, 'address', b.address, 'special_notes', b.special_notes,
      'logo', b.logo, 'signature', b.signature, 'billing_format', b.billing_format, 'billing_mode', b.billing_mode, 'template_id', b.template_id, 'template_version', b.template_version),
    jsonb_build_object('id', c.id, 'name', c.name, 'company_name', c.company_name, 'email', c.email, 'phone', c.phone, 'address', c.address),
    p_layout->>'id', (p_layout->>'version')::smallint, p_layout->>'format_hash', p_layout->>'accent',
    case when p_kind = 'invoice' then subtotal else null end, total_quantity, p_fingerprint, p_actor);
  insert into public.sales_document_items (document_id, kind, position, product_id, product_name, description, quantity, price)
    select p_id, p_kind, (value->>'position')::smallint, (value->>'product_id')::uuid, value->>'product_name', value->>'description',
      (value->>'quantity')::integer, (value->>'price')::integer from jsonb_array_elements(rows);
  return p_id;
end;
$$;
revoke all on function public.create_sales_document(uuid, text, jsonb, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.create_sales_document(uuid, text, jsonb, jsonb, text, uuid) to service_role;

-- Historical PDFs depend on their original images and reference files.
create or replace function public.business_asset_in_use(p_path text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.businesses where logo->>'path' = p_path or signature->>'path' = p_path or billing_format->>'path' = p_path)
    or exists (select 1 from public.quotations where business_snapshot->'logo'->>'path' = p_path or business_snapshot->'signature'->>'path' = p_path or business_snapshot->'billing_format'->>'path' = p_path)
    or exists (select 1 from public.sales_documents where business_snapshot->'logo'->>'path' = p_path or business_snapshot->'signature'->>'path' = p_path or business_snapshot->'billing_format'->>'path' = p_path);
$$;
revoke all on function public.business_asset_in_use(text) from public, anon, authenticated;
grant execute on function public.business_asset_in_use(text) to service_role;
create policy sales_document_business_assets_read on storage.objects for select to authenticated using (
  bucket_id = 'business-assets' and exists (select 1 from public.sales_documents d where d.business_snapshot->'logo'->>'path' = storage.objects.name
    or d.business_snapshot->'signature'->>'path' = storage.objects.name or d.business_snapshot->'billing_format'->>'path' = storage.objects.name)
);

create or replace function public.claim_business_deletion(p_id uuid, p_revision integer, p_token uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare b public.businesses%rowtype;
begin
  if p_token is null then raise exception 'invalid_token'; end if;
  select * into b from public.businesses where id = p_id for update;
  if not found then return null; end if;
  if exists (select 1 from public.quotations where business_id = p_id) or exists (select 1 from public.sales_documents where business_id = p_id) then raise exception 'business_has_sales_documents'; end if;
  if p_revision is null or b.revision <> p_revision then raise exception 'business_changed'; end if;
  if b.deletion_locked_until > now() then raise exception 'deletion_busy'; end if;
  update public.businesses set deletion_pending = true, deletion_token = p_token, deletion_locked_until = now() + interval '2 minutes' where id = p_id;
  return jsonb_build_object('id', b.id, 'logo', b.logo, 'signature', b.signature, 'billing_format', b.billing_format);
end;
$$;
revoke all on function public.claim_business_deletion(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.claim_business_deletion(uuid, integer, uuid) to service_role;

notify pgrst, 'reload schema';
commit;
