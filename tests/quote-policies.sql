-- Execute after the migration in the isolated test database. Fixtures roll back.
begin;
do $$ begin
  if current_database() <> 'jr_quotes_test' then raise exception 'Use the isolated jr_quotes_test database'; end if;
end $$;
insert into public.quote_requests (id, full_name, phone, requirements, photos, submission_token_hash, submitted_at)
values
  ('00000000-0000-4000-8000-000000000001', 'Submitted Buyer', '03026500974', 'Pneumatic cylinder', '[{"path":"submitted/photo.png","size":100}]', repeat('a', 64), now()),
  ('00000000-0000-4000-8000-000000000002', 'Pending Buyer', '03026500974', 'Valve', '[{"path":"pending/photo.png","size":100}]', repeat('b', 64), null);
insert into storage.objects (bucket_id, name)
values ('quote-request-photos', 'submitted/photo.png'), ('quote-request-photos', 'pending/photo.png');

set local role anon;
do $$ declare blocked boolean := false;
begin
  begin perform full_name from public.quote_requests; exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'Anonymous requests must not read quotes'; end if;
  if exists (select 1 from storage.objects where bucket_id = 'quote-request-photos') then raise exception 'Anonymous photo read leaked'; end if;
  if has_function_privilege(current_user, 'public.list_quote_requests(text,integer)', 'EXECUTE') then raise exception 'Anonymous listing RPC leaked'; end if;
  if has_function_privilege(current_user, 'public.consume_quote_request_limit(text)', 'EXECUTE') then raise exception 'Anonymous limiter RPC leaked'; end if;
end $$;

set local role authenticated;
do $$ declare result jsonb; blocked boolean := false;
begin
  if (select count(*) from public.quote_requests) <> 1 then raise exception 'Only submitted quotes should be visible'; end if;
  result := public.list_quote_requests('Submitted Buyer', 1);
  if (result->>'count')::integer <> 1 or result->'items'->0->>'full_name' <> 'Submitted Buyer' then raise exception 'Listing RPC is incorrect'; end if;
  if result::text like '%submission_token_hash%' then raise exception 'Listing exposes hashes'; end if;
  if (public.list_quote_requests('Pending Buyer', 1)->>'count')::integer <> 0 then raise exception 'Pending quote leaked through RPC'; end if;
  if (public.list_quote_requests(''' OR 1=1 --', 1)->>'count')::integer <> 0 then raise exception 'Search is not treated as literal data'; end if;
  begin perform submission_token_hash from public.quote_requests; exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'Submission hashes must be private'; end if;
  if has_table_privilege(current_user, 'public.quote_requests', 'INSERT,UPDATE,DELETE') then raise exception 'Browser clients must not modify quotes'; end if;
  if (select count(*) from storage.objects where bucket_id = 'quote-request-photos') <> 1 then raise exception 'Only submitted photos should be visible'; end if;
  if has_function_privilege(current_user, 'public.consume_quote_request_limit(text)', 'EXECUTE') then raise exception 'Authenticated limiter RPC leaked'; end if;
end $$;

set local role service_role;
do $$ declare count integer; blocked boolean := false;
begin
  if (select count(*) from public.quote_requests) <> 2 then raise exception 'Service cannot see pending quotes'; end if;
  for count in 1..10 loop
    if not public.consume_quote_request_limit(repeat('c', 64)) then raise exception 'Limiter rejected too early'; end if;
  end loop;
  if public.consume_quote_request_limit(repeat('c', 64)) then raise exception 'Limiter must reject the eleventh attempt'; end if;
  begin
    insert into public.quote_requests (full_name, phone, requirements, photos, submission_token_hash)
    values ('Oversized', '03026500974', 'Valve', '[{"size":3000000},{"size":3000000}]', repeat('d',64));
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'Combined photo-size constraint did not reject'; end if;
end $$;

reset role;
do $$ begin
  if (select public from storage.buckets where id = 'quote-request-photos') then raise exception 'Bucket must remain private'; end if;
  raise notice 'Quote policy checks passed: public denial, pending isolation, private hashes, literal search, storage RLS, limiter and aggregate-size constraints.';
end $$;
rollback;
