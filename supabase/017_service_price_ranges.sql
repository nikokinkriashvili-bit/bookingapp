-- Run manually in the Supabase SQL Editor, after 016.
--
-- Price ranges on services (product pivot, July 2026). Detailers don't quote
-- a fixed price up front -- they inspect the car, then quote. So a service
-- carries an optional guide range (price_min..price_max) shown to the
-- customer; the exact price is set per job after inspection (jobs.price_total,
-- and later the per-job quote). The old fixed price_gel column stays for
-- backward-compatibility and is backfilled into both ends of the range so
-- existing services keep a sensible value.

alter table services add column price_min numeric(10,2);
alter table services add column price_max numeric(10,2);

update services set price_min = price_gel, price_max = price_gel where price_gel is not null;

insert into schema_migrations (version) values ('017') on conflict do nothing;
