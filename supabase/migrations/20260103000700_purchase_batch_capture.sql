create or replace function public.build_purchase_payload(p_purchase_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'purchase',
    jsonb_build_object(
      'id', p.id,
      'pharmacyId', p.pharmacy_id,
      'supplierId', p.supplier_id,
      'supplierName', p.supplier_name,
      'purchaseDate', p.purchase_date,
      'totalCost', p.total_cost,
      'clientReference', p.client_reference,
      'notes', p.notes,
      'recordedBy', p.recorded_by,
      'createdAt', p.created_at
    ),
    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', pi.id,
            'medicineId', pi.medicine_id,
            'packagingUnitId', pi.packaging_unit_id,
            'quantity', pi.quantity,
            'unitFactor', pi.unit_factor,
            'baseQuantity', pi.base_quantity,
            'unitCost', pi.unit_cost,
            'totalCost', pi.total_cost,
            'batches',
            coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', b.id,
                    'batchNumber', b.batch_number,
                    'expiryDate', b.expiry_date,
                    'quantityReceivedBase', b.quantity_received_base,
                    'quantityRemainingBase', b.quantity_remaining_base,
                    'unitCost', b.unit_cost,
                    'unitCostBase', b.unit_cost_base,
                    'supplierName', b.supplier_name,
                    'receivedDate', b.received_date
                  )
                  order by b.created_at, b.id
                )
                from public.purchase_batches b
                where b.purchase_item_id = pi.id
              ),
              '[]'::jsonb
            )
          )
          order by pi.created_at, pi.id
        )
        from public.purchase_items pi
        where pi.purchase_id = p.id
      ),
      '[]'::jsonb
    )
  )
  from public.purchases p
  where p.id = p_purchase_id;
$$;

