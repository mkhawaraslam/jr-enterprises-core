begin;

do $$
declare missing_tables text[];
begin
  select array_agg('public.' || name order by name) into missing_tables
  from unnest(array['products', 'quotation_items', 'sales_document_items']) as required(name)
  where to_regclass(format('public.%I', name)) is null;
  if missing_tables is not null then
    raise exception using message = 'Product unit prerequisites are missing: ' || array_to_string(missing_tables, ', '),
      hint = 'Apply the missing product, quotation and sales-document migrations through 202610100002_sales_documents.sql before this migration. Do not rerun migrations already applied.';
  end if;
end;
$$;

alter table public.products add column unit text not null default 'NOS' check (unit in ('NOS', 'MTR', 'FT'));

-- Historical documents have no known unit; only new items receive a snapshot.
alter table public.quotation_items add column unit text check (unit in ('NOS', 'MTR', 'FT'));
alter table public.sales_document_items add column unit text check (unit in ('NOS', 'MTR', 'FT'));
grant select (unit) on public.products, public.quotation_items, public.sales_document_items to authenticated;

create or replace function public.list_products(p_search text default '', p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with matched as (
    select id, name, price, unit, revision, created_at, updated_at
    from public.products
    where strpos(lower(name), lower(left(coalesce(p_search, ''), 100))) > 0
  ), page as (
    select * from matched order by lower(name), id limit 12 offset (greatest(1, least(coalesce(p_page, 1), 1000000)) - 1) * 12
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(p) order by lower(p.name), p.id) from page p), '[]'::jsonb), 'count', (select count(*) from matched));
$$;
revoke all on function public.list_products(text, integer) from public, anon;
grant execute on function public.list_products(text, integer) to authenticated;

create or replace function public.save_product(p_id uuid, p_values jsonb, p_revision integer, p_actor uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare previous public.products%rowtype;
begin
  if p_actor is null then raise exception 'invalid_actor'; end if;
  if p_values->>'price' is null or p_values->>'price' !~ '^[0-9]+$' then raise exception 'invalid_price'; end if;
  if p_values->>'unit' is null or p_values->>'unit' not in ('NOS', 'MTR', 'FT') then raise exception 'invalid_unit'; end if;
  if p_revision is null then
    insert into public.products (id, name, price, unit, created_by, updated_by)
    values (p_id, p_values->>'name', (p_values->>'price')::integer, p_values->>'unit', p_actor, p_actor);
  else
    select * into previous from public.products where id = p_id for update;
    if not found then raise exception 'product_not_found'; end if;
    if previous.revision <> p_revision then raise exception 'product_changed'; end if;
    update public.products set name = p_values->>'name', price = (p_values->>'price')::integer, unit = p_values->>'unit',
      revision = revision + 1, updated_at = now(), updated_by = p_actor
    where id = p_id;
  end if;
  return p_id;
end;
$$;
revoke all on function public.save_product(uuid, jsonb, integer, uuid) from public, anon, authenticated;
grant execute on function public.save_product(uuid, jsonb, integer, uuid) to service_role;

create function public.snapshot_product_unit()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  -- Creation RPCs already lock products; the database owns the unit snapshot.
  select p.unit into new.unit from public.products p where p.id = new.product_id for share;
  if not found then raise exception 'product_not_found'; end if;
  return new;
end;
$$;
revoke all on function public.snapshot_product_unit() from public, anon, authenticated;
grant execute on function public.snapshot_product_unit() to service_role;
create trigger quotation_items_snapshot_product_unit before insert on public.quotation_items
  for each row execute function public.snapshot_product_unit();
create trigger sales_document_items_snapshot_product_unit before insert on public.sales_document_items
  for each row execute function public.snapshot_product_unit();

notify pgrst, 'reload schema';
commit;
