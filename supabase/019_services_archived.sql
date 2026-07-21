-- Run manually in the Supabase SQL Editor, after 018.
--
-- Services soft-delete (roadmap 4.9, closes audit finding D3). Hard-deleting
-- a service that past jobs reference (jobs.service_ids is a plain uuid[],
-- no FK) meant old bookings silently lost their service name. An `archived`
-- flag lets the owner retire a service from new bookings while every past
-- job that used it keeps resolving its name.

alter table services add column archived boolean not null default false;

insert into schema_migrations (version) values ('019') on conflict do nothing;
