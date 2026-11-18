alter table public.purchases
  alter column recorded_by set default auth.uid();

alter table public.sales
  alter column recorded_by set default auth.uid();

alter table public.payments
  alter column recorded_by set default auth.uid();

alter table public.stock_movements
  alter column recorded_by set default auth.uid();

alter table public.subscription_payments
  alter column recorded_by set default auth.uid();

create or replace function public.enforce_recorded_by()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.recorded_by is distinct from old.recorded_by then
      raise exception 'recorded_by is immutable'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if auth.uid() is not null then
    new.recorded_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists purchases_enforce_recorded_by on public.purchases;
create trigger purchases_enforce_recorded_by
before insert or update on public.purchases
for each row execute function public.enforce_recorded_by();

drop trigger if exists sales_enforce_recorded_by on public.sales;
create trigger sales_enforce_recorded_by
before insert or update on public.sales
for each row execute function public.enforce_recorded_by();

drop trigger if exists payments_enforce_recorded_by on public.payments;
create trigger payments_enforce_recorded_by
before insert or update on public.payments
for each row execute function public.enforce_recorded_by();

drop trigger if exists stock_movements_enforce_recorded_by on public.stock_movements;
create trigger stock_movements_enforce_recorded_by
before insert or update on public.stock_movements
for each row execute function public.enforce_recorded_by();

drop trigger if exists subscription_payments_enforce_recorded_by on public.subscription_payments;
create trigger subscription_payments_enforce_recorded_by
before insert or update on public.subscription_payments
for each row execute function public.enforce_recorded_by();

alter table public.purchase_items
  add constraint purchase_items_base_quantity_math
  check (base_quantity = quantity * unit_factor),
  add constraint purchase_items_total_cost_math
  check (total_cost = quantity * unit_cost);

alter table public.sale_items
  add constraint sale_items_base_quantity_math
  check (base_quantity = quantity * unit_factor),
  add constraint sale_items_total_math
  check (total = quantity * unit_price),
  add constraint sale_items_costed_quantity_math
  check (costed_base_quantity + uncosted_base_quantity = base_quantity),
  add constraint sale_items_cost_status_math
  check (
    (
      cost_status = 'available'
      and costed_base_quantity = base_quantity
      and uncosted_base_quantity = 0
    )
    or (
      cost_status = 'partial'
      and costed_base_quantity > 0
      and uncosted_base_quantity > 0
    )
    or (
      cost_status = 'unavailable'
      and costed_base_quantity = 0
      and uncosted_base_quantity = base_quantity
      and cogs = 0
    )
  );

alter table public.payments
  drop constraint if exists payments_amount_check;

alter table public.payments
  add constraint payments_amount_positive check (amount > 0);

alter table public.subscription_payments
  drop constraint if exists subscription_payments_amount_check;

alter table public.subscription_payments
  add constraint subscription_payments_amount_positive check (amount > 0);

