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
    '33333333-3333-4333-8333-333333333331',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'expiry-owner-a@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Expiry Owner A"}',
    now(),
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444442',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'expiry-owner-b@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Expiry Owner B"}',
    now(),
    now()
  );

do $$
begin
  if public.batch_expiry_status(date '2026-01-15' + 90, date '2026-01-15') <> 'upcoming' then
    raise exception 'Expected 90 days to be upcoming';
  end if;

  if public.batch_expiry_status(date '2026-01-15' + 60, date '2026-01-15') <> 'expiring_soon' then
    raise exception 'Expected 60 days to be expiring_soon';
  end if;

  if public.batch_expiry_status(date '2026-01-15' + 30, date '2026-01-15') <> 'urgent' then
    raise exception 'Expected 30 days to be urgent';
  end if;

  if public.batch_expiry_status(date '2026-01-15', date '2026-01-15') <> 'expired' then
    raise exception 'Expected today to be expired';
  end if;

  if public.batch_expiry_status(date '2026-01-15' - 1, date '2026-01-15') <> 'expired' then
    raise exception 'Expected a past date to be expired';
  end if;

  if public.batch_expiry_status(date '2026-01-15' + 91, date '2026-01-15') <> 'normal' then
    raise exception 'Expected 91 days to be normal';
  end if;

  if public.batch_expiry_status(null, date '2026-01-15') <> 'unknown' then
    raise exception 'Expected a missing expiry date to be unknown';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333331',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333331","role":"authenticated"}',
  true
);

insert into public.pharmacies (id, name)
values ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'Expiry Pharmacy A');

insert into public.pharmacy_members (pharmacy_id, user_id, role, status)
values (
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  '33333333-3333-4333-8333-333333333331',
  'owner',
  'active'
);

insert into public.medicines (id, pharmacy_id, name, base_unit, stock)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'FEFO Medicine',
  'tablet',
  0
);

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
  (
    'b1111111-1111-4111-8111-111111111101',
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'A-FEFO-120',
    current_date + 120,
    40,
    40,
    1.00,
    1.0000,
    'Supplier A',
    now() - interval '10 days'
  ),
  (
    'b1111111-1111-4111-8111-111111111102',
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'A-FEFO-20A',
    current_date + 20,
    20,
    20,
    1.00,
    1.0000,
    'Supplier A',
    now() - interval '20 days'
  ),
  (
    'b1111111-1111-4111-8111-111111111103',
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'A-FEFO-45',
    current_date + 45,
    30,
    30,
    1.00,
    1.0000,
    'Supplier A',
    now() - interval '15 days'
  ),
  (
    'b1111111-1111-4111-8111-111111111104',
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'A-FEFO-20B',
    current_date + 20,
    10,
    10,
    1.00,
    1.0000,
    'Supplier A',
    now() - interval '5 days'
  ),
  (
    'b1111111-1111-4111-8111-111111111105',
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'A-ZERO',
    current_date + 5,
    10,
    0,
    1.00,
    1.0000,
    'Supplier A',
    now() - interval '30 days'
  ),
  (
    'b1111111-1111-4111-8111-111111111106',
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'A-EXPIRED',
    date '2020-01-01',
    50,
    50,
    1.00,
    1.0000,
    'Supplier A',
    now() - interval '60 days'
  ),
  (
    'b1111111-1111-4111-8111-111111111107',
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'A-EXPIRED-ZERO',
    date '2020-01-01',
    10,
    0,
    1.00,
    1.0000,
    'Supplier A',
    now() - interval '60 days'
  ),
  (
    'b1111111-1111-4111-8111-111111111108',
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'A-NO-EXPIRY',
    null,
    5,
    5,
    1.00,
    1.0000,
    'Supplier A',
    now() - interval '7 days'
  );

insert into public.stock_movements (
  id,
  pharmacy_id,
  medicine_id,
  movement_type,
  quantity_base,
  reason
)
values (
  'c1111111-1111-4111-8111-111111111101',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
  'purchase',
  100,
  'Opening FEFO test stock'
);

insert into public.sales (id, pharmacy_id, total_amount)
values (
  'a1111111-1111-4111-8111-111111111101',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  60
);

