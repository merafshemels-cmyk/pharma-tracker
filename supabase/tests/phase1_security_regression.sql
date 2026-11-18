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
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner-a@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Owner A"}',
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner-b@example.test',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Owner B"}',
    now(),
    now()
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

insert into public.pharmacies (id, name)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Pharmacy A');

insert into public.pharmacy_members (pharmacy_id, user_id, role, status)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-1111-4111-8111-111111111111',
  'owner',
  'active'
);

do $$
begin
  if not exists (
    select 1
    from public.pharmacies
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      and created_by = '11111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'First owner pharmacy creator was not recorded';
  end if;

  if not exists (
    select 1
    from public.pharmacy_members
    where pharmacy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      and user_id = '11111111-1111-4111-8111-111111111111'
      and role = 'owner'
      and status = 'active'
  ) then
    raise exception 'First owner membership was not created';
  end if;
end;
$$;

do $$
declare
  v_pharmacy_id uuid;
begin
  v_pharmacy_id := public.create_pharmacy_with_owner('RPC Pharmacy');

  if v_pharmacy_id is null then
    raise exception 'Onboarding RPC did not return a pharmacy id';
  end if;

  if not exists (
    select 1
    from public.pharmacy_members
    where pharmacy_id = v_pharmacy_id
      and user_id = '11111111-1111-4111-8111-111111111111'
      and role = 'owner'
      and status = 'active'
  ) then
    raise exception 'Onboarding RPC did not create the first owner';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

do $$
begin
  begin
    insert into public.pharmacy_members (pharmacy_id, user_id, role, status)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      '22222222-2222-4222-8222-222222222222',
      'owner',
      'active'
    );

    raise exception 'Expected first-owner claim of another pharmacy to fail'
      using errcode = 'P0002';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

insert into public.pharmacies (id, name)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'Pharmacy B');

insert into public.pharmacy_members (pharmacy_id, user_id, role, status)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  '22222222-2222-4222-8222-222222222222',
  'owner',
  'active'
);

insert into public.suppliers (id, pharmacy_id, name)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'Supplier B'
);

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

insert into public.pharmacies (id, name)
values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Pharmacy C');

insert into public.pharmacy_members (pharmacy_id, user_id, role, status)
values (
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
  '11111111-1111-4111-8111-111111111111',
  'owner',
  'active'
);

do $$
begin
  if not exists (
    select 1
    from public.pharmacy_members
    where pharmacy_id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3'
      and user_id = '11111111-1111-4111-8111-111111111111'
      and role = 'owner'
      and status = 'active'
  ) then
    raise exception 'First owner bootstrap failed with other pharmacies present';
  end if;
end;
$$;

insert into public.medicines (id, pharmacy_id, name, base_unit, stock)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'Medicine A',
  'tablet',
  0
);

do $$
begin
  begin
    insert into public.purchases (
      pharmacy_id,
      supplier_id,
      supplier_name,
      total_cost
    )
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01',
      'Supplier B',
      0
    );

    raise exception 'Expected cross-tenant supplier reference to fail'
      using errcode = 'P0002';
  exception
    when foreign_key_violation then null;
  end;
end;
$$;

update public.pharmacy_members
set updated_at = now()
where pharmacy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  and user_id = '11111111-1111-4111-8111-111111111111';

update public.profiles
set full_name = 'Owner A Updated'
where id = '11111111-1111-4111-8111-111111111111';

do $$
begin
  begin
    update public.pharmacy_members
    set status = 'inactive'
    where pharmacy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      and user_id = '11111111-1111-4111-8111-111111111111';

    raise exception 'Expected last owner demotion to fail'
      using errcode = 'P0002';
  exception
    when raise_exception then null;
  end;
end;
$$;

do $$
begin
  begin
    delete from public.pharmacy_members
    where pharmacy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      and user_id = '11111111-1111-4111-8111-111111111111';

    raise exception 'Expected last owner deletion to fail'
      using errcode = 'P0002';
  exception
    when raise_exception then null;
  end;
end;
$$;

reset role;

do $$
begin
  begin
    delete from public.profiles
    where id = '11111111-1111-4111-8111-111111111111';

    raise exception 'Expected last owner profile deletion to fail'
      using errcode = 'P0002';
  exception
    when raise_exception then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

insert into public.sales (id, pharmacy_id, total_amount)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  10
);

do $$
begin
  begin
    insert into public.sale_items (
      pharmacy_id,
      sale_id,
      medicine_id,
      unit,
      quantity,
      unit_factor,
      base_quantity,
      unit_price,
      total,
      cost_status,
      costed_base_quantity,
      uncosted_base_quantity
    )
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
      'tablet',
      2,
      3,
      5,
      5,
      10,
      'unavailable',
      0,
      5
    );

    raise exception 'Expected invalid sale line math to fail'
      using errcode = 'P0002';
  exception
    when check_violation then null;
  end;
end;
$$;

insert into public.sale_items (
  pharmacy_id,
  sale_id,
  medicine_id,
  unit,
  quantity,
  unit_factor,
  base_quantity,
  unit_price,
  total,
  cost_status,
  costed_base_quantity,
  uncosted_base_quantity
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  'tablet',
  2,
  5,
  10,
  5,
  10,
  'unavailable',
  0,
  10
);

insert into public.payments (pharmacy_id, sale_id, amount)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
  5
);

do $$
begin
  begin
    insert into public.payments (pharmacy_id, sale_id, amount)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
      0
    );

    raise exception 'Expected zero payment to fail'
      using errcode = 'P0002';
  exception
    when check_violation then null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.payments (pharmacy_id, sale_id, amount)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
      6
    );

    raise exception 'Expected overpayment to fail'
      using errcode = 'P0002';
  exception
    when raise_exception then null;
  end;
end;
$$;

insert into public.stock_movements (
  id,
  pharmacy_id,
  medicine_id,
  movement_type,
  quantity_base
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  'purchase',
  5
);

do $$
begin
  if not exists (
    select 1
    from public.medicines
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
      and stock = 5
  ) then
    raise exception 'Stock movement was not applied to medicine stock';
  end if;
end;
$$;

do $$
begin
  begin
    update public.medicines
    set stock = 100
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';

    raise exception 'Expected direct stock update to fail'
      using errcode = 'P0002';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.stock_movements (
      pharmacy_id,
      medicine_id,
      movement_type,
      quantity_base
    )
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
      'sale',
      -6
    );

    raise exception 'Expected insufficient stock sale to fail'
      using errcode = 'P0002';
  exception
    when check_violation then null;
  end;
end;
$$;

do $$
begin
  begin
    update public.stock_movements
    set quantity_base = 10
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03';

    raise exception 'Expected stock movement mutation to fail'
      using errcode = 'P0002';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from public.medicines
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
      and stock = 5
  ) then
    raise exception 'Rejected stock operations changed medicine stock';
  end if;
end;
$$;

rollback;
