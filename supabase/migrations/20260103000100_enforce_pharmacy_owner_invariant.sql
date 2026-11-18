create or replace function public.protect_pharmacy_member_role()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_pharmacy_id uuid;
  v_is_active_owner boolean;
  v_is_creator boolean;
  v_has_active_owner boolean;
  v_has_other_owner boolean;
  v_pharmacy_exists boolean;
begin
  if tg_op = 'DELETE' then
    v_pharmacy_id := old.pharmacy_id;
  else
    v_pharmacy_id := new.pharmacy_id;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_pharmacy_id::text, 0));

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.pharmacy_id is distinct from old.pharmacy_id
       or new.user_id is distinct from old.user_id
       or new.created_at is distinct from old.created_at
    then
      raise exception 'Pharmacy membership identity fields cannot be changed'
        using errcode = '42501';
    end if;
  end if;

  if auth.uid() is not null then
    select exists (
      select 1
      from public.pharmacies p
      where p.id = v_pharmacy_id
        and p.created_by = auth.uid()
    )
    into v_is_creator;
  else
    v_is_creator := false;
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'owner' then
      v_is_active_owner := public.has_pharmacy_role(new.pharmacy_id, array['owner']);

      select exists (
        select 1
        from public.pharmacy_members
        where pharmacy_id = new.pharmacy_id
          and role = 'owner'
          and status = 'active'
      )
      into v_has_active_owner;

      if not v_is_active_owner
         and not (
           new.user_id = auth.uid()
           and new.status = 'active'
           and v_is_creator
           and not v_has_active_owner
         )
      then
        raise exception 'Only an existing owner can assign the owner role'
          using errcode = '42501';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.role = 'owner'
       and (
         old.role is distinct from 'owner'
         or (new.status = 'active' and old.status is distinct from 'active')
       )
    then
      v_is_active_owner := public.has_pharmacy_role(new.pharmacy_id, array['owner']);

      select exists (
        select 1
        from public.pharmacy_members
        where pharmacy_id = new.pharmacy_id
          and role = 'owner'
          and status = 'active'
          and id is distinct from old.id
      )
      into v_has_other_owner;

      if not v_is_active_owner
         and not (
           new.user_id = auth.uid()
           and new.status = 'active'
           and v_is_creator
           and not v_has_other_owner
         )
      then
        raise exception 'Only an existing owner can assign the owner role'
          using errcode = '42501';
      end if;
    end if;

    if old.role = 'owner'
       and old.status = 'active'
       and (
         new.role is distinct from 'owner'
         or new.status is distinct from 'active'
       )
    then
      select exists (
        select 1
        from public.pharmacies p
        where p.id = old.pharmacy_id
      )
      into v_pharmacy_exists;

      if v_pharmacy_exists then
        select exists (
          select 1
          from public.pharmacy_members
          where pharmacy_id = old.pharmacy_id
            and role = 'owner'
            and status = 'active'
            and id is distinct from old.id
        )
        into v_has_other_owner;

        if not v_has_other_owner then
          raise exception 'Cannot remove the last active owner of a pharmacy';
        end if;
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'owner' and old.status = 'active' then
      select exists (
        select 1
        from public.pharmacies p
        where p.id = old.pharmacy_id
      )
      into v_pharmacy_exists;

      if v_pharmacy_exists then
        select exists (
          select 1
          from public.pharmacy_members
          where pharmacy_id = old.pharmacy_id
            and role = 'owner'
            and status = 'active'
            and id is distinct from old.id
        )
        into v_has_other_owner;

        if not v_has_other_owner then
          raise exception 'Cannot remove the last active owner of a pharmacy';
        end if;
      end if;
    end if;

    return old;
  end if;

  return null;
end;
$$;

create or replace function public.protect_profile_from_orphaning_pharmacy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_pharmacy_id uuid;
  v_has_other_owner boolean;
begin
  for v_pharmacy_id in
    select pm.pharmacy_id
    from public.pharmacy_members pm
    join public.pharmacies p on p.id = pm.pharmacy_id
    where pm.user_id = old.id
      and pm.role = 'owner'
      and pm.status = 'active'
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_pharmacy_id::text, 0));

    select exists (
      select 1
      from public.pharmacy_members
      where pharmacy_id = v_pharmacy_id
        and role = 'owner'
        and status = 'active'
        and user_id <> old.id
    )
    into v_has_other_owner;

    if not v_has_other_owner then
      raise exception 'Cannot delete a profile that is the last active owner of a pharmacy';
    end if;
  end loop;

  return old;
end;
$$;

drop trigger if exists pharmacy_members_protect_role on public.pharmacy_members;

create trigger pharmacy_members_protect_role
before insert or update or delete on public.pharmacy_members
for each row execute function public.protect_pharmacy_member_role();

drop trigger if exists profiles_protect_last_owner on public.profiles;

create trigger profiles_protect_last_owner
before delete on public.profiles
for each row execute function public.protect_profile_from_orphaning_pharmacy();

revoke all on function public.protect_pharmacy_member_role() from public;
revoke all on function public.protect_pharmacy_member_role() from anon;
revoke all on function public.protect_pharmacy_member_role() from authenticated;
revoke all on function public.protect_profile_from_orphaning_pharmacy() from public;
revoke all on function public.protect_profile_from_orphaning_pharmacy() from anon;
revoke all on function public.protect_profile_from_orphaning_pharmacy() from authenticated;