insert into public.sale_items (
  id,
  pharmacy_id,
  sale_id,
  medicine_id,
  unit,
  quantity,
  unit_factor,
  base_quantity,
  unit_price,
  total,
  cogs,
  cost_status,
  costed_base_quantity,
  uncosted_base_quantity
)
values (
  'a1111111-1111-4111-8111-111111111102',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'a1111111-1111-4111-8111-111111111101',
  'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
  'tablet',
  60,
  1,
  60,
  1,
  60,
  0,
  'unavailable',
  0,
  60
);

select public.allocate_sale_batches_fefo(
  'a1111111-1111-4111-8111-111111111102'
);

do $$
declare
  v_allocation_order text;
begin
  select string_agg(
           b.batch_number || ':' || a.quantity_base,
           ',' order by b.expiry_date, b.received_date, b.created_at, b.id
         )
  into v_allocation_order
  from public.sale_batch_allocations a
  join public.purchase_batches b on b.id = a.purchase_batch_id
  where a.sale_item_id = 'a1111111-1111-4111-8111-111111111102';

  if v_allocation_order is distinct from
     'A-FEFO-20A:20,A-FEFO-20B:10,A-FEFO-45:30'
  then
    raise exception 'Unexpected FEFO allocation order: %', v_allocation_order;
  end if;

  if exists (
    select 1
    from public.sale_batch_allocations
    where sale_item_id = 'a1111111-1111-4111-8111-111111111102'
      and purchase_batch_id in (
        'b1111111-1111-4111-8111-111111111101',
        'b1111111-1111-4111-8111-111111111105',
        'b1111111-1111-4111-8111-111111111106',
        'b1111111-1111-4111-8111-111111111107',
        'b1111111-1111-4111-8111-111111111108'
      )
  ) then
    raise exception 'FEFO allocated a zero, expired, missing-expiry, or later batch';
  end if;

  if (select quantity_remaining_base from public.purchase_batches where id = 'b1111111-1111-4111-8111-111111111102') <> 0
     or (select quantity_remaining_base from public.purchase_batches where id = 'b1111111-1111-4111-8111-111111111104') <> 0
     or (select quantity_remaining_base from public.purchase_batches where id = 'b1111111-1111-4111-8111-111111111103') <> 0
  then
    raise exception 'FEFO batch quantities were not decremented';
  end if;

  if (select quantity_remaining_base from public.purchase_batches where id = 'b1111111-1111-4111-8111-111111111101') <> 40
     or (select quantity_remaining_base from public.purchase_batches where id = 'b1111111-1111-4111-8111-111111111106') <> 50
     or (select quantity_remaining_base from public.purchase_batches where id = 'b1111111-1111-4111-8111-111111111108') <> 5
  then
    raise exception 'FEFO changed batches it should not have allocated';
  end if;

  if (select stock from public.medicines where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd01') <> 40 then
    raise exception 'FEFO stock ledger update did not reach medicine stock';
  end if;

  if (select count(*) from public.stock_movements
      where reference_type = 'sale_item'
        and reference_id = 'a1111111-1111-4111-8111-111111111102'
        and movement_type = 'sale'
        and purchase_batch_id is not null) <> 3
  then
    raise exception 'Expected three batch-linked sale movements';
  end if;

  if not exists (
    select 1
    from public.sale_items
    where id = 'a1111111-1111-4111-8111-111111111102'
      and cost_status = 'available'
      and costed_base_quantity = 60
      and uncosted_base_quantity = 0
      and cogs = 60
  ) then
    raise exception 'FEFO did not reconcile sale item costing';
  end if;
end;
$$;

do $$
begin
  begin
    perform public.allocate_sale_batches_fefo(
      'a1111111-1111-4111-8111-111111111102'
    );

    raise exception 'Expected duplicate batch allocation to fail'
      using errcode = 'P0002';
  exception
    when raise_exception then null;
  end;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from public.medicine_batch_expiry_alerts
    where pharmacy_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
      and batch_number = 'A-EXPIRED-ZERO'
      and quantity_remaining_base = 0
      and expiry_status = 'expired'
      and is_expired
  ) then
    raise exception 'Expired zero-quantity batch is missing from the expiry view';
  end if;

  if not exists (
    select 1
    from public.medicine_batch_expiry_alerts
    where pharmacy_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
      and batch_number = 'A-ZERO'
      and quantity_remaining_base = 0
      and is_allocatable = false
  ) then
    raise exception 'Zero-quantity batch should not be allocatable';
  end if;

  if not exists (
    select 1
    from public.medicine_batch_expiry_alerts
    where pharmacy_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
      and batch_number = 'A-NO-EXPIRY'
      and expiry_status = 'unknown'
      and days_remaining is null
      and is_allocatable = false
  ) then
    raise exception 'Missing expiry date was not classified as unknown';
  end if;

  if (
    select count(distinct expiry_date)
    from public.medicine_batch_expiry_alerts
    where pharmacy_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
      and medicine_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd01'
      and batch_number in ('A-FEFO-20A', 'A-FEFO-20B')
  ) <> 1 then
    raise exception 'Expected two batches with the same expiry date';
  end if;

  if exists (
    select 1
    from public.medicine_batch_fefo_candidates
    where pharmacy_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
      and expiry_date <= current_date
  ) then
    raise exception 'Expired batches leaked into FEFO candidates';
  end if;

  if exists (
    select 1
    from public.medicine_batch_fefo_candidates
    where pharmacy_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
      and batch_number in ('A-ZERO', 'A-NO-EXPIRY')
  ) then
    raise exception 'Zero or missing-expiry batches leaked into FEFO candidates';
  end if;

  if (
    select batch_number
    from public.medicine_batch_fefo_candidates
    where pharmacy_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
      and medicine_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd01'
    order by fefo_rank
    limit 1
  ) is distinct from 'A-FEFO-120' then
    raise exception 'Unexpected first FEFO candidate after allocation';
  end if;
