-- Run manually in the Supabase SQL Editor, after 001_businesses_and_services.sql.
--
-- Business types + their default services/hours as centrally-maintained
-- reference data (read-only to clients), instead of hardcoded in the app.
-- Editing a row here (e.g. adjusting a default service) benefits every new
-- sign-up without an app redeploy, matching how the source BRD (section
-- 13.2) describes these as centrally-maintained templates.

create table business_type_catalog (
  value business_type primary key,
  label text not null,
  default_working_hours jsonb not null,
  sort_order int not null
);

create table default_service_templates (
  id uuid primary key default gen_random_uuid(),
  business_type business_type not null references business_type_catalog(value) on delete cascade,
  name text not null,
  duration_minutes int not null,
  sort_order int not null default 0
);

alter table business_type_catalog enable row level security;
alter table default_service_templates enable row level security;

-- Reference data: any authenticated client can read, nobody can write via
-- the client (edits go through the SQL editor / a future admin tool).
create policy "Anyone can read the business type catalog"
  on business_type_catalog for select
  using (true);

create policy "Anyone can read default service templates"
  on default_service_templates for select
  using (true);

insert into business_type_catalog (value, label, default_working_hours, sort_order) values
  ('auto_detailing', 'Auto Detailing',
    '{"mon":{"open":"09:00","close":"19:00"},"tue":{"open":"09:00","close":"19:00"},"wed":{"open":"09:00","close":"19:00"},"thu":{"open":"09:00","close":"19:00"},"fri":{"open":"09:00","close":"19:00"},"sat":{"open":"09:00","close":"19:00"},"sun":{"open":"09:00","close":"19:00"}}'::jsonb,
    1),
  ('barbershop_salon', 'Barbershop / Salon',
    '{"mon":{"open":"10:00","close":"20:00"},"tue":{"open":"10:00","close":"20:00"},"wed":{"open":"10:00","close":"20:00"},"thu":{"open":"10:00","close":"20:00"},"fri":{"open":"10:00","close":"20:00"},"sat":{"open":"10:00","close":"20:00"},"sun":null}'::jsonb,
    2),
  ('clinic_dentist', 'Clinic / Dentist',
    '{"mon":{"open":"09:00","close":"18:00"},"tue":{"open":"09:00","close":"18:00"},"wed":{"open":"09:00","close":"18:00"},"thu":{"open":"09:00","close":"18:00"},"fri":{"open":"09:00","close":"18:00"},"sat":null,"sun":null}'::jsonb,
    3),
  ('personal_trainer', 'Personal Trainer',
    '{"mon":{"open":"07:00","close":"21:00"},"tue":{"open":"07:00","close":"21:00"},"wed":{"open":"07:00","close":"21:00"},"thu":{"open":"07:00","close":"21:00"},"fri":{"open":"07:00","close":"21:00"},"sat":null,"sun":null}'::jsonb,
    4),
  ('photographer', 'Photographer',
    '{"mon":null,"tue":null,"wed":null,"thu":null,"fri":null,"sat":null,"sun":null}'::jsonb,
    5),
  ('lawyer_consultant', 'Lawyer / Consultant',
    '{"mon":{"open":"10:00","close":"19:00"},"tue":{"open":"10:00","close":"19:00"},"wed":{"open":"10:00","close":"19:00"},"thu":{"open":"10:00","close":"19:00"},"fri":{"open":"10:00","close":"19:00"},"sat":null,"sun":null}'::jsonb,
    6),
  ('importer_wholesaler', 'Importer / Wholesaler',
    '{"mon":{"open":"09:00","close":"18:00"},"tue":{"open":"09:00","close":"18:00"},"wed":{"open":"09:00","close":"18:00"},"thu":{"open":"09:00","close":"18:00"},"fri":{"open":"09:00","close":"18:00"},"sat":null,"sun":null}'::jsonb,
    7),
  ('personal_use', 'Personal Use',
    '{"mon":null,"tue":null,"wed":null,"thu":null,"fri":null,"sat":null,"sun":null}'::jsonb,
    8);

insert into default_service_templates (business_type, name, duration_minutes, sort_order) values
  ('auto_detailing', 'Full detail', 180, 1),
  ('auto_detailing', 'Ceramic coat', 360, 2),
  ('auto_detailing', 'Engine clean', 60, 3),
  ('barbershop_salon', 'Haircut', 30, 1),
  ('barbershop_salon', 'Colour', 90, 2),
  ('barbershop_salon', 'Beard trim', 20, 3),
  ('clinic_dentist', 'Checkup', 30, 1),
  ('clinic_dentist', 'Cleaning', 45, 2),
  ('clinic_dentist', 'Consultation', 20, 3),
  ('personal_trainer', 'PT session', 60, 1),
  ('personal_trainer', 'Group class', 45, 2),
  ('personal_trainer', 'Assessment', 30, 3),
  ('photographer', 'Portrait', 90, 1),
  ('photographer', 'Event (full day)', 480, 2),
  ('photographer', 'Editing session', 120, 3),
  ('lawyer_consultant', 'Initial consult', 30, 1),
  ('lawyer_consultant', 'Full session', 60, 2),
  ('lawyer_consultant', 'Document review', 45, 3),
  ('importer_wholesaler', 'Warehouse visit', 60, 1);
  -- personal_use has no default services
