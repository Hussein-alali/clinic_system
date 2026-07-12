-- ============================================================
-- Clinksys — patient_files hardening + FKs + indexes
-- Idempotent. Run in Supabase SQL editor.
-- Goals:
--   • Expand patient_files metadata (storage_path, original_name,
--     mime_type, file_size, uploaded_by, uploaded_by_name).
--   • Add FKs on bookings/patients/sessions therapist/doctor/department.
--   • Add missing indexes for patient_id lookups.
-- ============================================================

-- ── patient_files metadata expansion ────────────────────────
alter table patient_files add column if not exists storage_path      text;
alter table patient_files add column if not exists original_name     text;
alter table patient_files add column if not exists mime_type         text;
alter table patient_files add column if not exists file_size         bigint;
alter table patient_files add column if not exists uploaded_by       uuid;
alter table patient_files add column if not exists uploaded_by_name  text;

-- Backfill mime_type from legacy file_type column where empty.
update patient_files set mime_type = file_type where mime_type is null and file_type is not null;
-- Backfill original_name from file_name where empty.
update patient_files set original_name = file_name where original_name is null;

-- One storage object per file_id — cheap dup guard.
create unique index if not exists patient_files_storage_path_uniq
  on patient_files(storage_path) where storage_path is not null;

create index if not exists patient_files_uploaded_at_idx
  on patient_files(uploaded_at desc);

-- ── Referential integrity: bookings ─────────────────────────
-- Null out orphans so FK creation succeeds; production data should
-- already reference live rows, but this makes the migration re-runnable
-- against dirty environments.
update bookings b set therapist_id = null
  where therapist_id is not null
    and not exists (select 1 from therapists t where t.id = b.therapist_id);
update bookings b set doctor_id = null
  where doctor_id is not null
    and not exists (select 1 from doctors d where d.id = b.doctor_id);
update bookings b set department_id = null
  where department_id is not null
    and not exists (select 1 from departments d where d.id = b.department_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_therapist_id_fkey'
  ) then
    alter table bookings
      add constraint bookings_therapist_id_fkey
      foreign key (therapist_id) references therapists(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_doctor_id_fkey'
  ) then
    alter table bookings
      add constraint bookings_doctor_id_fkey
      foreign key (doctor_id) references doctors(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_department_id_fkey'
  ) then
    alter table bookings
      add constraint bookings_department_id_fkey
      foreign key (department_id) references departments(id) on delete set null;
  end if;
end $$;

-- ── Referential integrity: patients & sessions ──────────────
update patients p set therapist_id = null
  where therapist_id is not null
    and not exists (select 1 from therapists t where t.id = p.therapist_id);
update sessions s set therapist_id = null
  where therapist_id is not null
    and not exists (select 1 from therapists t where t.id = s.therapist_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'patients_therapist_id_fkey'
  ) then
    alter table patients
      add constraint patients_therapist_id_fkey
      foreign key (therapist_id) references therapists(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'sessions_therapist_id_fkey'
  ) then
    alter table sessions
      add constraint sessions_therapist_id_fkey
      foreign key (therapist_id) references therapists(id) on delete set null;
  end if;
end $$;

-- ── Hot-path indexes ────────────────────────────────────────
create index if not exists bookings_patient_id_idx   on bookings(patient_id);
create index if not exists bookings_date_idx         on bookings(date);
create index if not exists sessions_patient_id_idx   on sessions(patient_id);
create index if not exists invoices_patient_id_idx   on invoices(patient_id);
create index if not exists bookings_therapist_id_idx on bookings(therapist_id);
create index if not exists bookings_doctor_id_idx    on bookings(doctor_id);
