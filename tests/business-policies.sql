-- Disposable local database only. Fixtures roll back; no real company data is used.
\set ON_ERROR_STOP on
do $$ begin
  if current_database() <> 'jr_quotes_test' then raise exception 'Use the isolated jr_quotes_test database'; end if;
end $$;
begin;
set local role service_role;
select public.save_business(
  '00000000-0000-4000-8000-000000000001',
  '{"name":"Business Test","ntn":"1234567-8","email":"company@example.com","phone":"03000000000","address":"Test Islamabad"}',
  '{"path":"00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000010/logo.png"}',
  '{"path":"00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000010/signature.png"}', null,
  '00000000-0000-4000-8000-000000000099'
);
insert into storage.objects (bucket_id, name) values
  ('business-assets', '00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000010/logo.png'),
  ('business-assets', '00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000010/signature.png');
reset role;
do $$ begin
  if has_table_privilege('anon', 'public.businesses', 'SELECT') then raise exception 'Anonymous business access'; end if;
  if has_table_privilege('authenticated', 'public.businesses', 'INSERT,UPDATE,DELETE') then raise exception 'Authenticated writes'; end if;
  if has_column_privilege('authenticated', 'public.businesses', 'deletion_token', 'SELECT') then raise exception 'Private lease exposed'; end if;
  if has_table_privilege('authenticated', 'public.business_asset_cleanup', 'SELECT') then raise exception 'Cleanup queue exposed'; end if;
  if has_function_privilege('authenticated', 'public.save_business(uuid,jsonb,jsonb,jsonb,integer,uuid)', 'EXECUTE') then raise exception 'Direct business mutation'; end if;
  if has_function_privilege('anon', 'public.list_businesses(text,integer)', 'EXECUTE') then raise exception 'Anonymous listing'; end if;
end $$;
set local role authenticated;
do $$ declare result jsonb; begin
  result := public.list_businesses('1234567', 1);
  if (result->>'count')::int <> 1 then raise exception 'Search/count failure'; end if;
  if (result->'items'->0) ? 'deletion_token' or (result->'items'->0) ? 'created_by' then raise exception 'Private columns exposed'; end if;
  if (select count(*) from storage.objects where bucket_id = 'business-assets') <> 2 then raise exception 'Active asset policy failed'; end if;
end $$;
reset role;
set local role service_role;
insert into public.business_asset_cleanup (path, run_after) values ('00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000011/logo.png', now() + interval '1 hour');
select public.save_business(
  '00000000-0000-4000-8000-000000000001',
  '{"name":"Edited Business","ntn":"1234567-8","email":"company@example.com","phone":"03000000000","address":"Test Islamabad"}',
  '{"path":"00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000011/logo.png"}',
  '{"path":"00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000010/signature.png"}', 1,
  '00000000-0000-4000-8000-000000000099'
);
do $$ declare b public.businesses%rowtype; begin
  select * into b from public.businesses where id = '00000000-0000-4000-8000-000000000001';
  if b.revision <> 2 then raise exception 'Revision failed'; end if;
  if not exists(select 1 from public.business_asset_cleanup where path like '%/00000000-0000-4000-8000-000000000010/logo.png') then raise exception 'Old asset not queued'; end if;
  if exists(select 1 from public.business_asset_cleanup where path = b.logo->>'path') then raise exception 'Active asset reservation not cleared'; end if;
  begin
    perform public.save_business(b.id, to_jsonb(b), b.logo, b.signature, 1, b.updated_by);
    raise exception 'Stale edit succeeded';
  exception when raise_exception then
    if sqlerrm <> 'business_changed' then raise; end if;
  end;
end $$;
select public.claim_business_deletion('00000000-0000-4000-8000-000000000001', 2, '00000000-0000-4000-8000-000000000050');
do $$ declare b public.businesses%rowtype; begin
  select * into b from public.businesses where id = '00000000-0000-4000-8000-000000000001';
  if not b.deletion_pending then raise exception 'Deletion not marked'; end if;
  begin
    perform public.claim_business_deletion(b.id, 2, '00000000-0000-4000-8000-000000000051');
    raise exception 'Concurrent delete succeeded';
  exception when raise_exception then if sqlerrm <> 'deletion_busy' then raise; end if; end;
  begin
    perform public.save_business(b.id, to_jsonb(b), b.logo, b.signature, 2, b.updated_by);
    raise exception 'Edit during deletion succeeded';
  exception when raise_exception then if sqlerrm <> 'deletion_pending' then raise; end if; end;
  if public.finish_business_deletion(b.id, null) then raise exception 'Null token allowed'; end if;
  if public.finish_business_deletion(b.id, '00000000-0000-4000-8000-000000000051') then raise exception 'Stale token allowed'; end if;
end $$;
reset role;
set local role authenticated;
do $$ begin
  if (select count(*) from storage.objects where bucket_id = 'business-assets') <> 0 then raise exception 'Deletion-pending assets readable'; end if;
end $$;
reset role;
set local role service_role;
select public.release_business_deletion('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000050');
do $$ begin
  if not (select deletion_pending and deletion_token is null and deletion_locked_until is null from public.businesses where id = '00000000-0000-4000-8000-000000000001') then raise exception 'Retry state lost'; end if;
end $$;
select public.claim_business_deletion('00000000-0000-4000-8000-000000000001', 2, '00000000-0000-4000-8000-000000000051');
select public.finish_business_deletion('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051');
do $$ begin
  if exists(select 1 from public.businesses where id = '00000000-0000-4000-8000-000000000001') then raise exception 'Deletion did not finish'; end if;
end $$;
reset role;
rollback;