create or replace function public.assert_sale_total(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_total numeric(14, 2);
  v_items_total numeric(14, 2);
begin
  if p_sale_id is null then
    return;
  end if;

  select total_amount
  into v_total
  from public.sales
  where id = p_sale_id;

  if not found then
    return;
  end if;

  select coalesce(sum(total), 0)
  into v_items_total
  from public.sale_items
  where sale_id = p_sale_id;

  if v_total is distinct from v_items_total then
    raise exception 'Sale total does not match its line items';
  end if;
end;
$$;

create or replace function public.assert_purchase_total(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_total numeric(14, 2);
  v_items_total numeric(14, 2);
begin
  if p_purchase_id is null then
    return;
  end if;

  select total_cost
  into v_total
  from public.purchases
  where id = p_purchase_id;

  if not found then
    return;
  end if;

  select coalesce(sum(total_cost), 0)
  into v_items_total
  from public.purchase_items
  where purchase_id = p_purchase_id;

  if v_total is distinct from v_items_total then
    raise exception 'Purchase total does not match its line items';
  end if;
end;
$$;

create or replace function public.validate_sale_totals()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sale_id uuid;
begin
  if tg_table_name = 'sales' then
    if tg_op = 'DELETE' then
      return null;
    end if;
    perform public.assert_sale_total(new.id);
    return null;
  end if;

  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    v_sale_id := old.sale_id;
    perform public.assert_sale_total(v_sale_id);
  end if;

  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    v_sale_id := new.sale_id;
    perform public.assert_sale_total(v_sale_id);
  end if;

  return null;
end;
$$;

create or replace function public.validate_purchase_totals()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase_id uuid;
begin
  if tg_table_name = 'purchases' then
    if tg_op = 'DELETE' then
      return null;
    end if;
    perform public.assert_purchase_total(new.id);
    return null;
  end if;

  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    v_purchase_id := old.purchase_id;
    perform public.assert_purchase_total(v_purchase_id);
  end if;

  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    v_purchase_id := new.purchase_id;
    perform public.assert_purchase_total(v_purchase_id);
  end if;

  return null;
end;
$$;

create or replace function public.assert_sale_payment_balance(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_total numeric(14, 2);
  v_paid numeric(14, 2);
begin
  if p_sale_id is null then
    return;
  end if;

  select total_amount
  into v_total
  from public.sales
  where id = p_sale_id;

  if not found then
    return;
  end if;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.payments
  where sale_id = p_sale_id;

  if v_paid > v_total then
    raise exception 'Payments exceed the sale total';
  end if;
end;
$$;

create or replace function public.validate_payment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sale_total numeric(14, 2);
  v_paid numeric(14, 2);
begin
  if new.sale_id is null then
    return new;
  end if;

  select total_amount
  into v_sale_total
  from public.sales
  where id = new.sale_id
  for update;

  if not found then
    raise exception 'Sale not found';
  end if;

  select coalesce(sum(amount), 0)
  into v_paid
  from public.payments
  where sale_id = new.sale_id
    and (tg_op = 'INSERT' or id is distinct from new.id);

  if v_paid + new.amount > v_sale_total then
    raise exception 'Payment exceeds the sale total';
  end if;

  return new;
end;
$$;

create or replace function public.validate_sale_payment_balance()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_table_name = 'sales' then
    if tg_op = 'DELETE' then
      return null;
    end if;
    perform public.assert_sale_payment_balance(new.id);
    return null;
  end if;

  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    perform public.assert_sale_payment_balance(old.sale_id);
  end if;

  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    perform public.assert_sale_payment_balance(new.sale_id);
  end if;

  return null;
end;
$$;

drop trigger if exists payments_validate_payment on public.payments;
create trigger payments_validate_payment
before insert or update on public.payments
for each row execute function public.validate_payment();

drop trigger if exists sales_totals_deferred on public.sales;
create constraint trigger sales_totals_deferred
after insert or update or delete on public.sales
deferrable initially deferred
for each row execute function public.validate_sale_totals();

drop trigger if exists sale_items_totals_deferred on public.sale_items;
create constraint trigger sale_items_totals_deferred
after insert or update or delete on public.sale_items
deferrable initially deferred
for each row execute function public.validate_sale_totals();

drop trigger if exists purchases_totals_deferred on public.purchases;
create constraint trigger purchases_totals_deferred
after insert or update or delete on public.purchases
deferrable initially deferred
for each row execute function public.validate_purchase_totals();

drop trigger if exists purchase_items_totals_deferred on public.purchase_items;
create constraint trigger purchase_items_totals_deferred
after insert or update or delete on public.purchase_items
deferrable initially deferred
for each row execute function public.validate_purchase_totals();

drop trigger if exists payments_balance_deferred on public.payments;
create constraint trigger payments_balance_deferred
after insert or update or delete on public.payments
deferrable initially deferred
for each row execute function public.validate_sale_payment_balance();

drop trigger if exists sales_payment_balance_deferred on public.sales;
create constraint trigger sales_payment_balance_deferred
after insert or update or delete on public.sales
deferrable initially deferred
for each row execute function public.validate_sale_payment_balance();

revoke all on function public.enforce_recorded_by() from public;
revoke all on function public.enforce_recorded_by() from anon;
revoke all on function public.enforce_recorded_by() from authenticated;
revoke all on function public.assert_sale_total(uuid) from public;
revoke all on function public.assert_sale_total(uuid) from anon;
revoke all on function public.assert_sale_total(uuid) from authenticated;
revoke all on function public.assert_purchase_total(uuid) from public;
revoke all on function public.assert_purchase_total(uuid) from anon;
revoke all on function public.assert_purchase_total(uuid) from authenticated;
revoke all on function public.validate_sale_totals() from public;
revoke all on function public.validate_sale_totals() from anon;
revoke all on function public.validate_sale_totals() from authenticated;
revoke all on function public.validate_purchase_totals() from public;
revoke all on function public.validate_purchase_totals() from anon;
revoke all on function public.validate_purchase_totals() from authenticated;
revoke all on function public.assert_sale_payment_balance(uuid) from public;
revoke all on function public.assert_sale_payment_balance(uuid) from anon;
revoke all on function public.assert_sale_payment_balance(uuid) from authenticated;
revoke all on function public.validate_payment() from public;
revoke all on function public.validate_payment() from anon;
revoke all on function public.validate_payment() from authenticated;
revoke all on function public.validate_sale_payment_balance() from public;
revoke all on function public.validate_sale_payment_balance() from anon;
revoke all on function public.validate_sale_payment_balance() from authenticated;
