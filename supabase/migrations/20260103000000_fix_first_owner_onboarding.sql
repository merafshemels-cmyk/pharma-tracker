alter table public.pharmacies
  add column if not exists created_by uuid default auth.uid();

alter table public.pharmacies
  add constraint pharmacies_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

create index if not exists idx_pharmacies_created_by
  on public.pharmacies (created_by);

create or replace function public.can_bootstrap_pharmacy_owner(
  p_pharmacy_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p_user_id = auth.uid()
    and exists (
      select 1
      from public.pharmacies p
      where p.id = p_pharmacy_id
        and p.created_by = auth.uid()
    )
    and not exists (
      select 1
      from public.pharmacy_members pm
      where pm.pharmacy_id = p_pharmacy_id
    );
$$;

revoke all on function public.can_bootstrap_pharmacy_owner(uuid, uuid) from public;
revoke all on function public.can_bootstrap_pharmacy_owner(uuid, uuid) from anon;
grant execute on function public.can_bootstrap_pharmacy_owner(uuid, uuid) to authenticated;

drop policy if exists "pharmacies_insert_authenticated" on public.pharmacies;

create policy "pharmacies_insert_authenticated"
on public.pharmacies for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "pharmacy_members_insert_owner_or_first_owner" on public.pharmacy_members;

create policy "pharmacy_members_insert_owner_or_first_owner"
on public.pharmacy_members for insert
to authenticated
with check (
  public.has_pharmacy_role(pharmacy_id, array['owner'])
  or (
    public.can_bootstrap_pharmacy_owner(pharmacy_id, user_id)
    and role = 'owner'
    and status = 'active'
  )
);

create or replace function public.create_pharmacy_with_owner(
  p_name text,
  p_location text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
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

  insert into public.pharmacies (name, location, phone, created_by)
  values (
    trim(p_name),
    nullif(trim(coalesce(p_location, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    auth.uid()
  )
  returning id into v_pharmacy_id;

  insert into public.pharmacy_members (pharmacy_id, user_id, role, status)
  values (v_pharmacy_id, auth.uid(), 'owner', 'active');

  return v_pharmacy_id;
end;
$$;

revoke all on function public.create_pharmacy_with_owner(text, text, text) from public;
revoke all on function public.create_pharmacy_with_owner(text, text, text) from anon;
grant execute on function public.create_pharmacy_with_owner(text, text, text) to authenticated;
