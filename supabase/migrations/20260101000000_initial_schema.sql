-- PharmaTrack production database foundation
-- Multi-pharmacy PostgreSQL schema for Supabase

create extension if not exists "pgcrypto";

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profile creation on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- role protection
create or replace function public.protect_pharmacy_member_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'owner'
     and (tg_op = 'INSERT' or old.role is distinct from 'owner')
     and new.user_id = auth.uid()
  then
    raise exception 'Users cannot assign themselves the owner role';
  end if;

  if new.role = 'owner'
     and auth.uid() is not null
     and exists (
       select 1 from public.pharmacy_members
       where pharmacy_id = new.pharmacy_id
         and role = 'owner'
     )
     and not public.has_pharmacy_role(new.pharmacy_id, array['owner'])
  then
    raise exception 'Only an existing owner can assign the owner role';
  end if;

  return new;
end;
$$;

-- membership helpers
create or replace function public.is_pharmacy_member(p_pharmacy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pharmacy_members
    where pharmacy_id = p_pharmacy_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.has_pharmacy_role(p_pharmacy_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pharmacy_members
    where pharmacy_id = p_pharmacy_id
      and user_id = auth.uid()
      and status = 'active'
      and role = any (p_roles)
  );
$$;

-- pharmacies
create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pharmacies_set_updated_at
before update on public.pharmacies
for each row execute function public.set_updated_at();

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- pharmacy_members
create table if not exists public.pharmacy_members (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'cashier', 'pharmacist')),
  status text not null default 'active' check (status in ('active', 'inactive', 'invited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pharmacy_id, user_id)
);

create trigger pharmacy_members_set_updated_at
before update on public.pharmacy_members
for each row execute function public.set_updated_at();

create trigger pharmacy_members_protect_role
before insert or update on public.pharmacy_members
for each row execute function public.protect_pharmacy_member_role();

-- medicines
create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  name text not null,
  strength text,
  dosage_form text,
  base_unit text not null,
  selling_price numeric(14, 2) not null default 0 check (selling_price >= 0),
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pharmacy_id, name, strength)
);

create trigger medicines_set_updated_at
before update on public.medicines
for each row execute function public.set_updated_at();

-- packaging_units
create table if not exists public.packaging_units (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  unit text not null,
  contains_base_units integer not null check (contains_base_units > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (medicine_id, unit)
);

create trigger packaging_units_set_updated_at
before update on public.packaging_units
for each row execute function public.set_updated_at();

-- medicine_prices
create table if not exists public.medicine_prices (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  packaging_unit_id uuid not null references public.packaging_units(id) on delete cascade,
  price numeric(14, 2) not null check (price >= 0),
  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (medicine_id, packaging_unit_id)
);

create trigger medicine_prices_set_updated_at
before update on public.medicine_prices
for each row execute function public.set_updated_at();

-- suppliers
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pharmacy_id, name)
);

create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

-- purchases
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_name text not null,
  purchase_date timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  total_cost numeric(14, 2) not null default 0 check (total_cost >= 0),
  notes text,
  client_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists purchases_pharmacy_client_reference_uidx
  on public.purchases (pharmacy_id, client_reference)
  where client_reference is not null;

create trigger purchases_set_updated_at
before update on public.purchases
for each row execute function public.set_updated_at();

-- purchase_items
create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete restrict,
  packaging_unit_id uuid references public.packaging_units(id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_factor integer not null check (unit_factor > 0),
  base_quantity integer not null check (base_quantity > 0),
  unit_cost numeric(14, 2) not null check (unit_cost >= 0),
  total_cost numeric(14, 2) not null check (total_cost >= 0),
  created_at timestamptz not null default now()
);

