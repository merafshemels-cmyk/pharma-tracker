begin;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111101',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase2-owner@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Phase 2 Owner"}',
    now(),
    now()
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase2-cashier@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Phase 2 Cashier"}',
    now(),
    now()
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'phase2-outsider@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Phase 2 Outsider"}',
    now(),
    now()
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111101',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111101","role":"authenticated"}',
  true
);

insert into public.pharmacies (id, name)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Phase 2 Pharmacy A'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Phase 2 Pharmacy B');

insert into public.pharmacy_members (pharmacy_id, user_id, role, status)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111101',
    'owner',
    'active'
  );

insert into public.pharmacy_members (pharmacy_id, user_id, role, status)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '11111111-1111-4111-8111-111111111101',
    'owner',
    'active'
  );

insert into public.pharmacy_members (pharmacy_id, user_id, role, status)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111102',
    'cashier',
    'active'
  );

insert into public.medicines (id, pharmacy_id, name, base_unit, stock)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'FEFO Medicine', 'tablet', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Multi Batch Medicine', 'tablet', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Expired Medicine', 'tablet', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Missing Expiry Medicine', 'tablet', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb05', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Insufficient Medicine', 'tablet', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb06', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Retry Medicine', 'tablet', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb07', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Rollback Medicine', 'tablet', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb08', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'No Batch Medicine', 'tablet', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb09', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Cashier Medicine', 'tablet', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb10', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Purchase Medicine', 'tablet', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb11', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Unknown Expiry Medicine', 'tablet', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb12', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Oversell Medicine', 'tablet', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb13', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Other Pharmacy Medicine', 'tablet', 0);

insert into public.packaging_units (pharmacy_id, medicine_id, unit, contains_base_units)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', 'tablet', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02', 'tablet', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03', 'tablet', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04', 'tablet', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb05', 'tablet', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb06', 'tablet', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb07', 'tablet', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb08', 'tablet', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb09', 'tablet', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb10', 'tablet', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb10', 'box', 10),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb11', 'tablet', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb12', 'tablet', 1),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb13', 'tablet', 1);

insert into public.purchase_batches (
  id,
  pharmacy_id,
  medicine_id,
  batch_number,
  expiry_date,
  quantity_received_base,
  quantity_remaining_base,
  unit_cost,
  unit_cost_base,
  supplier_name,
  received_date
)
values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd01', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', 'FEFO-EARLY', current_date + 10, 5, 5, 5.00, 5.0000, 'Supplier A', now() - interval '5 days'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd02', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', 'FEFO-LATE', current_date + 40, 10, 10, 1.00, 1.0000, 'Supplier A', now() - interval '4 days'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd03', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02', 'MULTI-EARLY', current_date + 10, 4, 4, 2.00, 2.0000, 'Supplier A', now() - interval '3 days'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd04', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02', 'MULTI-LATE', current_date + 20, 10, 10, 3.00, 3.0000, 'Supplier A', now() - interval '2 days'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd05', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03', 'EXPIRED', current_date - 1, 5, 5, 1.00, 1.0000, 'Supplier A', now() - interval '20 days'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd06', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04', 'NO-EXPIRY', null, 5, 5, 1.00, 1.0000, 'Supplier A', now() - interval '10 days'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd07', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb05', 'LOW-STOCK', current_date + 30, 2, 2, 1.00, 1.0000, 'Supplier A', now() - interval '1 day'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd08', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb06', 'RETRY', current_date + 30, 10, 10, 1.00, 1.0000, 'Supplier A', now() - interval '1 day'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd09', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb07', 'ROLLBACK', current_date + 30, 5, 5, 1.00, 1.0000, 'Supplier A', now() - interval '1 day'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd10', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb09', 'CASHIER', current_date + 30, 5, 5, 1.00, 1.0000, 'Supplier A', now() - interval '1 day'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd11', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb12', 'OVERSELL', current_date + 30, 5, 5, 1.00, 1.0000, 'Supplier A', now() - interval '1 day'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd12', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb13', 'OTHER-PHARMACY', current_date + 30, 5, 5, 1.00, 1.0000, 'Supplier B', now() - interval '1 day');

insert into public.stock_movements (
  pharmacy_id,
  medicine_id,
  movement_type,
  quantity_base,
  reason
)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', 'opening', 15, 'Phase 2 opening stock'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02', 'opening', 14, 'Phase 2 opening stock'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03', 'opening', 5, 'Phase 2 opening stock'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04', 'opening', 5, 'Phase 2 opening stock'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb05', 'opening', 2, 'Phase 2 opening stock'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb06', 'opening', 10, 'Phase 2 opening stock'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb07', 'opening', 5, 'Phase 2 opening stock'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb09', 'opening', 5, 'Phase 2 opening stock'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb12', 'opening', 5, 'Phase 2 opening stock'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb13', 'opening', 5, 'Phase 2 opening stock');

