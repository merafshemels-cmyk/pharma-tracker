-- Onboarding support: allow first owner creation, block self-promotion when an owner exists

create or replace function public.protect_pharmacy_member_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A user may become the first owner of a pharmacy they are onboarding.
  -- Once any owner exists, only an existing owner can assign the owner role.
  if new.role = 'owner'
     and new.user_id = auth.uid()
     and exists (
       select 1 from public.pharmacy_members
       where pharmacy_id = new.pharmacy_id
         and role = 'owner'
         and (tg_op = 'UPDATE' or id is distinct from new.id)
     )
  then
    raise exception 'Users cannot assign themselves the owner role';
  end if;

  if new.role = 'owner'
     and auth.uid() is not null
     and exists (
       select 1 from public.pharmacy_members
       where pharmacy_id = new.pharmacy_id
         and role = 'owner'
         and id is distinct from new.id
     )
     and not public.has_pharmacy_role(new.pharmacy_id, array['owner'])
  then
    raise exception 'Only an existing owner can assign the owner role';
  end if;

  return new;
end;
$$;

create or replace function public.create_pharmacy_with_owner(
  p_name text,
  p_location text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pharmacy_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Pharmacy name is required';
  end if;

  insert into public.pharmacies (name, location, phone)
  values (trim(p_name), nullif(trim(coalesce(p_location, '')), ''), nullif(trim(coalesce(p_phone, '')), ''))
  returning id into v_pharmacy_id;

  insert into public.pharmacy_members (pharmacy_id, user_id, role, status)
  values (v_pharmacy_id, auth.uid(), 'owner', 'active');

  return v_pharmacy_id;
end;
$$;

grant execute on function public.create_pharmacy_with_owner(text, text, text) to authenticated;