create or replace function public.build_sale_payload(p_sale_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'sale',
    jsonb_build_object(
      'id', s.id,
      'pharmacyId', s.pharmacy_id,
      'saleDate', s.sale_date,
      'totalAmount', s.total_amount,
      'clientReference', s.client_reference,
      'notes', s.notes,
      'recordedBy', s.recorded_by,
      'createdAt', s.created_at
    ),
    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', si.id,
            'medicineId', si.medicine_id,
            'packagingUnitId', si.packaging_unit_id,
            'unit', si.unit,
            'quantity', si.quantity,
            'unitFactor', si.unit_factor,
            'baseQuantity', si.base_quantity,
            'unitPrice', si.unit_price,
            'total', si.total,
            'cogs', si.cogs,
            'costStatus', si.cost_status,
            'costedBaseQuantity', si.costed_base_quantity,
            'uncostedBaseQuantity', si.uncosted_base_quantity,
            'allocations',
            coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'batchId', a.purchase_batch_id,
                    'batchNumber', b.batch_number,
                    'expiryDate', b.expiry_date,
                    'quantityBase', a.quantity_base,
                    'unitCostBase', b.unit_cost_base
                  )
                  order by b.expiry_date, b.received_date, b.created_at, b.id
                )
                from public.sale_batch_allocations a
                join public.purchase_batches b
                  on b.id = a.purchase_batch_id
                where a.sale_item_id = si.id
              ),
              '[]'::jsonb
            )
          )
          order by si.created_at, si.id
        )
        from public.sale_items si
        where si.sale_id = s.id
      ),
      '[]'::jsonb
    )
  )
  from public.sales s
  where s.id = p_sale_id;
$$;

create or replace function public.create_sale_with_fefo(
  p_pharmacy_id uuid,
  p_client_reference text,
  p_items jsonb,
  p_sale_date timestamptz default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sale_id uuid;
  v_existing_sale_id uuid;
  v_item jsonb;
  v_medicine_id uuid;
  v_packaging_unit_id uuid;
  v_unit text;
  v_quantity integer;
  v_unit_price numeric(14, 2);
  v_line_total numeric(14, 2);
  v_base_quantity integer;
  v_sale_item_id uuid;
  v_packaging public.packaging_units%rowtype;
begin
  if p_client_reference is null or btrim(p_client_reference) = '' then
    raise exception 'A client reference is required for idempotent sale creation'
      using errcode = '22023';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    raise exception 'Sale items must be a non-empty JSON array'
      using errcode = '22023';
  end if;

  if not public.has_pharmacy_role(
    p_pharmacy_id,
    array['owner', 'manager', 'pharmacist', 'cashier']
  ) then
    raise exception 'Pharmacy membership and sales role required'
      using errcode = '42501';
  end if;

  select id
  into v_existing_sale_id
  from public.sales
  where pharmacy_id = p_pharmacy_id
    and client_reference = p_client_reference;

  if v_existing_sale_id is not null then
    return public.build_sale_payload(v_existing_sale_id);
  end if;

  begin
    insert into public.sales (
      pharmacy_id,
      sale_date,
      recorded_by,
      total_amount,
      notes,
      client_reference
    )
    values (
      p_pharmacy_id,
      coalesce(p_sale_date, now()),
      auth.uid(),
      0,
      p_notes,
      p_client_reference
    )
    returning id into v_sale_id;
  exception
    when unique_violation then
      select id
      into v_existing_sale_id
      from public.sales
      where pharmacy_id = p_pharmacy_id
        and client_reference = p_client_reference;

      if v_existing_sale_id is not null then
        return public.build_sale_payload(v_existing_sale_id);
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

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_medicine_id := nullif(v_item ->> 'medicineId', '')::uuid;
    v_packaging_unit_id := nullif(v_item ->> 'packagingUnitId', '')::uuid;
    v_unit := nullif(btrim(v_item ->> 'unit'), '');
    v_quantity := nullif(v_item ->> 'quantity', '')::integer;
    v_unit_price := nullif(v_item ->> 'unitPrice', '')::numeric(14, 2);

    if v_medicine_id is null then
      raise exception 'Every sale item requires a medicine'
        using errcode = '22023';
    end if;

    if v_quantity is null or v_quantity < 1 then
      raise exception 'Sale item quantities must be positive whole numbers'
        using errcode = '22023';
    end if;

    if v_unit_price is null or v_unit_price <= 0 then
      raise exception 'Sale item prices must be greater than zero'
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
      raise exception 'Sale item packaging unit does not belong to the medicine and pharmacy'
        using errcode = '22023';
    end if;

    v_base_quantity := v_quantity * v_packaging.contains_base_units;
    v_line_total := round(v_quantity * v_unit_price, 2);

    insert into public.sale_items (
      pharmacy_id,
      sale_id,
      medicine_id,
      packaging_unit_id,
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
      p_pharmacy_id,
      v_sale_id,
      v_medicine_id,
      v_packaging.id,
      v_packaging.unit,
      v_quantity,
      v_packaging.contains_base_units,
      v_base_quantity,
      v_unit_price,
      v_line_total,
      0,
      'unavailable',
      0,
      v_base_quantity
    )
    returning id into v_sale_item_id;

    begin
      perform public.allocate_sale_batches_fefo(v_sale_item_id);
    exception
      when raise_exception then
        if sqlerrm like 'Insufficient unexpired batch stock%' then
          raise exception 'FEFO_CONFLICT: %', sqlerrm
            using errcode = 'PT409';
        end if;
        raise;
    end;
  end loop;

  select coalesce(sum(total), 0)
  into v_line_total
  from public.sale_items
  where sale_id = v_sale_id;

  update public.sales
  set total_amount = v_line_total
  where id = v_sale_id;

  return public.build_sale_payload(v_sale_id);
end;
$$;

revoke all on function public.build_sale_payload(uuid) from public;
revoke all on function public.build_sale_payload(uuid) from anon;
revoke all on function public.build_sale_payload(uuid) from authenticated;

revoke all on function public.create_sale_with_fefo(uuid, text, jsonb, timestamptz, text) from public;
revoke all on function public.create_sale_with_fefo(uuid, text, jsonb, timestamptz, text) from anon;
grant execute on function public.create_sale_with_fefo(uuid, text, jsonb, timestamptz, text) to authenticated;
