alter table public.stock_movements
  add constraint stock_movements_quantity_direction_check
  check (
    (
      movement_type in ('purchase', 'return', 'opening')
      and quantity_base > 0
    )
    or (
      movement_type in ('sale', 'damaged', 'expired')
      and quantity_base < 0
    )
    or (
      movement_type = 'adjustment'
      and quantity_base <> 0
    )
  );

drop policy if exists "stock_movements_insert_member" on public.stock_movements;

create policy "stock_movements_insert_staff"
on public.stock_movements for insert
to authenticated
with check (
  public.has_pharmacy_role(
    pharmacy_id,
    array['owner', 'manager', 'pharmacist']
  )
);

create or replace function public.prevent_stock_movement_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (
      select 1
      from public.pharmacies
      where id = old.pharmacy_id
    ) then
      return old;
    end if;
  end if;

  raise exception 'Stock movements are immutable'
    using errcode = '42501';
end;
$$;

create or replace function public.guard_medicine_stock_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if current_setting('app.stock_ledger', true) is distinct from 'on' then
    if tg_op = 'INSERT' then
      if new.stock <> 0 then
        raise exception 'Initial stock must be recorded through stock_movements'
          using errcode = '42501';
      end if;
    elsif new.stock is distinct from old.stock then
      raise exception 'Medicine stock must be changed through stock_movements'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_stock integer;
begin
  select stock
  into v_stock
  from public.medicines
  where id = new.medicine_id
  for update;

  if not found then
    raise exception 'Medicine not found';
  end if;

  if v_stock + new.quantity_base < 0 then
    raise exception 'Insufficient stock for medicine %', new.medicine_id
      using errcode = '23514';
  end if;

  perform set_config('app.stock_ledger', 'on', true);

  update public.medicines
  set stock = stock + new.quantity_base
  where id = new.medicine_id;

  perform set_config('app.stock_ledger', 'off', true);

  return new;
end;
$$;

drop trigger if exists stock_movements_prevent_mutation on public.stock_movements;

create trigger stock_movements_prevent_mutation
before update or delete on public.stock_movements
for each row execute function public.prevent_stock_movement_mutation();

drop trigger if exists stock_movements_apply on public.stock_movements;

create trigger stock_movements_apply
after insert on public.stock_movements
for each row execute function public.apply_stock_movement();

drop trigger if exists medicines_guard_stock_update on public.medicines;

create trigger medicines_guard_stock_update
before insert or update of stock on public.medicines
for each row execute function public.guard_medicine_stock_update();

revoke all on function public.prevent_stock_movement_mutation() from public;
revoke all on function public.prevent_stock_movement_mutation() from anon;
revoke all on function public.prevent_stock_movement_mutation() from authenticated;
revoke all on function public.guard_medicine_stock_update() from public;
revoke all on function public.guard_medicine_stock_update() from anon;
revoke all on function public.guard_medicine_stock_update() from authenticated;
revoke all on function public.apply_stock_movement() from public;
revoke all on function public.apply_stock_movement() from anon;
revoke all on function public.apply_stock_movement() from authenticated;
