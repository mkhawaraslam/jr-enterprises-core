begin;

do $$
begin
  if to_regprocedure('public.reference_layout_for_hash(text)') is null then
    raise exception using message = 'Letterhead prerequisites are missing.',
      hint = 'Apply 202610110004_letterhead_reference_layout.sql first. Do not rerun migrations already applied.';
  end if;
end;
$$;

-- The optional header is versioned in each approved definition; old definitions stay valid.
create or replace function public.valid_business_document_layout(d jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare r record; brand jsonb;
begin
  if jsonb_typeof(d) is distinct from 'object' then return false; end if;
  if d->'schema' = '1'::jsonb then return public.valid_business_document_layout_v1(d); end if;
  if d ? 'letterhead' then
    brand := d->'letterhead';
    if d->>'reference' is distinct from 'letterhead-grid-v1' or jsonb_typeof(brand) is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(brand)) <> 2 or not brand ?& array['namePosition','website']
      or brand->>'namePosition' is null or brand->>'namePosition' not in ('below-logo','beside-logo')
      or jsonb_typeof(brand->'website') is distinct from 'string' or char_length(brand->>'website') > 100
      or brand->>'website' ~ '[\x01-\x1f\x7f]'
      or (brand->>'website' <> '' and brand->>'website' !~* '^(https?://)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(/[^[:space:]]*)?$') then return false; end if;
    d := d - 'letterhead';
  end if;
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

notify pgrst, 'reload schema';
commit;
