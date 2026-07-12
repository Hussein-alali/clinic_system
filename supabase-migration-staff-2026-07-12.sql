-- ══════════════════════════════════════════════════════════════════════
-- Migration 2026-07-12: staff management (Doctors, Specialists,
-- Receptionists) + clinic settings audit.
--
-- ROOT CAUSE FIXED HERE:
--   • Doctors/therapists tables lacked phone / email / license_number /
--     notes / updated_at → the Settings modal had no columns to write
--     those fields into, so the Save was either silently dropped by the
--     column whitelist or 400-ed by PostgREST.
--   • There was no receptionists roster table at all.
--   • There was no Specialists (أخصائي) roster with full contact +
--     department fields; the existing `therapists` table only carried
--     name / spec / load / max / color for the booking sidebar.
--   • RLS existed for doctors/therapists but not for receptionists, and
--     the app_role() helper needed to gate the new table too.
--
-- Design:
--   • `therapists` is the Specialists roster (extended in place — one
--     row, one specialist, one department).
--   • `receptionists` is a new roster (separate from `staff`, which is
--     the login-account table).
--   • All three rosters share the same Active / Inactive contract:
--       active boolean default true
--     Historical rows (bookings, sessions, patient assignments) reference
--     the roster by id — so deactivating a staff member does NOT break
--     history. The booking assignment dropdown filters `active = true`.
--
-- Safe to re-run — every statement is idempotent.
-- ══════════════════════════════════════════════════════════════════════

-- ── Doctors: contact + provenance ─────────────────────────────
alter table doctors add column if not exists phone           text;
alter table doctors add column if not exists email           text;
alter table doctors add column if not exists license_number  text;
alter table doctors add column if not exists notes           text;
alter table doctors add column if not exists updated_at      timestamptz default now();

create index if not exists doctors_active_idx on doctors(active);

-- ── Specialists (therapists) — extend the existing roster ─────
-- These are the أخصائي rows shown in the Specialists section of the
-- "Departments & Staff" settings tab. Bookings.therapist_id + patients
-- .therapist_id already reference this table by `id`, so no history is
-- disturbed.
alter table therapists add column if not exists department_id  text references departments(id) on delete set null;
alter table therapists add column if not exists phone          text;
alter table therapists add column if not exists email          text;
alter table therapists add column if not exists license_number text;
alter table therapists add column if not exists notes          text;
alter table therapists add column if not exists active         boolean default true;
alter table therapists add column if not exists updated_at     timestamptz default now();

create index if not exists therapists_active_idx        on therapists(active);
create index if not exists therapists_department_id_idx on therapists(department_id);

-- ── Receptionists: new roster ─────────────────────────────────
create table if not exists receptionists (
  id           text primary key,
  name         text not null,
  phone        text,
  email        text,
  notes        text,
  active       boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists receptionists_active_idx on receptionists(active);
-- Case-insensitive uniqueness on email so the same address can't sneak
-- in as "amir@x" and "Amir@x" (matches the staff table pattern).
create unique index if not exists receptionists_email_lower_uniq
  on receptionists (lower(email))
  where email is not null and email <> '';

alter table receptionists enable row level security;

-- Everyone with a valid session can read the roster (needed by the
-- booking / assignment UI). Only admins can write.
drop policy if exists "staff read receptionists" on receptionists;
create policy "staff read receptionists" on receptionists for select using (
  auth.role() = 'authenticated'
);

drop policy if exists "admin write receptionists" on receptionists;
create policy "admin write receptionists" on receptionists for all
  using      (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- ── clinic_settings: reinforce singleton + reload permission ──
-- These policies already exist in supabase-migration-settings-users but
-- we re-run defensively so this migration is self-contained.
insert into clinic_settings (id) values (1) on conflict do nothing;

drop policy if exists "public read clinic_settings" on clinic_settings;
create policy "public read clinic_settings"
  on clinic_settings for select using (true);

drop policy if exists "admin write clinic_settings" on clinic_settings;
create policy "admin write clinic_settings"
  on clinic_settings for all
  using      (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- ── Auto-touch updated_at on write for all three rosters ──────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists doctors_touch_updated_at on doctors;
create trigger doctors_touch_updated_at
  before update on doctors
  for each row execute function public.touch_updated_at();

drop trigger if exists therapists_touch_updated_at on therapists;
create trigger therapists_touch_updated_at
  before update on therapists
  for each row execute function public.touch_updated_at();

drop trigger if exists receptionists_touch_updated_at on receptionists;
create trigger receptionists_touch_updated_at
  before update on receptionists
  for each row execute function public.touch_updated_at();

-- ══════════════════════════════════════════════════════════════════════
-- Notes for the operator:
--   • Deploy this after supabase-migration-settings-users-2026-07-12.sql.
--   • The Sidebar / Login / PDF header read from clinic_settings on every
--     page load — the row is authoritative; localStorage is a cache only.
-- ══════════════════════════════════════════════════════════════════════
