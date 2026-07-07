-- Run manually in the Supabase SQL Editor.
-- No migration tooling is set up yet; this file documents what's been applied.

create type business_type as enum (
  'auto_detailing',
  'barbershop_salon',
  'clinic_dentist',
  'personal_trainer',
  'photographer',
  'lawyer_consultant',
  'importer_wholesaler',
  'personal_use'
);

create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  business_type business_type not null,
  working_hours jsonb not null default '{}'::jsonb, -- per-weekday {open,close} or null if closed
  whatsapp_number text,
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  duration_minutes int not null,
  price_gel numeric(10,2),
  created_at timestamptz not null default now()
);

alter table businesses enable row level security;
alter table services enable row level security;

create policy "Owners manage their own business"
  on businesses for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners manage services for their business"
  on services for all
  using (business_id in (select id from businesses where owner_id = auth.uid()))
  with check (business_id in (select id from businesses where owner_id = auth.uid()));
