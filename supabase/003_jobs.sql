-- Run manually in the Supabase SQL Editor, after 001 and 002.
--
-- plate_number is unique per business, not globally — see the plan doc for
-- why (multi-tenant RLS; a global key would let businesses collide/leak
-- on the same real-world plate).

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  plate_number text not null,
  make text,
  model text,
  year int,
  colour text,
  fuel_type text,
  created_at timestamptz not null default now(),
  unique (business_id, plate_number)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  created_at timestamptz not null default now()
);

create table customer_vehicles (
  customer_id uuid not null references customers(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  primary key (customer_id, vehicle_id)
);

create type job_status as enum (
  'booked', 'in_progress', 'awaiting_collection', 'complete', 'paid', 'cancelled'
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  service_ids uuid[] not null default '{}',
  status job_status not null default 'booked',
  scheduled_slot timestamptz not null,
  price_total numeric(10,2),
  created_at timestamptz not null default now()
);

alter table vehicles enable row level security;
alter table customers enable row level security;
alter table customer_vehicles enable row level security;
alter table jobs enable row level security;

create policy "Owners manage vehicles for their business" on vehicles for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

create policy "Owners manage customers for their business" on customers for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));

create policy "Owners manage customer_vehicles for their business" on customer_vehicles for all
  using (vehicle_id in (select id from vehicles where business_id in (select id from businesses where owner_id = auth.uid())))
  with check (vehicle_id in (select id from vehicles where business_id in (select id from businesses where owner_id = auth.uid())));

create policy "Owners manage jobs for their business" on jobs for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));
