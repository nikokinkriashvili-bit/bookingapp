-- Run manually in the Supabase SQL Editor, after 001–005.
--
-- Inventory module (BRD §6 / §17), designed for the full two-tier model:
-- any business (importer like carbros.pro, or a detailing shop) has its own
-- suppliers and products. suppliers.linked_business_id marks a supplier that
-- is itself on the platform (the §6.6 supply-chain loop): purchase orders
-- addressed to them become their inbound order queue, so purchase_orders RLS
-- grants read/update to the supplier business too.

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  country text,
  currency text not null default 'EUR',
  lead_time_days int not null default 30,
  moq int,
  payment_terms text,
  linked_business_id uuid references businesses(id) on delete set null,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sku text not null,
  name text not null,
  category text,
  supplier_id uuid references suppliers(id) on delete set null,
  stock_qty numeric(12,2) not null default 0,
  -- Manual until enough platform sales history exists to compute it (BRD §6.2
  -- says velocity comes from invoice history; that data accrues later).
  sales_per_week numeric(10,2) not null default 0,
  lead_time_days_override int,
  safety_stock numeric(10,2) not null default 0,
  purchase_price numeric(12,2), -- in the supplier's currency
  duty_rate_pct numeric(5,2) not null default 0, -- per product category / HS code
  list_price_gel numeric(12,2),
  b2b_price_gel numeric(12,2),
  -- Landed cost of the most recent received shipment (slice 3 writes this).
  last_landed_cost_gel numeric(12,2),
  created_at timestamptz not null default now(),
  unique (business_id, sku)
);

create type po_status as enum ('draft', 'sent', 'received', 'cancelled');

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  status po_status not null default 'draft',
  currency text not null default 'EUR',
  -- Landed-cost inputs (slice 3). Exchange rate entered manually for now;
  -- TODO(BRD §6.4): auto-fetch from the NBG API at order date (integration).
  exchange_rate numeric(12,6),
  freight_cost_gel numeric(12,2),
  local_logistics_gel numeric(12,2),
  expected_delivery date,
  notes text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  received_at timestamptz
);

create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  qty numeric(12,2) not null,
  unit_price numeric(12,2), -- in the PO currency
  landed_cost_gel numeric(12,2) -- computed and frozen on receipt (slice 3)
);

alter table suppliers enable row level security;
alter table products enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;

create policy "Owners manage suppliers for their business" on suppliers for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

create policy "Owners manage products for their business" on products for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

-- Buyer owns the PO; a platform-linked supplier business can also see and
-- update POs addressed to it (their inbound order queue, BRD §17.6).
create policy "Buyers manage their purchase orders" on purchase_orders for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

create policy "Linked suppliers read incoming purchase orders" on purchase_orders for select
  using (supplier_id in (
    select s.id from suppliers s
    where s.linked_business_id in (select id from businesses where owner_id = auth.uid())
  ));

create policy "Linked suppliers update incoming purchase orders" on purchase_orders for update
  using (supplier_id in (
    select s.id from suppliers s
    where s.linked_business_id in (select id from businesses where owner_id = auth.uid())
  ));

create policy "PO items follow their purchase order" on purchase_order_items for all
  using (purchase_order_id in (
    select id from purchase_orders
    where business_id in (select id from businesses where owner_id = auth.uid())
  ))
  with check (purchase_order_id in (
    select id from purchase_orders
    where business_id in (select id from businesses where owner_id = auth.uid())
  ));

create policy "Linked suppliers read incoming PO items" on purchase_order_items for select
  using (purchase_order_id in (
    select po.id from purchase_orders po
    join suppliers s on s.id = po.supplier_id
    where s.linked_business_id in (select id from businesses where owner_id = auth.uid())
  ));