-- purchase_batches
create table if not exists public.purchase_batches (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete set null,
  purchase_item_id uuid references public.purchase_items(id) on delete set null,
  medicine_id uuid not null references public.medicines(id) on delete restrict,
  batch_number text,
  expiry_date date,
  quantity_received_base integer not null check (quantity_received_base >= 0),
  quantity_remaining_base integer not null check (quantity_remaining_base >= 0),
  unit_cost numeric(14, 2) not null check (unit_cost >= 0),
  unit_cost_base numeric(14, 4) not null check (unit_cost_base >= 0),
  supplier_name text,
  received_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger purchase_batches_set_updated_at
before update on public.purchase_batches
for each row execute function public.set_updated_at();

-- sales
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  sale_date timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  notes text,
  client_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sales_pharmacy_client_reference_uidx
  on public.sales (pharmacy_id, client_reference)
  where client_reference is not null;

create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

-- sale_items
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete restrict,
  packaging_unit_id uuid references public.packaging_units(id) on delete set null,
  unit text not null,
  quantity integer not null check (quantity > 0),
  unit_factor integer not null check (unit_factor > 0),
  base_quantity integer not null check (base_quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  total numeric(14, 2) not null check (total >= 0),
  cogs numeric(14, 2) not null default 0 check (cogs >= 0),
  cost_status text not null default 'unavailable' check (cost_status in ('available', 'partial', 'unavailable')),
  costed_base_quantity integer not null default 0 check (costed_base_quantity >= 0),
  uncosted_base_quantity integer not null default 0 check (uncosted_base_quantity >= 0),
  created_at timestamptz not null default now()
);

-- payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete set null,
  amount numeric(14, 2) not null check (amount >= 0),
  payment_method text not null default 'cash',
  payment_reference text,
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- stock_movements
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete restrict,
  movement_type text not null check (movement_type in ('purchase', 'sale', 'adjustment', 'damaged', 'expired', 'return', 'opening')),
  quantity_base integer not null,
  reference_type text,
  reference_id uuid,
  reason text,
  recorded_by uuid references public.profiles(id) on delete set null,
  client_reference text,
  created_at timestamptz not null default now()
);

create unique index if not exists stock_movements_pharmacy_client_reference_uidx
  on public.stock_movements (pharmacy_id, client_reference)
  where client_reference is not null;

-- audit_logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

-- subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  plan text not null check (plan in ('monthly', 'annual')),
  status text not null default 'active' check (status in ('trial', 'active', 'expired', 'suspended', 'cancelled')),
  start_date timestamptz not null default now(),
  expiry_date timestamptz not null,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'ETB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- subscription_payments
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'ETB',
  payment_method text not null default 'bank_transfer',
  payment_reference text,
  status text not null default 'recorded' check (status in ('pending', 'recorded', 'failed', 'refunded')),
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- indexes
create index if not exists idx_pharmacy_members_pharmacy on public.pharmacy_members (pharmacy_id);
create index if not exists idx_pharmacy_members_user on public.pharmacy_members (user_id);
create index if not exists idx_medicines_pharmacy on public.medicines (pharmacy_id);
create index if not exists idx_packaging_units_medicine on public.packaging_units (medicine_id);
create index if not exists idx_medicine_prices_medicine on public.medicine_prices (medicine_id);
create index if not exists idx_suppliers_pharmacy on public.suppliers (pharmacy_id);
create index if not exists idx_purchases_pharmacy_date on public.purchases (pharmacy_id, purchase_date desc);
create index if not exists idx_purchase_items_purchase on public.purchase_items (purchase_id);
create index if not exists idx_purchase_items_medicine on public.purchase_items (medicine_id);
create index if not exists idx_purchase_batches_medicine on public.purchase_batches (medicine_id);
create index if not exists idx_purchase_batches_expiry on public.purchase_batches (expiry_date);
create index if not exists idx_sales_pharmacy_date on public.sales (pharmacy_id, sale_date desc);
create index if not exists idx_sale_items_sale on public.sale_items (sale_id);
create index if not exists idx_sale_items_medicine on public.sale_items (medicine_id);
create index if not exists idx_payments_sale on public.payments (sale_id);
create index if not exists idx_stock_movements_pharmacy_medicine on public.stock_movements (pharmacy_id, medicine_id, created_at desc);
create index if not exists idx_audit_logs_pharmacy_created on public.audit_logs (pharmacy_id, created_at desc);
create index if not exists idx_subscriptions_pharmacy on public.subscriptions (pharmacy_id, expiry_date desc);

