begin;

alter table public.quote_requests
  add column reviewed_at timestamptz,
  add column reviewed_by uuid,
  add column photos_removed_at timestamptz,
  add column cleanup_action text check (cleanup_action in ('photos', 'request')),
  add column cleanup_token uuid,
  add column cleanup_locked_until timestamptz,
  add constraint quote_review_consistent check ((reviewed_at is null) = (reviewed_by is null));
grant select (reviewed_at, reviewed_by, photos_removed_at, cleanup_action)
  on public.quote_requests to authenticated;
create index quote_requests_unreviewed_idx on public.quote_requests (submitted_at desc, id)
  where submitted_at is not null and reviewed_at is null;

create function public.get_quote_request_counts()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('total', count(*), 'unreviewed', count(*) filter (where reviewed_at is null))
  from public.quote_requests where submitted_at is not null;
$$;
revoke all on function public.get_quote_request_counts() from public, anon;
grant execute on function public.get_quote_request_counts() to authenticated;

drop function public.list_quote_requests(text, integer);
create function public.list_quote_requests(p_search text default '', p_page integer default 1, p_status text default 'all')
returns jsonb language sql stable security invoker set search_path = '' as $$
  with matching as (
    select id, full_name, phone, email, requirements, photos, submitted_at,
      reviewed_at, reviewed_by, photos_removed_at, cleanup_action
    from public.quote_requests
    where submitted_at is not null
      and (p_status = 'all' or (p_status = 'new' and reviewed_at is null) or (p_status = 'reviewed' and reviewed_at is not null))
      and (coalesce(p_search, '') = '' or position(lower(left(p_search, 100)) in
        lower(full_name || ' ' || phone || ' ' || coalesce(email, '') || ' ' || requirements)) > 0)
  ), page_rows as (
    select * from matching order by submitted_at desc, id
    limit 10 offset (greatest(1, least(coalesce(p_page, 1), 100000)) - 1) * 10
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(r) order by r.submitted_at desc, r.id) from page_rows r), '[]'::jsonb),
    'count', (select count(*) from matching)
  );
$$;
revoke all on function public.list_quote_requests(text, integer, text) from public, anon;
grant execute on function public.list_quote_requests(text, integer, text) to authenticated;

create function public.set_quote_request_review(p_id uuid, p_reviewed boolean, p_reviewer uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare request public.quote_requests;
begin
  select * into request from public.quote_requests where id = p_id and submitted_at is not null for update;
  if not found then return null; end if;
  if request.cleanup_action is not null then raise exception 'cleanup_conflict'; end if;
  if p_reviewed is null or p_reviewer is null then raise exception 'invalid_review'; end if;
  update public.quote_requests set
    reviewed_at = case when p_reviewed then coalesce(reviewed_at, now()) else null end,
    reviewed_by = case when p_reviewed then coalesce(reviewed_by, p_reviewer) else null end
    where id = p_id returning * into request;
  return jsonb_build_object('id', request.id, 'reviewed_at', request.reviewed_at, 'reviewed_by', request.reviewed_by);
end;
$$;
revoke all on function public.set_quote_request_review(uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.set_quote_request_review(uuid, boolean, uuid) to service_role;

-- Retain only paths until signed upload permissions have certainly expired.
create table public.quote_photo_cleanup (
  request_id uuid primary key,
  paths text[] not null check (cardinality(paths) between 1 and 10),
  run_after timestamptz not null
);
alter table public.quote_photo_cleanup enable row level security;
revoke all on public.quote_photo_cleanup from anon, authenticated;
grant all on public.quote_photo_cleanup to service_role;
create index quote_photo_cleanup_due_idx on public.quote_photo_cleanup (run_after);

create function public.claim_quote_cleanup(p_id uuid, p_action text, p_token uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare request public.quote_requests;
begin
  if p_action is null or p_action not in ('photos', 'request') or p_token is null then raise exception 'invalid_cleanup'; end if;
  select * into request from public.quote_requests where id = p_id and submitted_at is not null for update;
  if not found then return null; end if;
  if request.reviewed_at is null then raise exception 'review_required'; end if;
  if (request.cleanup_action is not null and request.cleanup_action <> p_action)
    or request.cleanup_locked_until > now() then raise exception 'cleanup_conflict'; end if;
  update public.quote_requests set cleanup_action = p_action, cleanup_token = p_token,
    cleanup_locked_until = now() + interval '2 minutes' where id = p_id returning * into request;
  return jsonb_build_object('id', request.id, 'photos', request.photos);
end;
$$;
revoke all on function public.claim_quote_cleanup(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.claim_quote_cleanup(uuid, text, uuid) to service_role;

create function public.finish_quote_cleanup(p_id uuid, p_token uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare request public.quote_requests; photo_paths text[];
begin
  select * into request from public.quote_requests where id = p_id and cleanup_token = p_token for update;
  if not found then return false; end if;
  select array_agg(photo->>'path') into photo_paths from jsonb_array_elements(request.photos) as photo;
  if cardinality(photo_paths) > 0 and request.created_at + interval '3 hours' > now() then
    insert into public.quote_photo_cleanup (request_id, paths, run_after)
      values (p_id, photo_paths, request.created_at + interval '3 hours')
      on conflict (request_id) do nothing;
  end if;
  if request.cleanup_action = 'request' then
    delete from public.quote_requests where id = p_id;
  elsif request.cleanup_action = 'photos' then
    update public.quote_requests set photos = '[]'::jsonb, photos_removed_at = coalesce(photos_removed_at, now()),
      cleanup_action = null, cleanup_token = null, cleanup_locked_until = null where id = p_id;
  else
    raise exception 'invalid_cleanup';
  end if;
  return true;
end;
$$;
revoke all on function public.finish_quote_cleanup(uuid, uuid) from public, anon, authenticated;
grant execute on function public.finish_quote_cleanup(uuid, uuid) to service_role;

create function public.release_quote_cleanup(p_id uuid, p_token uuid)
returns void language sql security invoker set search_path = '' as $$
  update public.quote_requests set cleanup_token = null, cleanup_locked_until = null
    where id = p_id and cleanup_token = p_token;
$$;
revoke all on function public.release_quote_cleanup(uuid, uuid) from public, anon, authenticated;
grant execute on function public.release_quote_cleanup(uuid, uuid) to service_role;

commit;
