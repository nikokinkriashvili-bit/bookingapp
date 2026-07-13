-- Run manually in the Supabase SQL Editor, after 013.
--
-- Rebooking / maintenance reminders (roadmap 4.2, BRD §5.1): a generic
-- "this vehicle is due for its next service" nudge, computed from a
-- per-service recommended interval and surfaced to the owner when a job
-- completes. Coating-warranty variant (F3) was rejected by Niko -- this is
-- the only rebooking mechanism. WhatsApp send stays a seam (src/lib/integrations.ts);
-- there is no cron/Edge Function yet, so the owner triggers the send manually
-- from the reminders screen.

alter table services add column reminder_interval_days int;

create table rebooking_reminders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  job_id uuid not null unique references jobs(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'dismissed', 'booked')),
  created_at timestamptz not null default now()
);

alter table rebooking_reminders enable row level security;

create policy "Members manage rebooking reminders for their business" on rebooking_reminders for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

create index if not exists idx_rebooking_reminders_business_due
  on rebooking_reminders (business_id, due_date) where status = 'pending';
create index if not exists idx_rebooking_reminders_vehicle on rebooking_reminders (vehicle_id);

insert into schema_migrations (version) values ('014') on conflict do nothing;