-- outstanding balance view
create or replace view public.sale_payment_balances
with (security_invoker = true) as
select
  s.id as sale_id,
  s.pharmacy_id,
  s.total_amount,
  coalesce(sum(p.amount), 0)::numeric(14, 2) as paid_amount,
  (s.total_amount - coalesce(sum(p.amount), 0))::numeric(14, 2) as balance
from public.sales s
left join public.payments p on p.sale_id = s.id
group by s.id;

-- RLS
alter table public.pharmacies enable row level security;
alter table public.profiles enable row level security;
alter table public.pharmacy_members enable row level security;
alter table public.medicines enable row level security;
alter table public.packaging_units enable row level security;
alter table public.medicine_prices enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.purchase_batches enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.stock_movements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;

-- pharmacies policies
create policy "pharmacies_select_member"
on public.pharmacies for select
using (public.is_pharmacy_member(id));

create policy "pharmacies_insert_authenticated"
on public.pharmacies for insert
with check (auth.uid() is not null);

create policy "pharmacies_update_owner"
on public.pharmacies for update
using (public.has_pharmacy_role(id, array['owner']))
with check (public.has_pharmacy_role(id, array['owner']));

create policy "pharmacies_delete_owner"
on public.pharmacies for delete
using (public.has_pharmacy_role(id, array['owner']));

-- profiles policies
create policy "profiles_select_self_or_same_pharmacy"
on public.profiles for select
using (
  id = auth.uid()
  or id in (
    select pm.user_id
    from public.pharmacy_members pm
    where pm.pharmacy_id in (
      select pm2.pharmacy_id
      from public.pharmacy_members pm2
      where pm2.user_id = auth.uid()
        and pm2.status = 'active'
    )
  )
);

create policy "profiles_insert_self"
on public.profiles for insert
with check (id = auth.uid());

create policy "profiles_update_self"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- pharmacy_members policies
create policy "pharmacy_members_select_member"
on public.pharmacy_members for select
using (public.is_pharmacy_member(pharmacy_id));

create policy "pharmacy_members_insert_owner_or_first_owner"
on public.pharmacy_members for insert
with check (
  public.has_pharmacy_role(pharmacy_id, array['owner'])
  or (
    user_id = auth.uid()
    and role = 'owner'
    and not exists (
      select 1 from public.pharmacy_members pm
      where pm.pharmacy_id = pharmacy_id
    )
  )
);

create policy "pharmacy_members_update_owner"
on public.pharmacy_members for update
using (public.has_pharmacy_role(pharmacy_id, array['owner']))
with check (public.has_pharmacy_role(pharmacy_id, array['owner']));

create policy "pharmacy_members_delete_owner"
on public.pharmacy_members for delete
using (public.has_pharmacy_role(pharmacy_id, array['owner']));

-- generic member read / role-based write policies
-- medicines
create policy "medicines_select_member"
on public.medicines for select
using (public.is_pharmacy_member(pharmacy_id));

create policy "medicines_insert_staff"
on public.medicines for insert
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']));

create policy "medicines_update_staff"
on public.medicines for update
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']))
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']));

create policy "medicines_delete_owner_manager"
on public.medicines for delete
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']));

-- packaging_units
create policy "packaging_units_select_member"
on public.packaging_units for select
using (public.is_pharmacy_member(pharmacy_id));

create policy "packaging_units_write_staff"
on public.packaging_units for all
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']))
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']));

-- medicine_prices
create policy "medicine_prices_select_member"
on public.medicine_prices for select
using (public.is_pharmacy_member(pharmacy_id));

create policy "medicine_prices_write_staff"
on public.medicine_prices for all
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']))
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']));

