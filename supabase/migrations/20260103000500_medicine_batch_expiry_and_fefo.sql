-- Phase 1.5: medicine batch expiry tracking and FEFO foundation.
-- Expiry belongs to purchase_batches, never to medicines.
-- The stock ledger remains the source of truth for stock quantities.

do $$
begin
  if exists (
    select 1
    from public.purchase_batches
    where quantity_remaining_base > quantity_received_base
  ) then
    raise exception 'purchase_batches contains remaining quantities greater than received quantities';
  end if;
end;
$$;

alter table public.purchase_batches
  add constraint purchase_batches_pharmacy_medicine_id_key
  unique (pharmacy_id, medicine_id, id);

alter table public.sale_items
  add constraint sale_items_pharmacy_medicine_id_key
  unique (pharmacy_id, medicine_id, id);

alter table public.purchase_batches
  add constraint purchase_batches_remaining_lte_received
  check (quantity_remaining_base <= quantity_received_base),
  add constraint purchase_batches_expiry_date_sane
  check (expiry_date is null or expiry_date >= date '1900-01-01');

alter table public.stock_movements
  add column if not exists purchase_batch_id uuid;

alter table public.stock_movements
  add constraint stock_movements_pharmacy_medicine_batch_fkey
  foreign key (pharmacy_id, medicine_id, purchase_batch_id)
  references public.purchase_batches (pharmacy_id, medicine_id, id)
  on delete cascade on update restrict;

create unique index if not exists stock_movements_sale_item_batch_uidx
  on public.stock_movements (pharmacy_id, reference_id, purchase_batch_id)
  where movement_type = 'sale'
    and reference_type = 'sale_item'
    and purchase_batch_id is not null;

create index if not exists idx_stock_movements_pharmacy_batch
  on public.stock_movements (pharmacy_id, purchase_batch_id, created_at desc);

create table if not exists public.sale_batch_allocations (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  sale_item_id uuid not null,
  medicine_id uuid not null,
  purchase_batch_id uuid not null,
  quantity_base integer not null check (quantity_base > 0),
  created_at timestamptz not null default now(),
  unique (sale_item_id, purchase_batch_id),
  constraint sale_batch_allocations_sale_item_fkey
    foreign key (pharmacy_id, medicine_id, sale_item_id)
    references public.sale_items (pharmacy_id, medicine_id, id)
    on delete cascade on update restrict,
  constraint sale_batch_allocations_purchase_batch_fkey
    foreign key (pharmacy_id, medicine_id, purchase_batch_id)
    references public.purchase_batches (pharmacy_id, medicine_id, id)
    on delete cascade on update restrict
);

alter table public.sale_batch_allocations enable row level security;

create policy "sale_batch_allocations_select_member"
on public.sale_batch_allocations for select
using (public.is_pharmacy_member(pharmacy_id));

create index if not exists idx_sale_batch_allocations_pharmacy_batch
  on public.sale_batch_allocations (pharmacy_id, purchase_batch_id);

create index if not exists idx_purchase_batches_pharmacy_expiry
  on public.purchase_batches (pharmacy_id, expiry_date, id)
  where expiry_date is not null;

create index if not exists idx_purchase_batches_fefo
  on public.purchase_batches (
    pharmacy_id,
    medicine_id,
    expiry_date,
    received_date,
    created_at,
    id
  )
  where quantity_remaining_base > 0
    and expiry_date is not null;

create or replace function public.batch_expiry_status(
  p_expiry_date date,
  p_as_of date default current_date,
  p_upcoming_days integer default 90,
  p_soon_days integer default 60,
  p_urgent_days integer default 30
)
returns text
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_as_of date := coalesce(p_as_of, current_date);
  v_days integer;
begin
  if p_urgent_days < 0
     or p_soon_days < p_urgent_days
     or p_upcoming_days < p_soon_days
  then
    raise exception 'Expiry thresholds must satisfy 0 <= urgent <= soon <= upcoming'
      using errcode = '22023';
  end if;

  if p_expiry_date is null then
    return 'unknown';
  end if;

  v_days := p_expiry_date - v_as_of;

  if v_days <= 0 then
    return 'expired';
  end if;

  if v_days <= p_urgent_days then
    return 'urgent';
  end if;

  if v_days <= p_soon_days then
    return 'expiring_soon';
  end if;

  if v_days <= p_upcoming_days then
    return 'upcoming';
  end if;

  return 'normal';
end;
$$;

