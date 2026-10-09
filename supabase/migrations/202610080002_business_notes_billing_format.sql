begin;

alter table public.businesses
  add column special_notes text not null default '' check (char_length(special_notes) <= 5000),
  add column billing_format jsonb,
  add constraint business_billing_format_path check (
    billing_format is null or (
      jsonb_typeof(billing_format) = 'object' and billing_format ? 'path'
      and jsonb_typeof(billing_format->'path') = 'string'
      and (billing_format->>'path') ~ ('^' || id::text || '/[0-9a-f-]{36}/billing-format\.(pdf|jpg|png)$')
    )
  );
grant select (special_notes, billing_format) on public.businesses to authenticated;

alter table public.business_asset_cleanup drop constraint business_asset_cleanup_path_check;
alter table public.business_asset_cleanup add constraint business_asset_cleanup_path_check check (
  path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/((logo|signature)\.(jpg|png)|billing-format\.(pdf|jpg|png))$'
);

update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf']
where id = 'business-assets';
drop policy business_assets_authenticated_read on storage.objects;
create policy business_assets_authenticated_read on storage.objects for select to authenticated using (
  bucket_id = 'business-assets' and exists (
    select 1 from public.businesses b where not b.deletion_pending and
    ((b.logo->>'path') = storage.objects.name or (b.signature->>'path') = storage.objects.name
      or (b.billing_format->>'path') = storage.objects.name)
  )
);

create or replace function public.list_businesses(p_search text default '', p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with matched as (
    select id, name, ntn, email, phone, address, special_notes, logo, signature, billing_format,
      revision, created_at, updated_at, deletion_pending
    from public.businesses
    where strpos(lower(name || ' ' || ntn || ' ' || email || ' ' || phone || ' ' || address || ' ' || special_notes), lower(left(coalesce(p_search, ''), 100))) > 0
  ), page as (
    select * from matched order by lower(name), id limit 12 offset (greatest(1, least(coalesce(p_page, 1), 1000000)) - 1) * 12
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(p) order by lower(p.name), p.id) from page p), '[]'::jsonb), 'count', (select count(*) from matched));
$$;
revoke all on function public.list_businesses(text, integer) from public, anon;
grant execute on function public.list_businesses(text, integer) to authenticated;

drop function public.save_business(uuid, jsonb, jsonb, jsonb, integer, uuid);
create function public.save_business(p_id uuid, p_values jsonb, p_logo jsonb, p_signature jsonb, p_billing_format jsonb, p_revision integer, p_actor uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare previous public.businesses%rowtype; old_path text;
begin
  if p_actor is null then raise exception 'invalid_actor'; end if;
  if p_revision is null then
    insert into public.businesses (id, name, ntn, email, phone, address, special_notes, logo, signature, billing_format, created_by, updated_by)
    values (p_id, p_values->>'name', p_values->>'ntn', p_values->>'email', p_values->>'phone', p_values->>'address',
      coalesce(p_values->>'special_notes', ''), p_logo, p_signature, p_billing_format, p_actor, p_actor);
  else
    select * into previous from public.businesses where id = p_id for update;
    if not found then raise exception 'business_not_found'; end if;
    if previous.deletion_pending then raise exception 'deletion_pending'; end if;
    if previous.revision <> p_revision then raise exception 'business_changed'; end if;
    update public.businesses set name = p_values->>'name', ntn = p_values->>'ntn', email = p_values->>'email',
      phone = p_values->>'phone', address = p_values->>'address', special_notes = coalesce(p_values->>'special_notes', ''),
      logo = p_logo, signature = p_signature, billing_format = p_billing_format,
      revision = revision + 1, updated_at = now(), updated_by = p_actor where id = p_id;
    foreach old_path in array array[previous.logo->>'path', previous.signature->>'path', previous.billing_format->>'path'] loop
      if old_path is not null and old_path is distinct from (p_logo->>'path')
        and old_path is distinct from (p_signature->>'path') and old_path is distinct from (p_billing_format->>'path') then
        insert into public.business_asset_cleanup (path) values (old_path) on conflict (path) do update set run_after = now();
      end if;
    end loop;
  end if;
  delete from public.business_asset_cleanup where path in (p_logo->>'path', p_signature->>'path', p_billing_format->>'path');
  return p_id;
end;
$$;
revoke all on function public.save_business(uuid, jsonb, jsonb, jsonb, jsonb, integer, uuid) from public, anon, authenticated;
grant execute on function public.save_business(uuid, jsonb, jsonb, jsonb, jsonb, integer, uuid) to service_role;

create or replace function public.claim_business_deletion(p_id uuid, p_revision integer, p_token uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare b public.businesses%rowtype;
begin
  if p_token is null then raise exception 'invalid_token'; end if;
  select * into b from public.businesses where id = p_id for update;
  if not found then return null; end if;
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