end;
$$;

do $$
begin
  update public.purchase_batches
  set batch_number = 'A-FEFO-120-EDITED'
  where id = 'b1111111-1111-4111-8111-111111111101';
end;
$$;

do $$
begin
  begin
    update public.purchase_batches
    set batch_number = 'A-FEFO-120-REPLACED',
        expiry_date = expiry_date + 1
    where id = 'b1111111-1111-4111-8111-111111111101';

    raise exception 'Expected expiry replacement during batch edit to fail'
      using errcode = 'P0002';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

do $$
begin
  begin
    update public.purchase_batches
    set quantity_remaining_base = 39
    where id = 'b1111111-1111-4111-8111-111111111101';

    raise exception 'Expected direct remaining quantity edit to fail'
      using errcode = 'P0002';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.purchase_batches (
      pharmacy_id,
      medicine_id,
      batch_number,
      expiry_date,
      quantity_received_base,
      quantity_remaining_base,
      unit_cost,
      unit_cost_base
    )
    values (
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
      'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
      'A-INVALID-DATE',
      'not-a-date',
      1,
      1,
      1,
      1
    );

    raise exception 'Expected invalid expiry date to fail'
      using errcode = 'P0002';
  exception
    when invalid_datetime_format then null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.purchase_batches (
      pharmacy_id,
      medicine_id,
      batch_number,
      expiry_date,
      quantity_received_base,
      quantity_remaining_base,
      unit_cost,
      unit_cost_base
    )
    values (
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
      'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
      'A-BAD-REMAINING',
      current_date + 10,
      1,
      2,
      1,
      1
    );

    raise exception 'Expected remaining quantity above received to fail'
      using errcode = 'P0002';
  exception
    when check_violation then null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.sale_batch_allocations (
      pharmacy_id,
      sale_item_id,
      medicine_id,
      purchase_batch_id,
      quantity_base
    )
    values (
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
      'a1111111-1111-4111-8111-111111111102',
      'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
      'b1111111-1111-4111-8111-111111111101',
      1
    );

    raise exception 'Expected direct allocation insert to be denied'
      using errcode = 'P0002';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

