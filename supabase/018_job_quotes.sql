-- Run manually in the Supabase SQL Editor, after 017.
--
-- Per-job quote flow (booking-model pivot, Slice 2). Detailers inspect the
-- car, then send a quote: a price + a short description of the work, valid for
-- a few days, that the customer accepts or declines. This migration adds the
-- quote to the job itself (one quote per job). For now the detailer flips
-- accepted/declined by hand on the edit screen; at Stage 6 the customer drives
-- it via a public link (quote_token) delivered over WhatsApp.
--
-- 'expired' is NOT a stored status -- it's derived from quote_status='sent'
-- plus quote_expires_at being in the past, so no cron is needed to age quotes.

alter table jobs add column quote_price numeric(10,2);
alter table jobs add column quote_description text;
alter table jobs add column quote_status text
  check (quote_status in ('draft', 'sent', 'accepted', 'declined'));
alter table jobs add column quote_sent_at timestamptz;
alter table jobs add column quote_expires_at timestamptz;
-- Stable per-job token for the future public quote link (Stage 6). A volatile
-- default backfills a distinct value into every existing row at add time.
alter table jobs add column quote_token uuid not null default gen_random_uuid();

create unique index if not exists idx_jobs_quote_token on jobs (quote_token);

insert into schema_migrations (version) values ('018') on conflict do nothing;
