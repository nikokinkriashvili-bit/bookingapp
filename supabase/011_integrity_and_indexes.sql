-- Run manually in the Supabase SQL Editor, after 010.
--
-- Closes findings from the July 2026 security & data-integrity audit
-- (audits/security-data-integrity.md): missing CHECK constraints, a
-- cross-tenant RLS gap on customer_vehicles (S2), an overly-broad
-- supplier-side PO update policy (S1), and the fact that Postgres does
-- not auto-index foreign-key columns -- every one of these tables has
-- been running full scans on its hottest queries since day one.
--
-- IMPORTANT: run the pre-flight cleanup queries below FIRST and review
-- what they return before running the constraints. If any of them return
-- rows, the corresponding constraint will fail to apply -- fix the data
-- first (these should all be empty after the July 2026 bug-audit fixes,
-- but confirm rather than assume against production data).

-- ── Pre-flight cleanup (run first, review results) ──
-- Jobs with end <= start (should be none after the audit fixes):
--   select id from jobs where scheduled_end <= scheduled_slot;
-- Negative stock:
--   select id, sku, stock_qty from products where stock_qty < 0;
-- Cross-tenant customer_vehicle links:
--   select cv.* from customer_vehicles cv
--   join customers c on c.id = cv.customer_id
--   join vehicles v on v.id = cv.vehicle_id
--   where c.business_id <> v.business_id;

-- ── Constraints ──
alter table jobs add constraint jobs_end_after_start
  check (scheduled_end > scheduled_slot);
alter table products add constraint products_stock_nonnegative
  check (stock_qty >= 0);
alter table purchase_order_items add constraint poi_qty_positive
  check (qty > 0);
alter table job_products add constraint jp_qty_positive
  check (qty > 0);

-- ── S2 fix: both sides of a customer↔vehicle link must be in-tenant.
-- Previously only the vehicle side was checked; a member of business A
-- who learned a business-B customer UUID could link that customer to A's
-- vehicle. Unguessable UUIDs made exploitation unlikely, but the
-- asymmetry was still wrong.
drop policy "Members manage customer_vehicles for their business" on customer_vehicles;
create policy "Members manage customer_vehicles for their business" on customer_vehicles for all
  using (
    vehicle_id in (select id from vehicles where business_id in (select member_business_ids()))
    and customer_id in (select id from customers where business_id in (select member_business_ids()))
  )
  with check (
    vehicle_id in (select id from vehicles where business_id in (select member_business_ids()))
    and customer_id in (select id from customers where business_id in (select member_business_ids()))
  );

-- ── S1 fix: a linked supplier could update ANY column of a buyer's
-- incoming PO (status, prices, notes -- even business_id), because the
-- 007/009 update policy had no column restriction. No UI uses this today.
-- Drop it until the importer fulfilment pipeline (Stage 8) replaces it
-- with a status-transition RPC that validates allowed transitions.
drop policy "Linked suppliers update incoming purchase orders" on purchase_orders;

-- ── Indexes (foreign keys + the hottest query paths) ──
create index if not exists idx_jobs_business_slot on jobs (business_id, scheduled_slot);
create index if not exists idx_jobs_business_end  on jobs (business_id, scheduled_end);
create index if not exists idx_jobs_vehicle       on jobs (vehicle_id);
create index if not exists idx_jobs_customer      on jobs (customer_id);
create index if not exists idx_jobs_staff         on jobs (assigned_staff_id);
create index if not exists idx_vehicles_business  on vehicles (business_id);
create index if not exists idx_customers_business on customers (business_id);
create index if not exists idx_services_business  on services (business_id);
create index if not exists idx_products_business  on products (business_id);
create index if not exists idx_suppliers_business on suppliers (business_id);
create index if not exists idx_po_business        on purchase_orders (business_id);
create index if not exists idx_po_supplier        on purchase_orders (supplier_id);
create index if not exists idx_poi_po             on purchase_order_items (purchase_order_id);
create index if not exists idx_jp_job             on job_products (job_id);
create index if not exists idx_staff_business     on staff (business_id);
create index if not exists idx_staff_user         on staff (user_id);
create index if not exists idx_cv_vehicle         on customer_vehicles (vehicle_id);
create index if not exists idx_cv_customer        on customer_vehicles (customer_id);

-- ── Migration bookkeeping -- a running record of what's actually been
-- applied, since these migrations are hand-run and there was previously
-- no record anywhere but this directory listing.
create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
insert into schema_migrations (version) values
  ('001'),('002'),('003'),('004'),('005'),('006'),('007'),('008'),('009'),('010'),('011')
on conflict do nothing;