do $$
begin
  begin
    delete from public.purchase_batches
    where id = 'b1111111-1111-4111-8111-111111111102';

    raise exception 'Expected deletion of a batch with stock history to fail'
      using errcode = 'P0002';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  '44444444-4444-4444-8444-444444444442',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444442","role":"authenticated"}',
  true
);

insert into public.pharmacies (id, name)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'Expiry Pharmacy B');

insert into public.pharmacy_members (pharmacy_id, user_id, role, status)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
  '44444444-4444-4444-8444-444444444442',
  'owner',
  'active'
);

insert into public.medicines (id, pharmacy_id, name, base_unit, stock)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
  'Pharmacy B Medicine',
  'tablet',
  0
);

insert into public.purchase_batches (
  id,
  pharmacy_id,
  medicine_id,
  batch_number,
  expiry_date,
  quantity_received_base,
  quantity_remaining_base,
  unit_cost,
  unit_cost_base
)
values (
  'b2222222-2222-4222-8222-222222222201',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01',
  'B-ONLY',
  current_date + 50,
  5,
  5,
  1,
  1
);

select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333331',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333331","role":"authenticated"}',
  true
);

do $$
begin
  if exists (
    select 1
    from public.medicine_batch_expiry_alerts
    where pharmacy_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2'
  ) then
    raise exception 'Cross-pharmacy expiry data leaked through the expiry view';
  end if;

  if exists (
    select 1
    from public.medicine_batch_fefo_candidates
    where pharmacy_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2'
  ) then
    raise exception 'Cross-pharmacy FEFO data leaked through the candidate view';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.purchase_batches (
      pharmacy_id,
      medicine_id,
      batch_number,
      expiry_date,
      quantity_received_base,
      quantity_remaining_base,
      unit_cost,
      unit_cost_base
    )
    values (
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01',
      'A-CROSS-TENANT',
      current_date + 10,
      1,
      1,
      1,
      1
    );

    raise exception 'Expected cross-tenant batch reference to fail'
      using errcode = 'P0002';
  exception
    when foreign_key_violation then null;
  end;
end;
$$;

insert into public.medicines (id, pharmacy_id, name, base_unit, stock)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'Expired Only Medicine',
  'tablet',
  0
);

insert into public.purchase_batches (
  id,
  pharmacy_id,
  medicine_id,
  batch_number,
  expiry_date,
  quantity_received_base,
  quantity_remaining_base,
  unit_cost,
  unit_cost_base
)
values (
  'b3333333-3333-4333-8333-333333333301',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
  'C-ONLY-EXPIRED',
  date '2020-01-01',
  10,
  10,
  1,
  1
);

insert into public.stock_movements (
  pharmacy_id,
  medicine_id,
  movement_type,
  quantity_base,
  reason
)
values (
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
  'purchase',
  10,
  'Expired allocation test stock'
);

insert into public.sales (id, pharmacy_id, total_amount)
values (
  'a3333333-3333-4333-8333-333333333301',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  5
);

insert into public.sale_items (
  id,
  pharmacy_id,
  sale_id,
  medicine_id,
  unit,
  quantity,
  unit_factor,
  base_quantity,
  unit_price,
  total,
  cogs,
  cost_status,
  costed_base_quantity,
  uncosted_base_quantity
)
values (
  'a3333333-3333-4333-8333-333333333302',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'a3333333-3333-4333-8333-333333333301',
  'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
  'tablet',
  5,
  1,
  5,
  1,
  5,
  0,
  'unavailable',
  0,
  5
);

do $$
begin
  begin
    perform public.allocate_sale_batches_fefo(
      'a3333333-3333-4333-8333-333333333302'
    );

    raise exception 'Expected expired-only stock allocation to fail'
      using errcode = 'P0002';
  exception
    when raise_exception then null;
  end;

  if exists (
    select 1
    from public.sale_batch_allocations
    where sale_item_id = 'a3333333-3333-4333-8333-333333333302'
  ) then
    raise exception 'Rejected expired allocation left allocation rows';
  end if;

  if (select stock from public.medicines where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddd03') <> 10 then
    raise exception 'Rejected expired allocation changed medicine stock';
  end if;
end;
$$;

set constraints all immediate;

rollback;