create or replace function public.create_purchase_with_batches(
  p_pharmacy_id uuid,
  p_client_reference text,
  p_items jsonb,
  p_supplier_name text,
  p_supplier_id uuid default null,
  p_purchase_date timestamptz default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase_id uuid;
  v_existing_purchase_id uuid;
  v_purchase_date timestamptz;
  v_supplier_name text;
  v_item jsonb;
  v_index integer;
  v_medicine_id uuid;
  v_packaging_unit_id uuid;
  v_unit text;
  v_quantity integer;
  v_unit_cost numeric(14, 2);
  v_line_total numeric(14, 2);
  v_base_quantity integer;
  v_batch_number text;
  v_expiry_date date;
  v_purchase_item_id uuid;
  v_purchase_batch_id uuid;
  v_packaging public.packaging_units%rowtype;
begin
  if p_client_reference is null or btrim(p_client_reference) = '' then
    raise exception 'A client reference is required for idempotent purchase creation'
      using errcode = '22023';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    raise exception 'Purchase items must be a non-empty JSON array'
      using errcode = '22023';
  end if;

  if not public.has_pharmacy_role(
    p_pharmacy_id,
    array['owner', 'manager', 'pharmacist']
  ) then
    raise exception 'Pharmacy membership and purchasing role required'
      using errcode = '42501';
  end if;

  select id
  into v_existing_purchase_id
  from public.purchases
  where pharmacy_id = p_pharmacy_id
    and client_reference = p_client_reference;

  if v_existing_purchase_id is not null then
    return public.build_purchase_payload(v_existing_purchase_id);
  end if;

  v_supplier_name := nullif(btrim(p_supplier_name), '');

  if v_supplier_name is null then
    raise exception 'A supplier name is required'
      using errcode = '22023';
  end if;

  if p_supplier_id is not null
     and not exists (
       select 1
       from public.suppliers
       where id = p_supplier_id
         and pharmacy_id = p_pharmacy_id
     )
  then
    raise exception 'Supplier does not belong to the pharmacy'
      using errcode = '22023';
  end if;

  v_purchase_date := coalesce(p_purchase_date, now());

  begin
    insert into public.purchases (
      pharmacy_id,
      supplier_id,
      supplier_name,
      purchase_date,
      recorded_by,
      total_cost,
      notes,
      client_reference
    )
    values (
      p_pharmacy_id,
      p_supplier_id,
      v_supplier_name,
      v_purchase_date,
      auth.uid(),
      0,
      p_notes,
      p_client_reference
    )
    returning id into v_purchase_id;
  exception
    when unique_violation then
      select id
      into v_existing_purchase_id
      from public.purchases
      where pharmacy_id = p_pharmacy_id
        and client_reference = p_client_reference;

      if v_existing_purchase_id is not null then
        return public.build_purchase_payload(v_existing_purchase_id);
      end if;

      raise;
  end;

  perform 1
  from public.medicines
  where pharmacy_id = p_pharmacy_id
    and id in (
      select distinct nullif(item ->> 'medicineId', '')::uuid
      from jsonb_array_elements(p_items) as item
    )
  order by id
  for update;

  for v_item, v_index in
    select value, ordinality
    from jsonb_array_elements(p_items) with ordinality
  loop
    v_medicine_id := nullif(v_item ->> 'medicineId', '')::uuid;
    v_packaging_unit_id := nullif(v_item ->> 'packagingUnitId', '')::uuid;
    v_unit := nullif(btrim(v_item ->> 'unit'), '');
    v_quantity := nullif(v_item ->> 'quantity', '')::integer;
    v_unit_cost := nullif(v_item ->> 'unitCost', '')::numeric(14, 2);
    v_batch_number := nullif(btrim(v_item ->> 'batchNumber'), '');
    v_expiry_date := nullif(v_item ->> 'expiryDate', '')::date;

    if v_medicine_id is null then
      raise exception 'Every purchase item requires a medicine'
        using errcode = '22023';
    end if;

    if v_quantity is null or v_quantity < 1 then
      raise exception 'Purchase item quantities must be positive whole numbers'
        using errcode = '22023';
    end if;

    if v_unit_cost is null or v_unit_cost < 0 then
      raise exception 'Purchase item costs cannot be negative'
        using errcode = '22023';
    end if;

    if v_expiry_date is not null
       and v_expiry_date < v_purchase_date::date
    then
      raise exception 'Batch expiry cannot be before the purchase date'
        using errcode = '22023';
    end if;

    if v_packaging_unit_id is not null then
      select *
      into v_packaging
      from public.packaging_units
      where id = v_packaging_unit_id
        and pharmacy_id = p_pharmacy_id
        and medicine_id = v_medicine_id;
    else
      select *
      into v_packaging
      from public.packaging_units
      where pharmacy_id = p_pharmacy_id
        and medicine_id = v_medicine_id
        and lower(unit) = lower(v_unit);
    end if;

    if not found then
      raise exception 'Purchase item packaging unit does not belong to the medicine and pharmacy'
        using errcode = '22023';
    end if;

    v_base_quantity := v_quantity * v_packaging.contains_base_units;
    v_line_total := round(v_quantity * v_unit_cost, 2);

    insert into public.purchase_items (
      pharmacy_id,
      purchase_id,
      medicine_id,
      packaging_unit_id,
      quantity,
      unit_factor,
      base_quantity,
      unit_cost,
      total_cost
    )
    values (
      p_pharmacy_id,
      v_purchase_id,
      v_medicine_id,
      v_packaging.id,
      v_quantity,
      v_packaging.contains_base_units,
      v_base_quantity,
      v_unit_cost,
      v_line_total
    )
    returning id into v_purchase_item_id;

    insert into public.purchase_batches (
      pharmacy_id,
      purchase_id,
      purchase_item_id,
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
    values (
      p_pharmacy_id,
      v_purchase_id,
      v_purchase_item_id,
      v_medicine_id,
      v_batch_number,
      v_expiry_date,
      v_base_quantity,
      v_base_quantity,
      v_unit_cost,
      round(v_unit_cost / v_packaging.contains_base_units, 4),
      v_supplier_name,
      v_purchase_date
    )
    returning id into v_purchase_batch_id;

    insert into public.stock_movements (
      pharmacy_id,
      medicine_id,
      movement_type,
      quantity_base,
      reference_type,
      reference_id,
      reason,
      client_reference
    )
    values (
      p_pharmacy_id,
      v_medicine_id,
      'purchase',
      v_base_quantity,
      'purchase_item',
      v_purchase_item_id,
      'Purchase receipt',
      format('purchase:%s:%s', p_client_reference, v_index)
    );
  end loop;

  select coalesce(sum(total_cost), 0)
  into v_line_total
  from public.purchase_items
  where purchase_id = v_purchase_id;

  update public.purchases
  set total_cost = v_line_total
  where id = v_purchase_id;

  return public.build_purchase_payload(v_purchase_id);
end;
$$;

revoke all on function public.build_purchase_payload(uuid) from public;
revoke all on function public.build_purchase_payload(uuid) from anon;
revoke all on function public.build_purchase_payload(uuid) from authenticated;

revoke all on function public.create_purchase_with_batches(uuid, text, jsonb, text, uuid, timestamptz, text) from public;
revoke all on function public.create_purchase_with_batches(uuid, text, jsonb, text, uuid, timestamptz, text) from anon;
grant execute on function public.create_purchase_with_batches(uuid, text, jsonb, text, uuid, timestamptz, text) to authenticated;