create or replace function public.protect_purchase_batch_expiry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE'
     and old.expiry_date is not null
     and new.expiry_date is distinct from old.expiry_date
  then
    raise exception 'Batch expiry date is immutable once recorded'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.guard_purchase_batch_remaining()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE'
     and new.quantity_remaining_base is distinct from old.quantity_remaining_base
     and current_setting('app.batch_ledger', true) is distinct from 'on'
  then
    raise exception 'Batch remaining quantity must be changed through stock_movements'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_purchase_batch_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from public.pharmacies
    where id = old.pharmacy_id
  ) then
    if exists (
      select 1
      from public.stock_movements
      where purchase_batch_id = old.id
    ) or exists (
      select 1
      from public.sale_batch_allocations
      where purchase_batch_id = old.id
    ) then
      raise exception 'Cannot delete a purchase batch with stock history'
        using errcode = '42501';
    end if;
  end if;

  return old;
end;
$$;

create or replace function public.apply_stock_movement_to_batch()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_remaining integer;
  v_received integer;
begin
  if new.purchase_batch_id is null then
    return new;
  end if;

  if new.movement_type in ('purchase', 'opening') then
    raise exception 'Purchase and opening movements cannot reference an existing batch'
      using errcode = '42501';
  end if;

  select quantity_remaining_base, quantity_received_base
  into v_remaining, v_received
  from public.purchase_batches
  where id = new.purchase_batch_id
  for update;

  if not found then
    raise exception 'Purchase batch not found';
  end if;

  if v_remaining + new.quantity_base < 0 then
    raise exception 'Insufficient quantity in purchase batch %', new.purchase_batch_id
      using errcode = '23514';
  end if;

  if v_remaining + new.quantity_base > v_received then
    raise exception 'Purchase batch quantity cannot exceed its received quantity'
      using errcode = '23514';
  end if;

  perform set_config('app.batch_ledger', 'on', true);

  update public.purchase_batches
  set quantity_remaining_base = quantity_remaining_base + new.quantity_base
  where id = new.purchase_batch_id;

  perform set_config('app.batch_ledger', 'off', true);

  return new;
end;
$$;

create or replace function public.validate_sale_batch_allocation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item_base integer;
  v_batch record;
begin
  select base_quantity
  into v_item_base
  from public.sale_items
  where id = new.sale_item_id
    and pharmacy_id = new.pharmacy_id
    and medicine_id = new.medicine_id;

  if not found then
    raise exception 'Sale item does not match the allocation pharmacy and medicine';
  end if;

  select expiry_date, quantity_remaining_base
  into v_batch
  from public.purchase_batches
  where id = new.purchase_batch_id
    and pharmacy_id = new.pharmacy_id
    and medicine_id = new.medicine_id
  for update;

  if not found then
    raise exception 'Purchase batch does not match the allocation pharmacy and medicine';
  end if;

  if v_batch.expiry_date is null then
    raise exception 'Cannot allocate a batch without an expiry date';
  end if;

  if v_batch.expiry_date <= current_date then
    raise exception 'Cannot allocate an expired batch';
  end if;

  if new.quantity_base > v_batch.quantity_remaining_base then
    raise exception 'Allocation exceeds the batch remaining quantity';
  end if;

  if new.quantity_base > v_item_base then
    raise exception 'Allocation exceeds the sale item quantity';
  end if;

  return new;
end;
$$;

create or replace function public.assert_sale_item_batch_allocation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sale_item_id uuid;
  v_base_quantity integer;
  v_allocated integer;
begin
  if tg_table_name = 'sale_items' then
    v_sale_item_id := new.id;
  elsif tg_op = 'DELETE' then
    v_sale_item_id := old.sale_item_id;
  else
    v_sale_item_id := new.sale_item_id;
  end if;

  select base_quantity
  into v_base_quantity
  from public.sale_items
  where id = v_sale_item_id;

  if not found then
    return null;
  end if;

  select coalesce(sum(quantity_base), 0)
  into v_allocated
  from public.sale_batch_allocations
  where sale_item_id = v_sale_item_id;

  if v_allocated > 0 and v_allocated <> v_base_quantity then
    raise exception 'Sale item batch allocations do not match the line quantity';
  end if;

  return null;
end;
$$;

create or replace function public.prevent_sale_batch_allocation_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (
      select 1
      from public.sale_items
      where id = old.sale_item_id
    ) then
      return old;
    end if;
  end if;

  raise exception 'Sale batch allocations are immutable'
    using errcode = '42501';
end;
$$;

