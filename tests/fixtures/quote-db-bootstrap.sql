-- Only for an isolated local test cluster, never a Supabase project.
do $$ begin
  if current_database() <> 'jr_quotes_test' then raise exception 'Use the isolated jr_quotes_test database'; end if;
end $$;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null);
alter table storage.objects enable row level security;
grant usage on schema public, storage to anon, authenticated, service_role;
grant select on storage.objects to anon, authenticated;
grant all on storage.buckets, storage.objects to service_role;
