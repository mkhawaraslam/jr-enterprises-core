begin;

do $$
begin
  if to_regclass('public.businesses') is null or to_regclass('public.quotations') is null or to_regclass('public.sales_documents') is null then
    raise exception using message = 'Document layout prerequisites are missing.',
      hint = 'Apply the business, quotation, and 202610100002_sales_documents.sql migrations first, in the Supabase project used by the deployment.';
  end if;
end;
$$;

create function public.valid_business_document_layout(d jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare k text; r record;
begin
  if jsonb_typeof(d) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(d)) <> 16 or not d ?& array['schema','header','titleAlign','titleSize','margin','logoWidth','fontSize','recipientSide','tableHeader','tableBorders','rows','density','notes','signatureSide','footer','pageNumbers'] then return false; end if;
  if d->'schema' <> '1'::jsonb or jsonb_typeof(d->'pageNumbers') <> 'boolean' or jsonb_typeof(d->'footer') <> 'string' or char_length(d->>'footer') > 180 then return false; end if;
  if not (d->>'header' = any(array['split','centered','compact'])) or not (d->>'titleAlign' = any(array['left','center','right']))
    or not (d->>'recipientSide' = any(array['left','right'])) or not (d->>'signatureSide' = any(array['left','right']))
    or not (d->>'tableHeader' = any(array['filled','line'])) or not (d->>'tableBorders' = any(array['horizontal','grid']))
    or not (d->>'rows' = any(array['plain','striped'])) or not (d->>'density' = any(array['compact','normal','spacious']))
    or not (d->>'notes' = any(array['columns','stacked'])) then return false; end if;
  for k in select unnest(array['schema','header','titleAlign','recipientSide','signatureSide','tableHeader','tableBorders','rows','density','notes','footer','pageNumbers']) loop
    if d->k = 'null'::jsonb then return false; end if;
  end loop;
  for r in select * from (values ('titleSize',18,32),('margin',28,56),('logoWidth',70,170),('fontSize',9,12)) as bounds(key,lo,hi) loop
    if jsonb_typeof(d->r.key) <> 'number' or d->>r.key !~ '^[0-9]{1,3}$' then return false; end if;
    if (d->>r.key)::integer not between r.lo and r.hi then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.valid_business_document_layout(jsonb) from public, anon, authenticated;
grant execute on function public.valid_business_document_layout(jsonb) to service_role;

create table public.business_document_layouts (
  id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  version integer not null check (version > 0),
  format_path text not null check (format_path ~ ('^' || business_id::text || '/[0-9a-f-]{36}/billing-format\.(pdf|jpg|png)$')),
  format_hash text not null check (format_hash ~ '^[a-f0-9]{64}$'),
  definition jsonb not null check (public.valid_business_document_layout(definition)),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (business_id, version)
);
create index business_document_layouts_current_idx on public.business_document_layouts (business_id, format_path, format_hash, version desc);
alter table public.business_document_layouts enable row level security;
revoke all on public.business_document_layouts from public, anon, authenticated, service_role;
grant select (id,business_id,version,format_path,format_hash,definition,created_at) on public.business_document_layouts to authenticated;
grant select, insert on public.business_document_layouts to service_role;
create policy business_document_layouts_read on public.business_document_layouts for select to authenticated using (true);

create function public.approve_business_document_layout(p_id uuid, p_business_id uuid, p_revision integer, p_format_path text, p_format_hash text, p_definition jsonb, p_actor uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare b public.businesses%rowtype; previous public.business_document_layouts%rowtype; next_version integer;
begin
  if p_id is null or p_actor is null or not public.valid_business_document_layout(p_definition) then raise exception 'invalid_document_layout'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 1));
  select * into previous from public.business_document_layouts where id = p_id;
  if found then
    if previous.created_by <> p_actor or previous.business_id <> p_business_id or previous.format_path <> p_format_path or previous.format_hash <> p_format_hash or previous.definition <> p_definition then raise exception 'document_layout_changed'; end if;
    return jsonb_build_object('id', previous.id, 'version', previous.version);
  end if;
  select * into b from public.businesses where id = p_business_id for update;
  if not found or b.deletion_pending or p_revision is null or b.revision <> p_revision
    or b.billing_mode <> 'custom' or b.billing_format->>'path' is distinct from p_format_path then raise exception 'business_changed'; end if;
  select coalesce(max(version), 0) + 1 into next_version from public.business_document_layouts where business_id = b.id;
  insert into public.business_document_layouts (id,business_id,version,format_path,format_hash,definition,created_by)
    values (p_id,b.id,next_version,p_format_path,p_format_hash,p_definition,p_actor);
  update public.businesses set revision = revision + 1, updated_at = now(), updated_by = p_actor where id = b.id;
  return jsonb_build_object('id', p_id, 'version', next_version);
end;
$$;
revoke all on function public.approve_business_document_layout(uuid,uuid,integer,text,text,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.approve_business_document_layout(uuid,uuid,integer,text,text,jsonb,uuid) to service_role;

alter table public.quotations drop constraint quotations_layout_id_check;
alter table public.quotations add constraint quotations_layout_id_check check (layout_id in ('industrial','ledger','minimal','reference-classic','custom-mapped'));
alter table public.sales_documents drop constraint sales_documents_layout_id_check;
alter table public.sales_documents add constraint sales_documents_layout_id_check check (layout_id in ('industrial','ledger','minimal','reference-classic','custom-mapped'));

-- Freeze the approved definition inside each issued document, under the same business lock used by creation.
create function public.snapshot_business_document_layout()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare b public.businesses%rowtype; approved public.business_document_layouts%rowtype;
begin
  select * into b from public.businesses where id = new.business_id for share;
  if b.billing_mode = 'custom' then
    if new.layout_id <> 'custom-mapped' or new.layout_version <> 1 then raise exception 'document_layout_changed'; end if;
    select * into approved from public.business_document_layouts
      where business_id = b.id and format_path = b.billing_format->>'path' and format_hash = new.format_hash
      order by version desc limit 1;
    if not found then raise exception 'document_layout_changed'; end if;
    new.business_snapshot := new.business_snapshot || jsonb_build_object('document_layout',
      jsonb_build_object('id',approved.id,'version',approved.version,'format_hash',approved.format_hash,'definition',approved.definition));
  elsif new.layout_id = 'custom-mapped' then
    raise exception 'document_layout_changed';
  end if;
  return new;
end;
$$;
revoke all on function public.snapshot_business_document_layout() from public, anon, authenticated;
grant execute on function public.snapshot_business_document_layout() to service_role;
create trigger quotation_document_layout_snapshot before insert on public.quotations for each row execute function public.snapshot_business_document_layout();
create trigger sales_document_layout_snapshot before insert on public.sales_documents for each row execute function public.snapshot_business_document_layout();

notify pgrst, 'reload schema';
commit;
