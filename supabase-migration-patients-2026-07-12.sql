-- ══════════════════════════════════════════════════════════════════════
-- Migration 2026-07-12: extend `patients` for the full edit workflow.
--   Safe to re-run — every statement is idempotent.
--
-- Adds the demographic/medical fields required by the Patient edit PRD
-- and unique indexes on national_id + medical_file_no so duplicates are
-- caught at the DB layer (not just client validation).
-- ══════════════════════════════════════════════════════════════════════

alter table patients add column if not exists medical_file_no  text;
alter table patients add column if not exists national_id      text;
alter table patients add column if not exists whatsapp         text;
alter table patients add column if not exists email            text;
alter table patients add column if not exists date_of_birth    date;
alter table patients add column if not exists address          text;
alter table patients add column if not exists occupation       text;
alter table patients add column if not exists emergency_name   text;
alter table patients add column if not exists emergency_phone  text;
alter table patients add column if not exists doctor_id        text;
alter table patients add column if not exists medical_history  text;
alter table patients add column if not exists allergies        text;
alter table patients add column if not exists medications      text;
alter table patients add column if not exists insurance_info   text;
alter table patients add column if not exists status           text default 'نشط';
alter table patients add column if not exists updated_at       timestamptz default now();

-- Uniqueness: national ID and medical file number must not collide across
-- patients, but empty strings are allowed since the fields are optional.
create unique index if not exists patients_national_id_uniq
  on patients(national_id)
  where national_id is not null and national_id <> '';

create unique index if not exists patients_medical_file_uniq
  on patients(medical_file_no)
  where medical_file_no is not null and medical_file_no <> '';

-- Bump updated_at on every UPDATE so the client can detect staleness
-- if it wants to; harmless if the trigger already exists from an earlier
-- migration under a different name.
create or replace function patients_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists patients_updated_at on patients;
create trigger patients_updated_at before update on patients
  for each row execute function patients_touch_updated_at();
