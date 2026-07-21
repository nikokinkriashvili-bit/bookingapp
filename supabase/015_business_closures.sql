-- Run manually in the Supabase SQL Editor, after 014.
--
-- Working-hours exceptions (roadmap 4.3 prerequisite / feature-gap-analysis.md
-- F4): working_hours is a weekly pattern only, so it can't express holidays
-- or vacations. A closure is an inclusive date range the business is shut --
-- respected by the calendar now, and (when it ships) by the public booking
-- slot picker so a customer can't book on Orthodox Christmas.

create table business_closures (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table business_closures enable row level security;

create policy "Members manage closures for their business" on business_closures for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

create index if not exists idx_business_closures_business_range
  on business_closures (business_id, start_date, end_date);

insert into schema_migrations (version) values ('015') on conflict do nothing;
