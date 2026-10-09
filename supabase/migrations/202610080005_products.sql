begin;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 150),
  price integer not null check (price >= 0),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null
);
create index products_name_idx on public.products (lower(name), id);
alter table public.products enable row level security;
revoke all on public.products from public, anon, authenticated;
grant select (id, name, price, revision, created_at, updated_at) on public.products to authenticated;
grant all on public.products to service_role;
create policy products_authenticated_read on public.products for select to authenticated using (true);

create function public.list_products(p_search text default '', p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with matched as (
    select id, name, price, revision, created_at, updated_at
    from public.products
    where strpos(lower(name), lower(left(coalesce(p_search, ''), 100))) > 0
  ), page as (
    select * from matched order by lower(name), id limit 12 offset (greatest(1, least(coalesce(p_page, 1), 1000000)) - 1) * 12
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(p) order by lower(p.name), p.id) from page p), '[]'::jsonb), 'count', (select count(*) from matched));
$$;
revoke all on function public.list_products(text, integer) from public, anon;
grant execute on function public.list_products(text, integer) to authenticated;

create function public.save_product(p_id uuid, p_values jsonb, p_revision integer, p_actor uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare previous public.products%rowtype;
begin
  if p_actor is null then raise exception 'invalid_actor'; end if;
  if p_values->>'price' is null or p_values->>'price' !~ '^[0-9]+$' then raise exception 'invalid_price'; end if;
  if p_revision is null then
    insert into public.products (id, name, price, created_by, updated_by)
    values (p_id, p_values->>'name', (p_values->>'price')::integer, p_actor, p_actor);
  else
    select * into previous from public.products where id = p_id for update;
    if not found then raise exception 'product_not_found'; end if;
    if previous.revision <> p_revision then raise exception 'product_changed'; end if;
    update public.products set name = p_values->>'name', price = (p_values->>'price')::integer,
      revision = revision + 1, updated_at = now(), updated_by = p_actor
    where id = p_id;
  end if;
  return p_id;
end;
$$;

create function public.delete_product(p_id uuid, p_revision integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare previous public.products%rowtype;
begin
  select * into previous from public.products where id = p_id for update;
  if not found then return true; end if;
  if p_revision is null or previous.revision <> p_revision then raise exception 'product_changed'; end if;
  delete from public.products where id = p_id;
  return true;
end;
$$;
revoke all on function public.save_product(uuid, jsonb, integer, uuid) from public, anon, authenticated;
revoke all on function public.delete_product(uuid, integer) from public, anon, authenticated;
grant execute on function public.save_product(uuid, jsonb, integer, uuid) to service_role;
grant execute on function public.delete_product(uuid, integer) to service_role;

notify pgrst, 'reload schema';
commit;
