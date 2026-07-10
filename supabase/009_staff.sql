-- Run manually in the Supabase SQL Editor, after 008.
--
-- Staff accounts + job assignment (TRD v2 data model: `staff`, Team tier).
--
-- Access model:
--   owner — everything (business row, staff roster, plus all operational data)
--   staff — full operational access (jobs, vehicles, customers, services,
--           inventory, POs) but cannot edit the business itself or manage
--           the staff roster. The app additionally hides Settings for staff.
--
-- Linking model: the owner adds a staff member by email. When a user with
-- that email signs in, claim_staff_membership() attaches their auth user id
-- to the pending staff row, which makes member_business_ids() include the
-- business and RLS opens up. No separate invite flow needed for the pilot.

create table staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  role text not null default 'staff' check (role in ('staff')),
  created_at timestamptz not null default now(),
  unique (business_id, email)
);

alter table jobs add column assigned_staff_id uuid references staff(id) on delete set null;

-- Security definer: policies on other tables call this, and it must see the
-- staff table regardless of the caller's own RLS rights (same reasoning as
-- is_linked_supplier in 007).
create or replace function member_business_ids()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select id from businesses where owner_id = auth.uid()
  union
  select business_id from staff where user_id = auth.uid();
$$;

-- Called by the app on login: claims any pending staff rows matching the
-- signed-in user's email.
create or replace function claim_staff_membership()
returns void
language sql
security definer
set search_path = public
as $$
  update staff
  set user_id = auth.uid()
  where user_id is null
    and lower(email) = lower(coalesce(auth.email(), ''));
$$;

alter table staff enable row level security;

create policy "Owners manage staff" on staff for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

create policy "Members read staff roster" on staff for select
  using (business_id in (select member_business_ids()));

-- Staff can read the business they belong to (owner keeps the FOR ALL policy
-- from 001, so update/delete stay owner-only).
create policy "Members read their business" on businesses for select
  using (id in (select member_business_ids()));

-- Rewrite operational-data policies from owner-only to member-based.

drop policy "Owners manage services for their business" on services;
create policy "Members manage services for their business" on services for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

drop policy "Owners manage vehicles for their business" on vehicles;
create policy "Members manage vehicles for their business" on vehicles for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

drop policy "Owners manage customers for their business" on customers;
create policy "Members manage customers for their business" on customers for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

drop policy "Owners manage customer_vehicles for their business" on customer_vehicles;
create policy "Members manage customer_vehicles for their business" on customer_vehicles for all
  using (vehicle_id in (select id from vehicles where business_id in (select member_business_ids())))
  with check (vehicle_id in (select id from vehicles where business_id in (select member_business_ids())));

drop policy "Owners manage jobs for their business" on jobs;
create policy "Members manage jobs for their business" on jobs for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

drop policy "Owners manage job products via their jobs" on job_products;
create policy "Members manage job products via their jobs" on job_products for all
  using (job_id in (
    select id from jobs where business_id in (select member_business_ids())
  ))
  with check (job_id in (
    select id from jobs where business_id in (select member_business_ids())
  ));

drop policy "Owners manage suppliers for their business" on suppliers;
create policy "Members manage suppliers for their business" on suppliers for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

drop policy "Owners manage products for their business" on products;
create policy "Members manage products for their business" on products for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

drop policy "Buyers manage their purchase orders" on purchase_orders;
create policy "Member buyers manage their purchase orders" on purchase_orders for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

drop policy "PO items follow their purchase order" on purchase_order_items;
create policy "Member PO items follow their purchase order" on purchase_order_items for all
  using (purchase_order_id in (
    select id from purchase_orders where business_id in (select member_business_ids())
  ))
  with check (purchase_order_id in (
    select id from purchase_orders where business_id in (select member_business_ids())
  ));

-- is_linked_supplier (007) also becomes member-based so a linked supplier's
-- staff can see the incoming orders queue.
create or replace function is_linked_supplier(check_supplier_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from suppliers s
    where s.id = check_supplier_id
      and s.linked_business_id in (select member_business_ids())
  );
$$;