do $$
declare
  v_payload jsonb;
  v_sale_id uuid;
  v_sale_item_id uuid;
begin
  v_payload := public.create_sale_with_fefo(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'sale-fefo',
    '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01","unit":"tablet","quantity":3,"unitPrice":2}]'::jsonb,
    null,
    null
  );

  v_sale_id := (v_payload -> 'sale' ->> 'id')::uuid;
  v_sale_item_id := (v_payload -> 'items' -> 0 ->> 'id')::uuid;

  if (v_payload -> 'sale' ->> 'totalAmount')::numeric <> 6 then
    raise exception 'FEFO sale total was not calculated on the server';
  end if;

  if (v_payload -> 'items' -> 0 ->> 'baseQuantity')::integer <> 3 then
    raise exception 'FEFO sale base quantity was not calculated on the server';
  end if;

  if (v_payload -> 'items' -> 0 ->> 'cogs')::numeric <> 15 then
    raise exception 'FEFO sale COGS did not use the earliest batch cost';
  end if;

  if (v_payload -> 'items' -> 0 -> 'allocations' -> 0 ->> 'batchId')::uuid
     <> 'dddddddd-dddd-4ddd-8ddd-dddddddddd01' then
    raise exception 'FEFO sale did not allocate from the earliest-expiring batch';
  end if;

  if (select quantity_remaining_base from public.purchase_batches where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd01') <> 2 then
    raise exception 'FEFO sale did not reduce the earliest batch';
  end if;

  if (select stock from public.medicines where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01') <> 12 then
    raise exception 'FEFO sale did not reduce medicine stock';
  end if;

  if (select count(*) from public.stock_movements where reference_id = v_sale_item_id and movement_type = 'sale') <> 1 then
    raise exception 'FEFO sale did not create exactly one stock movement';
  end if;

  if (select recorded_by from public.sales where id = v_sale_id) <> auth.uid() then
    raise exception 'Sale recorded_by was not derived from the authenticated user';
  end if;
end;
$$;

do $$
declare
  v_payload jsonb;
  v_sale_item_id uuid;
begin
  v_payload := public.create_sale_with_fefo(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'sale-multi',
    '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02","unit":"tablet","quantity":8,"unitPrice":1}]'::jsonb,
    null,
    null
  );

  v_sale_item_id := (v_payload -> 'items' -> 0 ->> 'id')::uuid;

  if jsonb_array_length(v_payload -> 'items' -> 0 -> 'allocations') <> 2 then
    raise exception 'Multi-batch sale did not allocate from two batches';
  end if;

  if (v_payload -> 'items' -> 0 ->> 'cogs')::numeric <> 20 then
    raise exception 'Multi-batch sale COGS was not reconciled';
  end if;

  if (v_payload -> 'items' -> 0 -> 'allocations' -> 0 ->> 'quantityBase')::integer <> 4 then
    raise exception 'Multi-batch sale did not exhaust the earliest batch first';
  end if;

  if (v_payload -> 'items' -> 0 -> 'allocations' -> 1 ->> 'quantityBase')::integer <> 4 then
    raise exception 'Multi-batch sale did not continue into the next batch';
  end if;

  if (select count(*) from public.stock_movements where reference_id = v_sale_item_id and movement_type = 'sale') <> 2 then
    raise exception 'Multi-batch sale did not create one stock movement per batch';
  end if;
end;
$$;

do $$
begin
  begin
    perform public.create_sale_with_fefo(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'sale-expired',
      '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03","unit":"tablet","quantity":1,"unitPrice":1}]'::jsonb,
      null,
      null
    );
    raise exception 'Expected expired batch sale to fail' using errcode = 'P0002';
  exception
    when sqlstate 'PT409' then null;
  end;

  if exists (select 1 from public.sales where client_reference = 'sale-expired') then
    raise exception 'Expired batch sale left a sale row';
  end if;

  if (select stock from public.medicines where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03') <> 5 then
    raise exception 'Expired batch sale changed medicine stock';
  end if;
end;
$$;

do $$
begin
  begin
    perform public.create_sale_with_fefo(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'sale-missing-expiry',
      '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04","unit":"tablet","quantity":1,"unitPrice":1}]'::jsonb,
      null,
      null
    );
    raise exception 'Expected missing-expiry sale to fail' using errcode = 'P0002';
  exception
    when sqlstate 'PT409' then null;
  end;

  if exists (select 1 from public.sales where client_reference = 'sale-missing-expiry') then
    raise exception 'Missing-expiry sale left a sale row';
  end if;

  if (select stock from public.medicines where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04') <> 5 then
    raise exception 'Missing-expiry sale changed medicine stock';
  end if;
end;
$$;

do $$
begin
  begin
    perform public.create_sale_with_fefo(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'sale-insufficient',
      '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb05","unit":"tablet","quantity":3,"unitPrice":1}]'::jsonb,
      null,
      null
    );
    raise exception 'Expected insufficient stock sale to fail' using errcode = 'P0002';
  exception
    when sqlstate 'PT409' then null;
  end;

  if exists (select 1 from public.sales where client_reference = 'sale-insufficient') then
    raise exception 'Insufficient stock sale left a sale row';
  end if;

  if (select stock from public.medicines where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb05') <> 2 then
    raise exception 'Insufficient stock sale changed medicine stock';
  end if;

  if (select quantity_remaining_base from public.purchase_batches where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd07') <> 2 then
    raise exception 'Insufficient stock sale changed batch remaining';
  end if;
end;
$$;

do $$
declare
  v_first jsonb;
  v_second jsonb;
  v_sale_id uuid;
begin
  v_first := public.create_sale_with_fefo(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'sale-retry',
    '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb06","unit":"tablet","quantity":2,"unitPrice":2,"baseQuantity":999,"total":999,"cogs":999,"costedBaseQuantity":999,"uncostedBaseQuantity":999,"pharmacyId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2","recordedBy":"11111111-1111-4111-8111-111111111103"}]'::jsonb,
    null,
    null
  );

  v_second := public.create_sale_with_fefo(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'sale-retry',
    '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb06","unit":"tablet","quantity":2,"unitPrice":2}]'::jsonb,
    null,
    null
  );

  v_sale_id := (v_first -> 'sale' ->> 'id')::uuid;

  if (v_second -> 'sale' ->> 'id')::uuid <> v_sale_id then
    raise exception 'Duplicate offline sale retry created a different sale';
  end if;

  if (select count(*) from public.sales where client_reference = 'sale-retry') <> 1 then
    raise exception 'Duplicate offline sale retry created duplicate sales';
  end if;

  if (select count(*) from public.sale_items where sale_id = v_sale_id) <> 1 then
    raise exception 'Duplicate offline sale retry created duplicate sale items';
  end if;

  if (select count(*) from public.sale_batch_allocations where sale_item_id in (select id from public.sale_items where sale_id = v_sale_id)) <> 1 then
    raise exception 'Duplicate offline sale retry created duplicate allocations';
  end if;

  if (select count(*) from public.stock_movements where reference_id in (select id from public.sale_items where sale_id = v_sale_id)) <> 1 then
    raise exception 'Duplicate offline sale retry created duplicate stock movements';
  end if;

  if (select stock from public.medicines where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb06') <> 8 then
    raise exception 'Duplicate offline sale retry deducted stock more than once';
  end if;

  if (v_first -> 'items' -> 0 ->> 'baseQuantity')::integer <> 2 then
    raise exception 'Sale trusted a client-supplied base quantity';
  end if;

  if (v_first -> 'items' -> 0 ->> 'total')::numeric <> 4 then
    raise exception 'Sale trusted a client-supplied line total';
  end if;

  if (v_first -> 'items' -> 0 ->> 'cogs')::numeric <> 2 then
    raise exception 'Sale trusted a client-supplied COGS value';
  end if;

  if (select recorded_by from public.sales where id = v_sale_id) <> auth.uid() then
    raise exception 'Sale trusted a client-supplied recorded_by value';
  end if;
end;
$$;

do $$
begin
  begin
    perform public.create_sale_with_fefo(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'sale-rollback',
      '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb07","unit":"tablet","quantity":1,"unitPrice":1},{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb08","unit":"tablet","quantity":1,"unitPrice":1}]'::jsonb,
      null,
      null
    );
    raise exception 'Expected multi-item rollback sale to fail' using errcode = 'P0002';
  exception
    when sqlstate 'PT409' then null;
  end;

  if exists (select 1 from public.sales where client_reference = 'sale-rollback') then
    raise exception 'Failed sale left a sale row';
  end if;

  if (select stock from public.medicines where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb07') <> 5 then
    raise exception 'Failed sale left a stock deduction on the first item';
  end if;

  if (select quantity_remaining_base from public.purchase_batches where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd09') <> 5 then
    raise exception 'Failed sale left a batch deduction on the first item';
  end if;

  if exists (
    select 1
    from public.stock_movements
    where medicine_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb07'
      and movement_type = 'sale'
  ) then
    raise exception 'Failed sale left a sale stock movement';
  end if;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111102',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111102","role":"authenticated"}',
  true
);

do $$
declare
  v_payload jsonb;
begin
  v_payload := public.create_sale_with_fefo(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'sale-cashier',
    '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb09","unit":"tablet","quantity":1,"unitPrice":1}]'::jsonb,
    null,
    null
  );

  if (select recorded_by from public.sales where id = (v_payload -> 'sale' ->> 'id')::uuid)
     <> '11111111-1111-4111-8111-111111111102' then
    raise exception 'Cashier sale did not record the cashier';
  end if;
end;
$$;

do $$
begin
  begin
    perform public.create_purchase_with_batches(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'purchase-cashier-denied',
      '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb10","unit":"box","quantity":1,"unitCost":100}]'::jsonb,
      'Supplier A',
      null,
      null,
      null
    );
    raise exception 'Expected cashier purchase to fail' using errcode = 'P0002';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111103',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111103","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform public.create_sale_with_fefo(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'sale-outsider',
      '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01","unit":"tablet","quantity":1,"unitPrice":1}]'::jsonb,
      null,
      null
    );
    raise exception 'Expected non-member sale to fail' using errcode = 'P0002';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111101',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111101","role":"authenticated"}',
  true
);

do $$
declare
  v_payload jsonb;
  v_purchase_id uuid;
  v_purchase_item_id uuid;
  v_batch_id uuid;
begin
  v_payload := public.create_purchase_with_batches(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'purchase-batch',
    '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb10","unit":"box","quantity":2,"unitCost":100,"batchNumber":"LOT-BUY","expiryDate":"2099-12-31","totalCost":99999}]'::jsonb,
    'Supplier A',
    null,
    null,
    null
  );

  v_purchase_id := (v_payload -> 'purchase' ->> 'id')::uuid;
  v_purchase_item_id := (v_payload -> 'items' -> 0 ->> 'id')::uuid;
  v_batch_id := (v_payload -> 'items' -> 0 -> 'batches' -> 0 ->> 'id')::uuid;

  if (v_payload -> 'purchase' ->> 'totalCost')::numeric <> 200 then
    raise exception 'Purchase total was not calculated on the server';
  end if;

  if (v_payload -> 'items' -> 0 ->> 'baseQuantity')::integer <> 20 then
    raise exception 'Purchase base quantity was not calculated on the server';
  end if;

  if (v_payload -> 'items' -> 0 -> 'batches' -> 0 ->> 'quantityReceivedBase')::integer <> 20 then
    raise exception 'Purchase batch received quantity was incorrect';
  end if;

  if (v_payload -> 'items' -> 0 -> 'batches' -> 0 ->> 'quantityRemainingBase')::integer <> 20 then
    raise exception 'Purchase batch remaining quantity was incorrect';
  end if;

  if (v_payload -> 'items' -> 0 -> 'batches' -> 0 ->> 'unitCostBase')::numeric <> 10 then
    raise exception 'Purchase batch base unit cost was incorrect';
  end if;

  if (select pharmacy_id from public.purchase_batches where id = v_batch_id)
     <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' then
    raise exception 'Purchase batch was assigned to the wrong pharmacy';
  end if;

  if (select stock from public.medicines where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb10') <> 20 then
    raise exception 'Purchase did not add medicine stock';
  end if;

  if (select count(*) from public.stock_movements where reference_id = v_purchase_item_id and movement_type = 'purchase') <> 1 then
    raise exception 'Purchase did not create exactly one stock movement';
  end if;

  if (select purchase_batch_id from public.stock_movements where reference_id = v_purchase_item_id and movement_type = 'purchase') is not null then
    raise exception 'Purchase stock movement incorrectly referenced an existing batch';
  end if;

  if (select recorded_by from public.purchases where id = v_purchase_id) <> auth.uid() then
    raise exception 'Purchase recorded_by was not derived from the authenticated user';
  end if;
end;
$$;

do $$
declare
  v_first jsonb;
  v_second jsonb;
  v_purchase_id uuid;
begin
  v_first := public.create_purchase_with_batches(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'purchase-batch',
    '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb10","unit":"box","quantity":2,"unitCost":100}]'::jsonb,
    'Supplier A',
    null,
    null,
    null
  );

  v_second := public.create_purchase_with_batches(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'purchase-batch',
    '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb10","unit":"box","quantity":2,"unitCost":100}]'::jsonb,
    'Supplier A',
    null,
    null,
    null
  );

  v_purchase_id := (v_first -> 'purchase' ->> 'id')::uuid;

  if (v_second -> 'purchase' ->> 'id')::uuid <> v_purchase_id then
    raise exception 'Duplicate purchase retry created a different purchase';
  end if;

  if (select count(*) from public.purchases where client_reference = 'purchase-batch') <> 1 then
    raise exception 'Duplicate purchase retry created duplicate purchases';
  end if;

  if (select count(*) from public.purchase_batches where purchase_id = v_purchase_id) <> 1 then
    raise exception 'Duplicate purchase retry created duplicate batches';
  end if;

  if (select count(*) from public.stock_movements where client_reference like 'purchase:purchase-batch:%') <> 1 then
    raise exception 'Duplicate purchase retry created duplicate stock movements';
  end if;

  if (select stock from public.medicines where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb10') <> 20 then
    raise exception 'Duplicate purchase retry added stock more than once';
  end if;
end;
$$;

do $$
declare
  v_payload jsonb;
  v_batch_id uuid;
begin
  v_payload := public.create_purchase_with_batches(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'purchase-unknown-expiry',
    '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb11","unit":"tablet","quantity":5,"unitCost":2,"batchNumber":"NO-EXP"}]'::jsonb,
    'Supplier A',
    null,
    null,
    null
  );

  v_batch_id := (v_payload -> 'items' -> 0 -> 'batches' -> 0 ->> 'id')::uuid;

  if (select expiry_date from public.purchase_batches where id = v_batch_id) is not null then
    raise exception 'Unknown expiry purchase invented an expiry date';
  end if;

  if (select stock from public.medicines where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb11') <> 5 then
    raise exception 'Unknown expiry purchase did not add stock';
  end if;
end;
$$;

do $$
begin
  begin
    perform public.create_sale_with_fefo(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'sale-unknown-expiry',
      '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb11","unit":"tablet","quantity":1,"unitPrice":1}]'::jsonb,
      null,
      null
    );
    raise exception 'Expected unknown-expiry sale to fail' using errcode = 'P0002';
  exception
    when sqlstate 'PT409' then null;
  end;

  if exists (select 1 from public.sales where client_reference = 'sale-unknown-expiry') then
    raise exception 'Unknown-expiry sale left a sale row';
  end if;

  if (select stock from public.medicines where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb11') <> 5 then
    raise exception 'Unknown-expiry sale changed medicine stock';
  end if;
end;
$$;

do $$
begin
  begin
    perform public.create_purchase_with_batches(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'purchase-cross-tenant',
      '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb13","unit":"tablet","quantity":1,"unitCost":1}]'::jsonb,
      'Supplier A',
      null,
      null,
      null
    );
    raise exception 'Expected cross-tenant purchase to fail' using errcode = 'P0002';
  exception
    when invalid_parameter_value then null;
  end;

  if exists (select 1 from public.purchases where client_reference = 'purchase-cross-tenant') then
    raise exception 'Cross-tenant purchase left a purchase row';
  end if;
end;
$$;

do $$
declare
  v_payload jsonb;
begin
  v_payload := public.create_sale_with_fefo(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'sale-oversell-first',
    '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb12","unit":"tablet","quantity":5,"unitPrice":1}]'::jsonb,
    null,
    null
  );

  begin
    perform public.create_sale_with_fefo(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'sale-oversell-second',
      '[{"medicineId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb12","unit":"tablet","quantity":1,"unitPrice":1}]'::jsonb,
      null,
      null
    );
    raise exception 'Expected oversell sale to fail' using errcode = 'P0002';
  exception
    when sqlstate 'PT409' then null;
  end;

  if (select quantity_remaining_base from public.purchase_batches where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd11') <> 0 then
    raise exception 'Oversell attempt left a negative or incorrect batch quantity';
  end if;

  if (select stock from public.medicines where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb12') <> 0 then
    raise exception 'Oversell attempt left a negative or incorrect medicine stock';
  end if;

  if (v_payload -> 'items' -> 0 ->> 'quantity')::integer <> 5 then
    raise exception 'Oversell first sale was incorrect';
  end if;
end;
$$;

set constraints all immediate;

rollback;
