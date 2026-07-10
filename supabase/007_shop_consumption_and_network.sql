-- Run manually in the Supabase SQL Editor, after 006.
--
-- Slice d of the stock module (BRD §6.6 / BK-08):
-- 1. job_products — products consumed per job (shop tier). Stock adjusts at
--    logging time, not on job completion, so flipping a job's status back and
--    forth can never double-count stock.
-- 2. business_directory — minimal cross-tenant directory (id, name, type) so
--    a shop can link its supplier record to a real platform business
--    (carbros.pro). Intentionally owner-rights view: it bypasses businesses
--    RLS to expose exactly these three columns, nothing else.
-- 3. Replaces 006's linked-supplier policies: policy subqueries run under the
--    caller's own RLS, so the supplier business could never see the shop's
--    suppliers row and the policies never matched. A security-definer
--    function performs that check instead.
-- 4. Snapshots product name/SKU onto PO items, so the receiving business can
--    render incoming order lines without needing read access to the buyer's
--    products table.

create table job_products (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  qty numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (job_id, product_id)
);

alter table job_products enable row level security;

create policy "Owners manage job products via their jobs" on job_products for all
  using (job_id in (
    select id from jobs
    where business_id in (select id from businesses where owner_id = auth.uid())
  ))
  with check (job_id in (
    select id from jobs
    where business_id in (select id from businesses where owner_id = auth.uid())
  ));

create view business_directory as
  select id, name, business_type from businesses;
grant select on business_directory to authenticated;

alter table purchase_order_items
  add column product_name text,
  add column product_sku text;

update purchase_order_items poi
set product_name = p.name, product_sku = p.sku
from products p
where p.id = poi.product_id;

create or replace function is_linked_supplier(check_supplier_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from suppliers s
    where s.id = check_supplier_id
      and s.linked_business_id in (
        select id from businesses where owner_id = auth.uid()
      )
  );
$$;

drop policy if exists "Linked suppliers read incoming purchase orders" on purchase_orders;
drop policy if exists "Linked suppliers update incoming purchase orders" on purchase_orders;
drop policy if exists "Linked suppliers read incoming PO items" on purchase_order_items;

create policy "Linked suppliers read incoming purchase orders" on purchase_orders for select
  using (is_linked_supplier(supplier_id));

create policy "Linked suppliers update incoming purchase orders" on purchase_orders for update
  using (is_linked_supplier(supplier_id));

create policy "Linked suppliers read incoming PO items" on purchase_order_items for select
  using (purchase_order_id in (
    select id from purchase_orders where is_linked_supplier(supplier_id)
  ));
