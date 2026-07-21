-- Run manually in the Supabase SQL Editor, after 015.
--
-- Manual payment recording (roadmap 4.3b / feature-gap-analysis.md F5). Until
-- now "paid" was a bare status flip with no record of how much or by what
-- method. Most pilot payments are cash. A job can have several payments
-- (partial/deposit + balance); the job is settled once the sum reaches
-- price_total. BOG (Stage 6.3) later becomes just one more writer to this
-- same table with method='bog_link'.

create table payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('cash', 'transfer', 'bog_link')),
  created_at timestamptz not null default now()
);

alter table payments enable row level security;

create policy "Members manage payments for their business" on payments for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

create index if not exists idx_payments_job on payments (job_id);
create index if not exists idx_payments_business on payments (business_id);

insert into schema_migrations (version) values ('016') on conflict do nothing;
