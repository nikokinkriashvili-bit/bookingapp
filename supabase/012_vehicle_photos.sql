-- Run manually in the Supabase SQL Editor, after 011.
--
-- Photo capture + before/after gallery on vehicle profiles (roadmap 4.1).
-- Files live in a private Storage bucket, one row per photo in
-- vehicle_photos records where it lives and what it's for. Upload path
-- convention: `<business_id>/<vehicle_id>/<uuid>.jpg` -- the RLS policy on
-- storage.objects checks the first path segment against member_business_ids(),
-- so the path IS the tenant boundary; the client must always upload to a path
-- starting with its own business_id.
--
-- R2 migration seam: all storage access is isolated in src/lib/vehiclePhotos.ts
-- (upload/delete/signed-URL functions) -- swapping the backend later means
-- changing that one file, not every screen that shows a photo.

create table vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  storage_path text not null,
  kind text not null default 'other' check (kind in ('before', 'after', 'other')),
  created_at timestamptz not null default now()
);

alter table vehicle_photos enable row level security;

create policy "Members manage vehicle photos for their business" on vehicle_photos for all
  using (business_id in (select member_business_ids()))
  with check (business_id in (select member_business_ids()));

create index if not exists idx_vehicle_photos_vehicle on vehicle_photos (vehicle_id);
create index if not exists idx_vehicle_photos_business on vehicle_photos (business_id);
create index if not exists idx_vehicle_photos_job on vehicle_photos (job_id);

-- Private bucket -- photos are never served from a public URL; the client
-- reads them via short-lived signed URLs only.
insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', false)
on conflict (id) do nothing;

create policy "Members manage their business's vehicle photo files"
on storage.objects for all
using (
  bucket_id = 'vehicle-photos'
  and (storage.foldername(name))[1]::uuid in (select member_business_ids())
)
with check (
  bucket_id = 'vehicle-photos'
  and (storage.foldername(name))[1]::uuid in (select member_business_ids())
);

insert into schema_migrations (version) values ('012') on conflict do nothing;
