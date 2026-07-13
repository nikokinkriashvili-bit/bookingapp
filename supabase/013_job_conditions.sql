-- Run manually in the Supabase SQL Editor, after 012.
--
-- Vehicle condition check-in (roadmap 4.1b / feature-gap-analysis.md F2):
-- a per-job damage record captured before work starts -- dispute
-- protection ("you scratched my bumper" has no answer without one).
-- Checklist + note are collected at intake; condition photos are tagged
-- vehicle_photos rows (kind='condition') added on the edit screen, since
-- photo upload needs a job_id that doesn't exist until intake finishes.

create table job_conditions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  job_id uuid not null unique references jobs(id) on delete cascade,
  body_damage boolean not null default false,
  glass_damage boolean not null default false,
  wheels_damage boolean not null default false,
  interior_damage boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table job_conditions enable row level security;

create policy "Members manage job conditions for their business" on job_conditions for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

create index if not exists idx_job_conditions_job on job_conditions (job_id);
create index if not exists idx_job_conditions_business on job_conditions (business_id);

-- Condition photos are just vehicle_photos rows with a new kind. The check
-- constraint from 012 was unnamed, so Postgres auto-named it using its
-- standard <table>_<column>_check convention -- if this drop fails because
-- the name differs on your instance, run
--   select conname from pg_constraint where conrelid = 'vehicle_photos'::regclass;
-- to find the actual name and substitute it below.
alter table vehicle_photos drop constraint vehicle_photos_kind_check;
alter table vehicle_photos add constraint vehicle_photos_kind_check
  check (kind in ('before', 'after', 'other', 'condition'));

insert into schema_migrations (version) values ('013') on conflict do nothing;
