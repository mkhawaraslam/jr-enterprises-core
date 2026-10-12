begin;

do $$
begin
  if to_regprocedure('public.valid_business_document_layout_v1(jsonb)') is null then
    raise exception using message = 'Reference layout prerequisites are missing.',
      hint = 'Apply 202610110001_business_document_layouts.sql and 202610110002_supplier_reference_layout.sql first. Do not rerun migrations already applied.';
  end if;
end;
$$;

create function public.reference_layout_for_hash(p_hash text)
returns text language sql immutable security invoker set search_path = '' as $$
  select case p_hash
    when '98f526fe0afcae70f54166dbafc6dd617ed9f1da61350e0b60013fa45baf951a' then 'supplier-grid-v1'
    when 'e783a62de36c63dfbb888c1967fadeaa6874e151671d821c5fbc3b5551c37e62' then 'letterhead-grid-v1'
    else null end;
$$;
revoke all on function public.reference_layout_for_hash(text) from public, anon, authenticated;
grant execute on function public.reference_layout_for_hash(text) to service_role;

create or replace function public.valid_business_document_layout(d jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare r record;
begin
  if jsonb_typeof(d) is distinct from 'object' then return false; end if;
  if d->'schema' = '1'::jsonb then return public.valid_business_document_layout_v1(d); end if;
  if (select count(*) from jsonb_object_keys(d)) <> 9
    or not d ?& array['schema','reference','margin','logoWidth','titleSize','fontSize','density','footer','pageNumbers'] then return false; end if;
  if d->'schema' is distinct from '2'::jsonb or d->>'reference' is null
    or d->>'reference' not in ('supplier-grid-v1', 'letterhead-grid-v1')
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

alter table public.business_document_layouts drop constraint business_document_layouts_reference_check;
alter table public.business_document_layouts add constraint business_document_layouts_reference_check
  check (definition->>'schema' <> '2' or coalesce(definition->>'reference' = public.reference_layout_for_hash(format_hash), false));

create or replace function public.snapshot_business_document_layout()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare b public.businesses%rowtype; approved public.business_document_layouts%rowtype; expected_reference text;
begin
  select * into b from public.businesses where id = new.business_id for share;
  if b.billing_mode = 'custom' then
    select * into approved from public.business_document_layouts
      where business_id = b.id and format_path = b.billing_format->>'path' and format_hash = new.format_hash
      order by version desc limit 1;
    if not found or new.layout_id <> 'custom-mapped'
      or new.layout_version <> (approved.definition->>'schema')::smallint then raise exception 'document_layout_changed'; end if;
    expected_reference := public.reference_layout_for_hash(approved.format_hash);
    if expected_reference is not null and (approved.definition->>'schema' <> '2'
      or approved.definition->>'reference' is distinct from expected_reference) then raise exception 'document_layout_changed'; end if;
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
