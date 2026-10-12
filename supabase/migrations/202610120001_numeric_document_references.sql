begin;

do $$
begin
  if to_regclass('public.quotations') is null or to_regclass('public.sales_documents') is null then
    raise exception using message = 'Document numbering prerequisites are missing.',
      hint = 'Apply the quotation and 202610100002_sales_documents.sql migrations first. Do not rerun migrations already applied.';
  end if;
end;
$$;

-- Keep issuance out of the seed/trigger transition; existing records are never updated.
lock table public.quotations, public.sales_documents in share row exclusive mode;

create table public.document_reference_counters (
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('quotation', 'invoice', 'challan')),
  last_number bigint not null check (last_number >= 3524),
  primary key (business_id, kind)
);
alter table public.document_reference_counters enable row level security;
revoke all on public.document_reference_counters from public, anon, authenticated;
grant select, insert, update on public.document_reference_counters to service_role;

do $$
begin
  if exists (
    select 1 from (
      select reference from public.quotations where reference ~ '^[0-9]+$'
      union all
      select reference from public.sales_documents where reference ~ '^[0-9]+$'
    ) issued where reference::numeric >= 9223372036854775807
  ) then
    raise exception using message = 'An existing numeric document reference exceeds the supported numbering range.',
      hint = 'Review that reference before applying this migration. No issued documents have been changed.';
  end if;
end;
$$;

insert into public.document_reference_counters (business_id, kind, last_number)
select business_id, kind, greatest(3524, max(reference::numeric))::bigint
from (
  select business_id, 'quotation'::text as kind, reference from public.quotations where reference ~ '^[0-9]+$'
  union all
  select business_id, kind, reference from public.sales_documents where reference ~ '^[0-9]+$'
) issued group by business_id, kind;

create function public.assign_document_reference()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare document_kind text; assigned_number bigint;
begin
  if tg_table_name = 'quotations' then document_kind := 'quotation';
  else document_kind := new.kind; end if;
  insert into public.document_reference_counters (business_id, kind, last_number)
    values (new.business_id, document_kind, 3525)
    on conflict (business_id, kind) do update set last_number = public.document_reference_counters.last_number + 1
    returning last_number into assigned_number;
  new.reference := assigned_number::text;
  return new;
end;
$$;
revoke all on function public.assign_document_reference() from public, anon, authenticated;
grant execute on function public.assign_document_reference() to service_role;

-- These triggers replace legacy RPC-generated prefixes without changing the creation API.
create trigger quotation_reference_numbering before insert on public.quotations
  for each row execute function public.assign_document_reference();
create trigger sales_document_reference_numbering before insert on public.sales_documents
  for each row execute function public.assign_document_reference();

notify pgrst, 'reload schema';
commit;