create or replace function public.allocate_sale_batches_fefo(p_sale_item_id uuid)
returns table (
  batch_id uuid,
  allocated_quantity_base integer,
  expiry_date date
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item public.sale_items%rowtype;
  v_batch record;
  v_remaining integer;
  v_take integer;
  v_cogs numeric(14, 2) := 0;
begin
  select *
  into v_item
  from public.sale_items
  where id = p_sale_item_id
  for update;

  if not found then
    raise exception 'Sale item not found';
  end if;

  if not public.is_pharmacy_member(v_item.pharmacy_id) then
    raise exception 'Not a member of this pharmacy'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.sale_batch_allocations
    where sale_item_id = p_sale_item_id
  ) then
    raise exception 'Sale item already has batch allocations';
  end if;

  v_remaining := v_item.base_quantity;

  if v_remaining <= 0 then
    raise exception 'Sale item quantity must be positive';
  end if;

  for v_batch in
    select
      b.id,
      b.expiry_date,
      b.quantity_remaining_base,
      b.unit_cost_base
    from public.purchase_batches b
    where b.pharmacy_id = v_item.pharmacy_id
      and b.medicine_id = v_item.medicine_id
      and b.quantity_remaining_base > 0
      and b.expiry_date is not null
      and b.expiry_date > current_date
    order by
      b.expiry_date asc,
      b.received_date asc,
      b.created_at asc,
      b.id asc
    for update
  loop
    exit when v_remaining <= 0;

    v_take := least(v_batch.quantity_remaining_base, v_remaining);

    insert into public.sale_batch_allocations (
      pharmacy_id,
      sale_item_id,
      medicine_id,
      purchase_batch_id,
      quantity_base
    )
    values (
      v_item.pharmacy_id,
      v_item.id,
      v_item.medicine_id,
      v_batch.id,
      v_take
    );

    insert into public.stock_movements (
      pharmacy_id,
      medicine_id,
      movement_type,
      quantity_base,
      purchase_batch_id,
      reference_type,
      reference_id,
      reason,
      client_reference
    )
    values (
      v_item.pharmacy_id,
      v_item.medicine_id,
      'sale',
      -v_take,
      v_batch.id,
      'sale_item',
      v_item.id,
      'FEFO sale allocation',
      format('fefo:%s:%s', v_item.id, v_batch.id)
    );

    v_cogs := v_cogs + (v_take * v_batch.unit_cost_base);
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'Insufficient unexpired batch stock for sale item %', p_sale_item_id;
  end if;

  update public.sale_items
  set cogs = round(v_cogs, 2),
      cost_status = 'available',
      costed_base_quantity = base_quantity,
      uncosted_base_quantity = 0
  where id = p_sale_item_id;

  return query
    select
      a.purchase_batch_id,
      a.quantity_base,
      b.expiry_date
    from public.sale_batch_allocations a
    join public.purchase_batches b on b.id = a.purchase_batch_id
    where a.sale_item_id = p_sale_item_id
    order by
      b.expiry_date asc,
      b.received_date asc,
      b.created_at asc,
      b.id asc;
end;
$$;

drop trigger if exists purchase_batches_protect_expiry on public.purchase_batches;
create trigger purchase_batches_protect_expiry
before update on public.purchase_batches
for each row execute function public.protect_purchase_batch_expiry();

drop trigger if exists purchase_batches_guard_remaining on public.purchase_batches;
create trigger purchase_batches_guard_remaining
before update on public.purchase_batches
for each row execute function public.guard_purchase_batch_remaining();

drop trigger if exists purchase_batches_prevent_delete on public.purchase_batches;
create trigger purchase_batches_prevent_delete
before delete on public.purchase_batches
for each row execute function public.prevent_purchase_batch_delete();

drop trigger if exists stock_movements_apply_to_batch on public.stock_movements;
create trigger stock_movements_apply_to_batch
after insert on public.stock_movements
for each row execute function public.apply_stock_movement_to_batch();

drop trigger if exists sale_batch_allocations_validate on public.sale_batch_allocations;
create trigger sale_batch_allocations_validate
before insert or update on public.sale_batch_allocations
for each row execute function public.validate_sale_batch_allocation();

drop trigger if exists sale_batch_allocations_prevent_mutation on public.sale_batch_allocations;
create trigger sale_batch_allocations_prevent_mutation
before update or delete on public.sale_batch_allocations
for each row execute function public.prevent_sale_batch_allocation_mutation();

drop trigger if exists sale_batch_allocations_total_deferred on public.sale_batch_allocations;
create constraint trigger sale_batch_allocations_total_deferred
after insert or update or delete on public.sale_batch_allocations
deferrable initially deferred
for each row execute function public.assert_sale_item_batch_allocation();

drop trigger if exists sale_items_batch_allocation_deferred on public.sale_items;
create constraint trigger sale_items_batch_allocation_deferred
after update of base_quantity on public.sale_items
deferrable initially deferred
for each row execute function public.assert_sale_item_batch_allocation();