-- suppliers
create policy "suppliers_select_member"
on public.suppliers for select
using (public.is_pharmacy_member(pharmacy_id));

create policy "suppliers_write_staff"
on public.suppliers for all
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']))
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']));

-- purchases
create policy "purchases_select_member"
on public.purchases for select
using (public.is_pharmacy_member(pharmacy_id));

create policy "purchases_insert_staff"
on public.purchases for insert
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']));

create policy "purchases_update_owner_manager"
on public.purchases for update
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']))
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']));

create policy "purchases_delete_owner"
on public.purchases for delete
using (public.has_pharmacy_role(pharmacy_id, array['owner']));

-- purchase_items
create policy "purchase_items_select_member"
on public.purchase_items for select
using (public.is_pharmacy_member(pharmacy_id));

create policy "purchase_items_insert_staff"
on public.purchase_items for insert
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']));

create policy "purchase_items_update_owner_manager"
on public.purchase_items for update
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']))
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']));

create policy "purchase_items_delete_owner"
on public.purchase_items for delete
using (public.has_pharmacy_role(pharmacy_id, array['owner']));

-- purchase_batches
create policy "purchase_batches_select_member"
on public.purchase_batches for select
using (public.is_pharmacy_member(pharmacy_id));

create policy "purchase_batches_write_staff"
on public.purchase_batches for all
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']))
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager', 'pharmacist']));

-- sales
create policy "sales_select_member"
on public.sales for select
using (public.is_pharmacy_member(pharmacy_id));

create policy "sales_insert_member"
on public.sales for insert
with check (public.is_pharmacy_member(pharmacy_id));

create policy "sales_update_owner_manager"
on public.sales for update
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']))
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']));

create policy "sales_delete_owner"
on public.sales for delete
using (public.has_pharmacy_role(pharmacy_id, array['owner']));

-- sale_items
create policy "sale_items_select_member"
on public.sale_items for select
using (public.is_pharmacy_member(pharmacy_id));

create policy "sale_items_insert_member"
on public.sale_items for insert
with check (public.is_pharmacy_member(pharmacy_id));

create policy "sale_items_update_owner_manager"
on public.sale_items for update
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']))
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']));

create policy "sale_items_delete_owner"
on public.sale_items for delete
using (public.has_pharmacy_role(pharmacy_id, array['owner']));

-- payments
create policy "payments_select_member"
on public.payments for select
using (public.is_pharmacy_member(pharmacy_id));

create policy "payments_insert_member"
on public.payments for insert
with check (public.is_pharmacy_member(pharmacy_id));

create policy "payments_update_owner_manager"
on public.payments for update
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']))
with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']));

create policy "payments_delete_owner"
on public.payments for delete
using (public.has_pharmacy_role(pharmacy_id, array['owner']));

-- stock_movements
create policy "stock_movements_select_member"
on public.stock_movements for select
using (public.is_pharmacy_member(pharmacy_id));

create policy "stock_movements_insert_member"
on public.stock_movements for insert
with check (public.is_pharmacy_member(pharmacy_id));

create policy "stock_movements_update_owner"
on public.stock_movements for update
using (public.has_pharmacy_role(pharmacy_id, array['owner']))
with check (public.has_pharmacy_role(pharmacy_id, array['owner']));

create policy "stock_movements_delete_owner"
on public.stock_movements for delete
using (public.has_pharmacy_role(pharmacy_id, array['owner']));

-- audit_logs
create policy "audit_logs_select_owner_manager"
on public.audit_logs for select
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']));

create policy "audit_logs_insert_member"
on public.audit_logs for insert
with check (public.is_pharmacy_member(pharmacy_id));

-- subscriptions: readable by owner/manager, writable only by service role
create policy "subscriptions_select_owner_manager"
on public.subscriptions for select
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']));

create policy "subscription_payments_select_owner_manager"
on public.subscription_payments for select
using (public.has_pharmacy_role(pharmacy_id, array['owner', 'manager']));
