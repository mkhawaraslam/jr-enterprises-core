begin;

do $$
begin
  if to_regclass('public.business_document_layouts') is null then
    raise exception using message = 'Document layout prerequisites are missing.',
      hint = 'Apply 202610110001_business_document_layouts.sql first.';
  end if;
end;
$$;

-- Retain schema-1 validation without renaming a function referenced by cached RPC plans.
create function public.valid_business_document_layout_v1(d jsonb)
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
revoke all on function public.valid_business_document_layout_v1(jsonb) from public, anon, authenticated;
grant execute on function public.valid_business_document_layout_v1(jsonb) to service_role;

create or replace function public.valid_business_document_layout(d jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare r record;
begin
  if jsonb_typeof(d) is distinct from 'object' then return false; end if;
  if d->'schema' = '1'::jsonb then return public.valid_business_document_layout_v1(d); end if;
  if (select count(*) from jsonb_object_keys(d)) <> 9
    or not d ?& array['schema','reference','margin','logoWidth','titleSize','fontSize','density','footer','pageNumbers'] then return false; end if;
  if d->'schema' is distinct from '2'::jsonb or d->>'reference' is distinct from 'supplier-grid-v1'
    or d->>'density' is null or not (d->>'density' = any(array['compact','normal','spacious']))
    or jsonb_typeof(d->'pageNumbers') is distinct from 'boolean'
    or jsonb_typeof(d->'footer') is distinct from 'string' or char_length(d->>'footer') > 180
    or d->>'footer' ~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]' then return false; end if;
  for r in select * from (values ('margin',26,40),('logoWidth',70,110),('titleSize',18,24),('fontSize',9,12)) as bounds(key,lo,hi) loop
    if jsonb_typeof(d->r.key) is distinct from 'number' or d->>r.key !~ '^[0-9]{1,3}$' then return false; end if;
    if (d->>r.key)::integer not between r.lo and r.hi then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.valid_business_document_layout(jsonb) from public, anon, authenticated;
grant execute on function public.valid_business_document_layout(jsonb) to service_role;

alter table public.business_document_layouts add constraint business_document_layouts_reference_check
  check (definition->>'schema' <> '2' or format_hash = '98f526fe0afcae70f54166dbafc6dd617ed9f1da61350e0b60013fa45baf951a');

alter table public.quotations drop constraint quotations_layout_version_check;
alter table public.quotations add constraint quotations_layout_version_check
  check (layout_version = 1 or (layout_id = 'custom-mapped' and layout_version = 2));
alter table public.sales_documents drop constraint sales_documents_layout_version_check;
alter table public.sales_documents add constraint sales_documents_layout_version_check
  check (layout_version = 1 or (layout_id = 'custom-mapped' and layout_version = 2));

create or replace function public.snapshot_business_document_layout()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare b public.businesses%rowtype; approved public.business_document_layouts%rowtype;
begin
  select * into b from public.businesses where id = new.business_id for share;
  if b.billing_mode = 'custom' then
    select * into approved from public.business_document_layouts
      where business_id = b.id and format_path = b.billing_format->>'path' and format_hash = new.format_hash
      order by version desc limit 1;
    if not found or new.layout_id <> 'custom-mapped'
      or new.layout_version <> (approved.definition->>'schema')::smallint
      or (approved.format_hash = '98f526fe0afcae70f54166dbafc6dd617ed9f1da61350e0b60013fa45baf951a' and approved.definition->>'schema' <> '2') then
      raise exception 'document_layout_changed';
    end if;
    new.business_snapshot := new.business_snapshot || jsonb_build_object('document_layout',
      jsonb_build_object('id',approved.id,'version',approved.version,'format_hash',approved.format_hash,'definition',approved.definition));
  elsif new.layout_id = 'custom-mapped' then
    raise exception 'document_layout_changed';
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
