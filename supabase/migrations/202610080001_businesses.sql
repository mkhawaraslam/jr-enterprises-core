begin;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 150),
  ntn text not null check (char_length(btrim(ntn)) between 1 and 30),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null check (char_length(phone) between 7 and 25),
  address text not null check (char_length(btrim(address)) between 1 and 1000),
  logo jsonb not null,
  signature jsonb not null,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  deletion_pending boolean not null default false,
  deletion_token uuid,
  deletion_locked_until timestamptz,
  constraint business_logo_path check (jsonb_typeof(logo) = 'object' and logo ? 'path' and jsonb_typeof(logo->'path') = 'string' and (logo->>'path') ~ ('^' || id::text || '/[0-9a-f-]{36}/logo\.(jpg|png)$')),
  constraint business_signature_path check (jsonb_typeof(signature) = 'object' and signature ? 'path' and jsonb_typeof(signature->'path') = 'string' and (signature->>'path') ~ ('^' || id::text || '/[0-9a-f-]{36}/signature\.(jpg|png)$'))
);
create index businesses_name_idx on public.businesses (lower(name), id);
alter table public.businesses enable row level security;
revoke all on public.businesses from public, anon, authenticated;
grant select (id, name, ntn, email, phone, address, logo, signature, revision, created_at, updated_at, deletion_pending) on public.businesses to authenticated;
grant all on public.businesses to service_role;
create policy businesses_authenticated_read on public.businesses for select to authenticated using (true);

create table public.business_asset_cleanup (
  path text primary key check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/(logo|signature)\.(jpg|png)$'),
  run_after timestamptz not null default now()
);
alter table public.business_asset_cleanup enable row level security;
revoke all on public.business_asset_cleanup from public, anon, authenticated;
grant all on public.business_asset_cleanup to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-assets', 'business-assets', false, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy business_assets_authenticated_read on storage.objects for select to authenticated using (
  bucket_id = 'business-assets' and exists (
    select 1 from public.businesses b where not b.deletion_pending and
    ((b.logo->>'path') = storage.objects.name or (b.signature->>'path') = storage.objects.name)
  )
);

create function public.list_businesses(p_search text default '', p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with matched as (
    select id, name, ntn, email, phone, address, logo, signature, revision, created_at, updated_at, deletion_pending
    from public.businesses
    where strpos(lower(name || ' ' || ntn || ' ' || email || ' ' || phone || ' ' || address), lower(left(coalesce(p_search, ''), 100))) > 0
  ), page as (
    select * from matched order by lower(name), id limit 12 offset (greatest(1, least(coalesce(p_page, 1), 1000000)) - 1) * 12
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(p) order by lower(p.name), p.id) from page p), '[]'::jsonb), 'count', (select count(*) from matched));
$$;
revoke all on function public.list_businesses(text, integer) from public, anon;
grant execute on function public.list_businesses(text, integer) to authenticated;

create function public.save_business(p_id uuid, p_values jsonb, p_logo jsonb, p_signature jsonb, p_revision integer, p_actor uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare previous public.businesses%rowtype; old_path text;
begin
  if p_actor is null then raise exception 'invalid_actor'; end if;
  if p_revision is null then
    insert into public.businesses (id, name, ntn, email, phone, address, logo, signature, created_by, updated_by)
    values (p_id, p_values->>'name', p_values->>'ntn', p_values->>'email', p_values->>'phone', p_values->>'address', p_logo, p_signature, p_actor, p_actor);
  else
    select * into previous from public.businesses where id = p_id for update;
    if not found then raise exception 'business_not_found'; end if;
    if previous.deletion_pending then raise exception 'deletion_pending'; end if;
    if previous.revision <> p_revision then raise exception 'business_changed'; end if;
    update public.businesses set name = p_values->>'name', ntn = p_values->>'ntn', email = p_values->>'email',
      phone = p_values->>'phone', address = p_values->>'address', logo = p_logo, signature = p_signature,
      revision = revision + 1, updated_at = now(), updated_by = p_actor where id = p_id;
    foreach old_path in array array[previous.logo->>'path', previous.signature->>'path'] loop
      if old_path not in (p_logo->>'path', p_signature->>'path') then
        insert into public.business_asset_cleanup (path) values (old_path) on conflict (path) do update set run_after = now();
      end if;
    end loop;
  end if;
  delete from public.business_asset_cleanup where path in (p_logo->>'path', p_signature->>'path');
  return p_id;
end;
$$;

create function public.claim_business_deletion(p_id uuid, p_revision integer, p_token uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare b public.businesses%rowtype;
begin
  if p_token is null then raise exception 'invalid_token'; end if;
  select * into b from public.businesses where id = p_id for update;
  if not found then return null; end if;
  if p_revision is null or b.revision <> p_revision then raise exception 'business_changed'; end if;
  if b.deletion_locked_until > now() then raise exception 'deletion_busy'; end if;
  update public.businesses set deletion_pending = true, deletion_token = p_token, deletion_locked_until = now() + interval '2 minutes' where id = p_id;
  return jsonb_build_object('id', b.id, 'logo', b.logo, 'signature', b.signature);
end;
$$;
create function public.finish_business_deletion(p_id uuid, p_token uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare b public.businesses%rowtype;
begin
  if p_token is null then return false; end if;
  select * into b from public.businesses where id = p_id for update;
  if not found or b.deletion_token is distinct from p_token then return false; end if;
  delete from public.businesses where id = p_id;
  return true;
end;
$$;
create function public.release_business_deletion(p_id uuid, p_token uuid)
returns void language sql security invoker set search_path = '' as $$
  update public.businesses set deletion_token = null, deletion_locked_until = null where id = p_id and deletion_token = p_token;
$$;

revoke all on function public.save_business(uuid, jsonb, jsonb, jsonb, integer, uuid) from public, anon, authenticated;
revoke all on function public.claim_business_deletion(uuid, integer, uuid) from public, anon, authenticated;
revoke all on function public.finish_business_deletion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_business_deletion(uuid, uuid) from public, anon, authenticated;
grant execute on function public.save_business(uuid, jsonb, jsonb, jsonb, integer, uuid) to service_role;
grant execute on function public.claim_business_deletion(uuid, integer, uuid) to service_role;
grant execute on function public.finish_business_deletion(uuid, uuid) to service_role;
grant execute on function public.release_business_deletion(uuid, uuid) to service_role;

commit;
