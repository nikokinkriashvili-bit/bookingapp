-- Run manually in the Supabase SQL Editor, after 001-004.
--
-- Jobs need an explicit end, not just a start: detailing jobs run from a
-- few hours to a few days, which the old fixed-slot day view couldn't
-- represent. Backfill only exists to satisfy NOT NULL on our own test
-- rows from earlier sessions -- not real booking data.

alter table jobs add column scheduled_end timestamptz;
update jobs set scheduled_end = scheduled_slot + interval '1 hour' where scheduled_end is null;
alter table jobs alter column scheduled_end set not null;
