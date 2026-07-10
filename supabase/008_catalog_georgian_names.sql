-- Run manually in the Supabase SQL Editor, after 007.
--
-- Georgian names for the centrally-maintained catalog (BRD §13.2 templates).
-- Georgian is the app's primary language; English stays as the fallback in
-- the existing label/name columns.

alter table business_type_catalog add column label_ka text;
alter table default_service_templates add column name_ka text;

update business_type_catalog set label_ka = v.label_ka
from (values
  ('auto_detailing', 'ავტო დეტეილინგი'),
  ('barbershop_salon', 'საპარიკმახერო / სალონი'),
  ('clinic_dentist', 'კლინიკა / სტომატოლოგი'),
  ('personal_trainer', 'პერსონალური მწვრთნელი'),
  ('photographer', 'ფოტოგრაფი'),
  ('lawyer_consultant', 'იურისტი / კონსულტანტი'),
  ('importer_wholesaler', 'იმპორტიორი / დისტრიბუტორი'),
  ('personal_use', 'პირადი გამოყენება')
) as v(value, label_ka)
where business_type_catalog.value = v.value::business_type;

update default_service_templates set name_ka = v.name_ka
from (values
  ('auto_detailing', 'Full detail', 'სრული დეტეილინგი'),
  ('auto_detailing', 'Ceramic coat', 'კერამიკული საფარი'),
  ('auto_detailing', 'Engine clean', 'ძრავის წმენდა'),
  ('barbershop_salon', 'Haircut', 'თმის შეჭრა'),
  ('barbershop_salon', 'Colour', 'შეღებვა'),
  ('barbershop_salon', 'Beard trim', 'წვერის კორექცია'),
  ('clinic_dentist', 'Checkup', 'შემოწმება'),
  ('clinic_dentist', 'Cleaning', 'პროფესიული წმენდა'),
  ('clinic_dentist', 'Consultation', 'კონსულტაცია'),
  ('personal_trainer', 'PT session', 'პერსონალური ვარჯიში'),
  ('personal_trainer', 'Group class', 'ჯგუფური ვარჯიში'),
  ('personal_trainer', 'Assessment', 'შეფასება'),
  ('photographer', 'Portrait', 'პორტრეტი'),
  ('photographer', 'Event (full day)', 'ღონისძიება (სრული დღე)'),
  ('photographer', 'Editing session', 'ფოტოების დამუშავება'),
  ('lawyer_consultant', 'Initial consult', 'პირველადი კონსულტაცია'),
  ('lawyer_consultant', 'Full session', 'სრული სესია'),
  ('lawyer_consultant', 'Document review', 'დოკუმენტების განხილვა'),
  ('importer_wholesaler', 'Warehouse visit', 'საწყობის ვიზიტი')
) as v(business_type, name, name_ka)
where default_service_templates.business_type = v.business_type::business_type
  and default_service_templates.name = v.name;