create or replace view public.medicine_batch_expiry_alerts
with (security_invoker = true) as
select
  b.id as batch_id,
  b.pharmacy_id,
  b.medicine_id,
  m.name as medicine_name,
  m.strength as medicine_strength,
  b.batch_number,
  b.expiry_date,
  b.quantity_received_base,
  b.quantity_remaining_base,
  b.received_date,
  b.supplier_name,
  case
    when b.expiry_date is null then null
    else b.expiry_date - current_date
  end as days_remaining,
  public.batch_expiry_status(b.expiry_date) as expiry_status,
  (
    b.expiry_date is not null
    and b.expiry_date <= current_date
  ) as is_expired,
  (
    b.expiry_date is not null
    and b.expiry_date > current_date
    and b.quantity_remaining_base > 0
  ) as is_allocatable
from public.purchase_batches b
join public.medicines m
  on m.id = b.medicine_id
 and m.pharmacy_id = b.pharmacy_id;

create or replace view public.medicine_batch_fefo_candidates
with (security_invoker = true) as
select
  b.id as batch_id,
  b.pharmacy_id,
  b.medicine_id,
  m.name as medicine_name,
  m.strength as medicine_strength,
  b.batch_number,
  b.expiry_date,
  b.quantity_remaining_base,
  b.received_date,
  row_number() over (
    partition by b.pharmacy_id, b.medicine_id
    order by
      b.expiry_date asc,
      b.received_date asc,
      b.created_at asc,
      b.id asc
  ) as fefo_rank
from public.purchase_batches b
join public.medicines m
  on m.id = b.medicine_id
 and m.pharmacy_id = b.pharmacy_id
where b.quantity_remaining_base > 0
  and b.expiry_date is not null
  and b.expiry_date > current_date;

revoke all on function public.batch_expiry_status(date, date, integer, integer, integer) from public;
revoke all on function public.batch_expiry_status(date, date, integer, integer, integer) from anon;
grant execute on function public.batch_expiry_status(date, date, integer, integer, integer) to authenticated;

revoke all on function public.allocate_sale_batches_fefo(uuid) from public;
revoke all on function public.allocate_sale_batches_fefo(uuid) from anon;
grant execute on function public.allocate_sale_batches_fefo(uuid) to authenticated;

revoke all on function public.protect_purchase_batch_expiry() from public;
revoke all on function public.protect_purchase_batch_expiry() from anon;
revoke all on function public.protect_purchase_batch_expiry() from authenticated;

revoke all on function public.guard_purchase_batch_remaining() from public;
revoke all on function public.guard_purchase_batch_remaining() from anon;
revoke all on function public.guard_purchase_batch_remaining() from authenticated;

revoke all on function public.prevent_purchase_batch_delete() from public;
revoke all on function public.prevent_purchase_batch_delete() from anon;
revoke all on function public.prevent_purchase_batch_delete() from authenticated;

revoke all on function public.apply_stock_movement_to_batch() from public;
revoke all on function public.apply_stock_movement_to_batch() from anon;
revoke all on function public.apply_stock_movement_to_batch() from authenticated;

revoke all on function public.validate_sale_batch_allocation() from public;
revoke all on function public.validate_sale_batch_allocation() from anon;
revoke all on function public.validate_sale_batch_allocation() from authenticated;

revoke all on function public.assert_sale_item_batch_allocation() from public;
revoke all on function public.assert_sale_item_batch_allocation() from anon;
revoke all on function public.assert_sale_item_batch_allocation() from authenticated;

revoke all on function public.prevent_sale_batch_allocation_mutation() from public;
revoke all on function public.prevent_sale_batch_allocation_mutation() from anon;
revoke all on function public.prevent_sale_batch_allocation_mutation() from authenticated;

revoke all on table public.sale_batch_allocations from public;
revoke all on table public.sale_batch_allocations from anon;
revoke all on table public.sale_batch_allocations from authenticated;
grant select on table public.sale_batch_allocations to authenticated;

revoke all on table public.medicine_batch_expiry_alerts from public;
revoke all on table public.medicine_batch_expiry_alerts from anon;
revoke all on table public.medicine_batch_expiry_alerts from authenticated;
grant select on table public.medicine_batch_expiry_alerts to authenticated;

revoke all on table public.medicine_batch_fefo_candidates from public;
revoke all on table public.medicine_batch_fefo_candidates from anon;
revoke all on table public.medicine_batch_fefo_candidates from authenticated;
grant select on table public.medicine_batch_fefo_candidates to authenticated;
