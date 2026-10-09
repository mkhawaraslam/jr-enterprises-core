begin;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 150),
  company_name text not null check (char_length(btrim(company_name)) between 1 and 150),
  email text not null check (char_length(btrim(email)) between 3 and 254),
  phone text not null check (char_length(btrim(phone)) between 7 and 25),
  address text not null check (char_length(btrim(address)) between 1 and 1000),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null
);
create index customers_name_idx on public.customers (lower(name), id);
alter table public.customers enable row level security;
revoke all on public.customers from public, anon, authenticated;
grant select (id, name, company_name, email, phone, address, revision, created_at, updated_at) on public.customers to authenticated;
grant all on public.customers to service_role;
create policy customers_authenticated_read on public.customers for select to authenticated using (true);

create function public.list_customers(p_search text default '', p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with matched as (
    select id, name, company_name, email, phone, address, revision, created_at, updated_at
    from public.customers
    where strpos(lower(name || ' ' || company_name || ' ' || email || ' ' || phone || ' ' || address), lower(left(coalesce(p_search, ''), 100))) > 0
  ), page as (
    select * from matched order by lower(name), id limit 12 offset (greatest(1, least(coalesce(p_page, 1), 1000000)) - 1) * 12
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(p) order by lower(p.name), p.id) from page p), '[]'::jsonb), 'count', (select count(*) from matched));
$$;
revoke all on function public.list_customers(text, integer) from public, anon;
grant execute on function public.list_customers(text, integer) to authenticated;

create function public.save_customer(p_id uuid, p_values jsonb, p_revision integer, p_actor uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare previous public.customers%rowtype;
begin
  if p_actor is null then raise exception 'invalid_actor'; end if;
  if p_revision is null then
    insert into public.customers (id, name, company_name, email, phone, address, created_by, updated_by)
    values (p_id, p_values->>'name', p_values->>'company_name', p_values->>'email', p_values->>'phone', p_values->>'address', p_actor, p_actor);
  else
    select * into previous from public.customers where id = p_id for update;
    if not found then raise exception 'customer_not_found'; end if;
    if previous.revision <> p_revision then raise exception 'customer_changed'; end if;
    update public.customers set name = p_values->>'name', company_name = p_values->>'company_name', email = p_values->>'email',
      phone = p_values->>'phone', address = p_values->>'address', revision = revision + 1, updated_at = now(), updated_by = p_actor
    where id = p_id;
  end if;
  return p_id;
end;
$$;

create function public.delete_customer(p_id uuid, p_revision integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare previous public.customers%rowtype;
begin
  select * into previous from public.customers where id = p_id for update;
  if not found then return true; end if;
  if p_revision is null or previous.revision <> p_revision then raise exception 'customer_changed'; end if;
  delete from public.customers where id = p_id;
  return true;
end;
$$;
revoke all on function public.save_customer(uuid, jsonb, integer, uuid) from public, anon, authenticated;
revoke all on function public.delete_customer(uuid, integer) from public, anon, authenticated;
grant execute on function public.save_customer(uuid, jsonb, integer, uuid) to service_role;
grant execute on function public.delete_customer(uuid, integer) to service_role;

notify pgrst, 'reload schema';
commit;
