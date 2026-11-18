do $$
begin
  if exists (
    select 1
    from public.packaging_units c
    join public.medicines p on p.id = c.medicine_id
    where c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant packaging_units.medicine_id references found';
  end if;

  if exists (
    select 1
    from public.medicine_prices c
    join public.medicines p on p.id = c.medicine_id
    where c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant medicine_prices.medicine_id references found';
  end if;

  if exists (
    select 1
    from public.medicine_prices c
    join public.packaging_units p on p.id = c.packaging_unit_id
    where c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant medicine_prices.packaging_unit_id references found';
  end if;

  if exists (
    select 1
    from public.purchases c
    join public.suppliers p on p.id = c.supplier_id
    where c.supplier_id is not null
      and c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant purchases.supplier_id references found';
  end if;

  if exists (
    select 1
    from public.purchase_items c
    join public.purchases p on p.id = c.purchase_id
    where c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant purchase_items.purchase_id references found';
  end if;

  if exists (
    select 1
    from public.purchase_items c
    join public.medicines p on p.id = c.medicine_id
    where c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant purchase_items.medicine_id references found';
  end if;

  if exists (
    select 1
    from public.purchase_items c
    join public.packaging_units p on p.id = c.packaging_unit_id
    where c.packaging_unit_id is not null
      and c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant purchase_items.packaging_unit_id references found';
  end if;

  if exists (
    select 1
    from public.purchase_batches c
    join public.purchases p on p.id = c.purchase_id
    where c.purchase_id is not null
      and c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant purchase_batches.purchase_id references found';
  end if;

  if exists (
    select 1
    from public.purchase_batches c
    join public.purchase_items p on p.id = c.purchase_item_id
    where c.purchase_item_id is not null
      and c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant purchase_batches.purchase_item_id references found';
  end if;

  if exists (
    select 1
    from public.purchase_batches c
    join public.medicines p on p.id = c.medicine_id
    where c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant purchase_batches.medicine_id references found';
  end if;

  if exists (
    select 1
    from public.sale_items c
    join public.sales p on p.id = c.sale_id
    where c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant sale_items.sale_id references found';
  end if;

  if exists (
    select 1
    from public.sale_items c
    join public.medicines p on p.id = c.medicine_id
    where c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant sale_items.medicine_id references found';
  end if;

  if exists (
    select 1
    from public.sale_items c
    join public.packaging_units p on p.id = c.packaging_unit_id
    where c.packaging_unit_id is not null
      and c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant sale_items.packaging_unit_id references found';
  end if;

  if exists (
    select 1
    from public.payments c
    join public.sales p on p.id = c.sale_id
    where c.sale_id is not null
      and c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant payments.sale_id references found';
  end if;

  if exists (
    select 1
    from public.stock_movements c
    join public.medicines p on p.id = c.medicine_id
    where c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant stock_movements.medicine_id references found';
  end if;

  if exists (
    select 1
    from public.subscription_payments c
    join public.subscriptions p on p.id = c.subscription_id
    where c.subscription_id is not null
      and c.pharmacy_id <> p.pharmacy_id
  ) then
    raise exception 'Cross-tenant subscription_payments.subscription_id references found';
  end if;
end;
$$;

alter table public.medicines
  add constraint medicines_pharmacy_id_id_key unique (pharmacy_id, id);

alter table public.packaging_units
  add constraint packaging_units_pharmacy_id_id_key unique (pharmacy_id, id);

alter table public.suppliers
  add constraint suppliers_pharmacy_id_id_key unique (pharmacy_id, id);

alter table public.purchases
  add constraint purchases_pharmacy_id_id_key unique (pharmacy_id, id);

alter table public.purchase_items
  add constraint purchase_items_pharmacy_id_id_key unique (pharmacy_id, id);

alter table public.sales
  add constraint sales_pharmacy_id_id_key unique (pharmacy_id, id);

alter table public.subscriptions
  add constraint subscriptions_pharmacy_id_id_key unique (pharmacy_id, id);

alter table public.packaging_units
  drop constraint if exists packaging_units_medicine_id_fkey;

alter table public.medicine_prices
  drop constraint if exists medicine_prices_medicine_id_fkey,
  drop constraint if exists medicine_prices_packaging_unit_id_fkey;

alter table public.purchases
  drop constraint if exists purchases_supplier_id_fkey;

alter table public.purchase_items
  drop constraint if exists purchase_items_purchase_id_fkey,
  drop constraint if exists purchase_items_medicine_id_fkey,
  drop constraint if exists purchase_items_packaging_unit_id_fkey;

alter table public.purchase_batches
  drop constraint if exists purchase_batches_purchase_id_fkey,
  drop constraint if exists purchase_batches_purchase_item_id_fkey,
  drop constraint if exists purchase_batches_medicine_id_fkey;

alter table public.sale_items
  drop constraint if exists sale_items_sale_id_fkey,
  drop constraint if exists sale_items_medicine_id_fkey,
  drop constraint if exists sale_items_packaging_unit_id_fkey;

alter table public.payments
  drop constraint if exists payments_sale_id_fkey;

alter table public.stock_movements
  drop constraint if exists stock_movements_medicine_id_fkey;

alter table public.subscription_payments
  drop constraint if exists subscription_payments_subscription_id_fkey;

alter table public.packaging_units
  add constraint packaging_units_pharmacy_medicine_fkey
  foreign key (pharmacy_id, medicine_id)
  references public.medicines (pharmacy_id, id)
  on delete cascade on update restrict;

alter table public.medicine_prices
  add constraint medicine_prices_pharmacy_medicine_fkey
  foreign key (pharmacy_id, medicine_id)
  references public.medicines (pharmacy_id, id)
  on delete cascade on update restrict,
  add constraint medicine_prices_pharmacy_packaging_unit_fkey
  foreign key (pharmacy_id, packaging_unit_id)
  references public.packaging_units (pharmacy_id, id)
  on delete cascade on update restrict;

alter table public.purchases
  add constraint purchases_pharmacy_supplier_fkey
  foreign key (pharmacy_id, supplier_id)
  references public.suppliers (pharmacy_id, id)
  on delete set null (supplier_id) on update restrict;

alter table public.purchase_items
  add constraint purchase_items_pharmacy_purchase_fkey
  foreign key (pharmacy_id, purchase_id)
  references public.purchases (pharmacy_id, id)
  on delete cascade on update restrict,
  add constraint purchase_items_pharmacy_medicine_fkey
  foreign key (pharmacy_id, medicine_id)
  references public.medicines (pharmacy_id, id)
  on delete restrict on update restrict,
  add constraint purchase_items_pharmacy_packaging_unit_fkey
  foreign key (pharmacy_id, packaging_unit_id)
  references public.packaging_units (pharmacy_id, id)
  on delete set null (packaging_unit_id) on update restrict;

alter table public.purchase_batches
  add constraint purchase_batches_pharmacy_purchase_fkey
  foreign key (pharmacy_id, purchase_id)
  references public.purchases (pharmacy_id, id)
  on delete set null (purchase_id) on update restrict,
  add constraint purchase_batches_pharmacy_purchase_item_fkey
  foreign key (pharmacy_id, purchase_item_id)
  references public.purchase_items (pharmacy_id, id)
  on delete set null (purchase_item_id) on update restrict,
  add constraint purchase_batches_pharmacy_medicine_fkey
  foreign key (pharmacy_id, medicine_id)
  references public.medicines (pharmacy_id, id)
  on delete restrict on update restrict;

alter table public.sale_items
  add constraint sale_items_pharmacy_sale_fkey
  foreign key (pharmacy_id, sale_id)
  references public.sales (pharmacy_id, id)
  on delete cascade on update restrict,
  add constraint sale_items_pharmacy_medicine_fkey
  foreign key (pharmacy_id, medicine_id)
  references public.medicines (pharmacy_id, id)
  on delete restrict on update restrict,
  add constraint sale_items_pharmacy_packaging_unit_fkey
  foreign key (pharmacy_id, packaging_unit_id)
  references public.packaging_units (pharmacy_id, id)
  on delete set null (packaging_unit_id) on update restrict;

alter table public.payments
  add constraint payments_pharmacy_sale_fkey
  foreign key (pharmacy_id, sale_id)
  references public.sales (pharmacy_id, id)
  on delete set null (sale_id) on update restrict;

alter table public.stock_movements
  add constraint stock_movements_pharmacy_medicine_fkey
  foreign key (pharmacy_id, medicine_id)
  references public.medicines (pharmacy_id, id)
  on delete restrict on update restrict;

alter table public.subscription_payments
  add constraint subscription_payments_pharmacy_subscription_fkey
  foreign key (pharmacy_id, subscription_id)
  references public.subscriptions (pharmacy_id, id)
  on delete set null (subscription_id) on update restrict;

create index if not exists idx_packaging_units_pharmacy_medicine
  on public.packaging_units (pharmacy_id, medicine_id);

create index if not exists idx_medicine_prices_pharmacy_medicine
  on public.medicine_prices (pharmacy_id, medicine_id);

create index if not exists idx_medicine_prices_pharmacy_packaging_unit
  on public.medicine_prices (pharmacy_id, packaging_unit_id);

create index if not exists idx_purchases_pharmacy_supplier
  on public.purchases (pharmacy_id, supplier_id);

create index if not exists idx_purchase_items_pharmacy_purchase
  on public.purchase_items (pharmacy_id, purchase_id);

create index if not exists idx_purchase_items_pharmacy_medicine
  on public.purchase_items (pharmacy_id, medicine_id);

create index if not exists idx_purchase_items_pharmacy_packaging_unit
  on public.purchase_items (pharmacy_id, packaging_unit_id);

create index if not exists idx_purchase_batches_pharmacy_purchase
  on public.purchase_batches (pharmacy_id, purchase_id);

create index if not exists idx_purchase_batches_pharmacy_purchase_item
  on public.purchase_batches (pharmacy_id, purchase_item_id);

create index if not exists idx_purchase_batches_pharmacy_medicine
  on public.purchase_batches (pharmacy_id, medicine_id);

create index if not exists idx_sale_items_pharmacy_sale
  on public.sale_items (pharmacy_id, sale_id);

create index if not exists idx_sale_items_pharmacy_medicine
  on public.sale_items (pharmacy_id, medicine_id);

create index if not exists idx_sale_items_pharmacy_packaging_unit
  on public.sale_items (pharmacy_id, packaging_unit_id);

create index if not exists idx_payments_pharmacy_sale
  on public.payments (pharmacy_id, sale_id);

create index if not exists idx_subscription_payments_pharmacy_subscription
  on public.subscription_payments (pharmacy_id, subscription_id);
