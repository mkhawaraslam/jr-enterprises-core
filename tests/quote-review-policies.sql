-- Execute after both migrations in the isolated local database. All test rows roll back.
begin;
do $$ begin
  if current_database() <> 'jr_quotes_test' then raise exception 'Use the isolated jr_quotes_test database'; end if;
end $$;
insert into public.quote_requests (id, full_name, phone, requirements, photos, submission_token_hash, submitted_at, reviewed_at, reviewed_by)
values
  ('00000000-0000-4000-8000-000000000011', 'New Buyer', '03026500974', 'Cylinder', '[{"path":"00000000-0000-4000-8000-000000000011/1.png","size":100}]', repeat('a',64), now(), null, null),
  ('00000000-0000-4000-8000-000000000012', 'Reviewed Buyer', '03026500974', 'Valve', '[]', repeat('b',64), now(), now(), '00000000-0000-4000-8000-000000000099'),
  ('00000000-0000-4000-8000-000000000013', 'Pending Buyer', '03026500974', 'Valve', '[]', repeat('c',64), null, null, null);
insert into storage.objects (bucket_id, name) values ('quote-request-photos', '00000000-0000-4000-8000-000000000011/1.png');

set local role anon;
do $$ begin
  if has_function_privilege(current_user, 'public.get_quote_request_counts()', 'EXECUTE') then raise exception 'Anonymous counter read leaked'; end if;
  if has_function_privilege(current_user, 'public.list_quote_requests(text,integer,text)', 'EXECUTE') then raise exception 'Anonymous list leaked'; end if;
end $$;

set local role authenticated;
do $$ declare blocked boolean := false;
begin
  if public.get_quote_request_counts() <> '{"total":2,"unreviewed":1}'::jsonb then raise exception 'Shared counts include pending or lose reviewed status'; end if;
  if (public.list_quote_requests('',1,'new')->>'count')::int <> 1 then raise exception 'New filter failed'; end if;
  if (public.list_quote_requests('Reviewed Buyer',1,'reviewed')->>'count')::int <> 1 then raise exception 'Reviewed filter/search failed'; end if;
  if (public.list_quote_requests('Pending Buyer',1,'all')->>'count')::int <> 0 then raise exception 'Pending row leaked'; end if;
  if has_function_privilege(current_user, 'public.set_quote_request_review(uuid,boolean,uuid)', 'EXECUTE')
    or has_function_privilege(current_user, 'public.claim_quote_cleanup(uuid,text,uuid)', 'EXECUTE')
    or has_function_privilege(current_user, 'public.finish_quote_cleanup(uuid,uuid)', 'EXECUTE')
    or has_function_privilege(current_user, 'public.release_quote_cleanup(uuid,uuid)', 'EXECUTE') then raise exception 'Browser mutation privileges leaked'; end if;
  if has_table_privilege(current_user, 'public.quote_requests', 'INSERT,UPDATE,DELETE') then raise exception 'Browser writes leaked'; end if;
  begin perform cleanup_token from public.quote_requests; exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'Cleanup tokens must remain private'; end if;
  blocked := false;
  begin perform paths from public.quote_photo_cleanup; exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'Cleanup queue must remain private'; end if;
  if (select count(*) from storage.objects) <> 1 then raise exception 'Submitted photos inaccessible'; end if;
end $$;

set local role service_role;
do $$ declare blocked boolean := false; reviewed jsonb; original_review timestamptz;
begin
  begin perform public.claim_quote_cleanup('00000000-0000-4000-8000-000000000011','request','00000000-0000-4000-8000-000000000081');
  exception when raise_exception then if sqlerrm <> 'review_required' then raise; end if; blocked := true; end;
  if not blocked then raise exception 'Unreviewed request must not be deleted'; end if;
  reviewed := public.set_quote_request_review('00000000-0000-4000-8000-000000000011',true,'00000000-0000-4000-8000-000000000099');
  original_review := (reviewed->>'reviewed_at')::timestamptz;
  reviewed := public.set_quote_request_review('00000000-0000-4000-8000-000000000011',true,'00000000-0000-4000-8000-000000000098');
  if reviewed->>'reviewed_by' <> '00000000-0000-4000-8000-000000000099' or (reviewed->>'reviewed_at')::timestamptz <> original_review then raise exception 'Idempotent review lost its original reviewer'; end if;
  perform public.set_quote_request_review('00000000-0000-4000-8000-000000000011',false,'00000000-0000-4000-8000-000000000098');
  if (select reviewed_at from public.quote_requests where id='00000000-0000-4000-8000-000000000011') is not null then raise exception 'Mark as new failed'; end if;
  perform public.set_quote_request_review('00000000-0000-4000-8000-000000000011',true,'00000000-0000-4000-8000-000000000099');
  perform public.claim_quote_cleanup('00000000-0000-4000-8000-000000000011','photos','00000000-0000-4000-8000-000000000081');
  blocked := false;
  begin perform public.claim_quote_cleanup('00000000-0000-4000-8000-000000000011','request','00000000-0000-4000-8000-000000000082');
  exception when raise_exception then if sqlerrm <> 'cleanup_conflict' then raise; end if; blocked := true; end;
  if not blocked then raise exception 'Concurrent cleanup must be rejected'; end if;
  blocked := false;
  begin perform public.set_quote_request_review('00000000-0000-4000-8000-000000000011',false,'00000000-0000-4000-8000-000000000099');
  exception when raise_exception then if sqlerrm <> 'cleanup_conflict' then raise; end if; blocked := true; end;
  if not blocked then raise exception 'Review changed while cleanup was pending'; end if;
  if public.finish_quote_cleanup('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000082') then raise exception 'Stale token finalized cleanup'; end if;
  perform public.release_quote_cleanup('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000081');
  if (select cleanup_action from public.quote_requests where id='00000000-0000-4000-8000-000000000011') <> 'photos' then raise exception 'Release lost retry state'; end if;
  perform public.claim_quote_cleanup('00000000-0000-4000-8000-000000000011','photos','00000000-0000-4000-8000-000000000082');
  if not public.finish_quote_cleanup('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000082') then raise exception 'Photo cleanup did not finish'; end if;
  if (select photos from public.quote_requests where id='00000000-0000-4000-8000-000000000011') <> '[]'::jsonb then raise exception 'Photo references not removed'; end if;
  if (select full_name from public.quote_requests where id='00000000-0000-4000-8000-000000000011') <> 'New Buyer' then raise exception 'Photo cleanup lost contact details'; end if;
  if not exists (select 1 from public.quote_photo_cleanup where request_id='00000000-0000-4000-8000-000000000011' and paths=array['00000000-0000-4000-8000-000000000011/1.png'] and run_after > now()) then raise exception 'Final cleanup queue missing'; end if;
  perform public.claim_quote_cleanup('00000000-0000-4000-8000-000000000012','request','00000000-0000-4000-8000-000000000081');
  perform public.finish_quote_cleanup('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000081');
  if exists(select 1 from public.quote_requests where id='00000000-0000-4000-8000-000000000012') then raise exception 'Request deletion failed'; end if;
end $$;

set local role authenticated;
do $$ begin
  if public.get_quote_request_counts() <> '{"total":1,"unreviewed":0}'::jsonb then raise exception 'Counts stale after review/deletion'; end if;
  if exists (select 1 from storage.objects) then raise exception 'Removed photo can still be signed by a browser client'; end if;
end $$;
reset role;
do $$ begin raise notice 'Review/cleanup SQL checks passed: shared counts, protected mutations, leases, retries, deletion and private final cleanup queue.'; end $$;
rollback;
