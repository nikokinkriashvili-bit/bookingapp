-- Run manually in the Supabase SQL Editor, after 019.
--
-- Push notification seam (roadmap 4.6). Registers each signed-in device's
-- Expo push token so a future Edge Function (Stage 6, same pattern as
-- WhatsApp/BOG) can send owner alerts (low stock, overdue, no-show) without
-- the app needing to be open. Until that Edge Function + a scheduling cron
-- exist, alerts are computed and shown in-app (src/lib/alerts.ts) -- this
-- table is the registration half, ready for when sending goes live.

create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  token text not null unique,
  platform text,
  created_at timestamptz not null default now()
);

alter table push_tokens enable row level security;

create policy "Members manage push tokens for their business" on push_tokens for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

create index if not exists idx_push_tokens_business on push_tokens (business_id);

insert into schema_migrations (version) values ('020') on conflict do nothing;
