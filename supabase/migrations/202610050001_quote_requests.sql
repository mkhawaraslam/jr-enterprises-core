begin;

create function public.quote_photo_total(p_photos jsonb)
returns bigint language sql immutable set search_path = '' as $$
  select coalesce(sum((photo ->> 'size')::bigint), 0)
  from jsonb_array_elements(p_photos) as photo;
$$;
revoke all on function public.quote_photo_total(jsonb) from public, anon, authenticated;
grant execute on function public.quote_photo_total(jsonb) to service_role;

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 100),
  phone text not null check (char_length(phone) between 7 and 25),
  email text check (email is null or char_length(email) between 3 and 254),
  requirements text not null check (char_length(btrim(requirements)) between 1 and 3000),
  photos jsonb not null default '[]'::jsonb
    check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 10
      and public.quote_photo_total(photos) <= 5242880),
  submission_token_hash text not null check (char_length(submission_token_hash) = 64),
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index quote_requests_received_idx on public.quote_requests (submitted_at desc, id)
  where submitted_at is not null;
create index quote_requests_pending_idx on public.quote_requests (created_at)
  where submitted_at is null;
alter table public.quote_requests enable row level security;
revoke all on public.quote_requests from anon, authenticated;
grant all on public.quote_requests to service_role;
grant select (id, full_name, phone, email, requirements, photos, submitted_at)
  on public.quote_requests to authenticated;
create policy "Authenticated users can read submitted quote requests"
  on public.quote_requests for select to authenticated using (submitted_at is not null);

create table public.quote_request_limits (
  fingerprint text not null,
  window_start timestamptz not null,
  attempts integer not null default 1,
  primary key (fingerprint, window_start)
);
alter table public.quote_request_limits enable row level security;
revoke all on public.quote_request_limits from anon, authenticated;
grant all on public.quote_request_limits to service_role;
create index quote_request_limits_expiry_idx on public.quote_request_limits (window_start);

create function public.consume_quote_request_limit(p_fingerprint text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare attempt_count integer;
begin
  delete from public.quote_request_limits where window_start < now() - interval '2 days';
  insert into public.quote_request_limits (fingerprint, window_start)
    values (p_fingerprint, date_trunc('hour', now()))
    on conflict (fingerprint, window_start) do update
      set attempts = public.quote_request_limits.attempts + 1
    returning attempts into attempt_count;
  return attempt_count <= 10;
end;
$$;
revoke all on function public.consume_quote_request_limit(text) from public, anon, authenticated;
grant execute on function public.consume_quote_request_limit(text) to service_role;

create function public.list_quote_requests(p_search text default '', p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with matching as (
    select id, full_name, phone, email, requirements, photos, submitted_at
    from public.quote_requests
    where submitted_at is not null and (
      coalesce(p_search, '') = '' or position(lower(left(p_search, 100)) in
        lower(full_name || ' ' || phone || ' ' || coalesce(email, '') || ' ' || requirements)) > 0
    )
  ), page_rows as (
    select * from matching order by submitted_at desc, id
    limit 10 offset (greatest(1, least(coalesce(p_page, 1), 100000)) - 1) * 10
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(r) order by r.submitted_at desc, r.id) from page_rows r), '[]'::jsonb),
    'count', (select count(*) from matching)
  );
$$;
revoke all on function public.list_quote_requests(text, integer) from public, anon;
grant execute on function public.list_quote_requests(text, integer) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quote-request-photos', 'quote-request-photos', false, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "Authenticated users can view submitted quote photos"
  on storage.objects for select to authenticated using (
    bucket_id = 'quote-request-photos' and exists (
      select 1 from public.quote_requests r
      where r.submitted_at is not null
        and r.photos @> jsonb_build_array(jsonb_build_object('path', storage.objects.name))
    )
  );

commit;
