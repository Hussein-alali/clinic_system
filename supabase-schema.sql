-- ============================================================
-- Kinetic Clinic Management System — Supabase Schema
-- Run this in Supabase SQL editor to create the required tables.
-- After running, set the client keys in index.html:
--   <script>
--     window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
--     window.SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
--   </script>
-- ============================================================

-- ── Clinic branding (singleton row) ─────────────────────────
create table if not exists clinic_settings (
  id            int primary key default 1,
  name          text not null default 'كينيتك',
  subtitle      text default 'نظام العيادة',
  logo          text,                       -- data URL or public storage URL
  primary_color text default '#7BBDE8',
  updated_at    timestamptz default now(),
  constraint clinic_settings_singleton check (id = 1)
);
insert into clinic_settings (id) values (1) on conflict do nothing;

-- ── Custom sections (admin-defined sidebar entries) ────────
create table if not exists custom_sections (
  id           text primary key,
  slug         text not null unique,
  label        text not null,
  icon         text not null default 'Layers',
  "group"      text default 'مخصص',
  description  text,
  content      text,                       -- freeform content body
  position     int default 0,
  visible      boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Core domain tables ──────────────────────────────────────
create table if not exists patients (
  patient_id  text primary key,
  name        text not null,
  phone       text,
  age         int,
  gender      text check (gender in ('M','F')),
  diagnosis   text,
  notes       text,
  created_at  timestamptz default now()
);

create table if not exists bookings (
  booking_id    text primary key,
  patient_id    text references patients(patient_id) on delete cascade,
  therapist_id  text,
  date          date,
  time          text,
  status        text default 'pending',
  notes         text,
  created_at    timestamptz default now()
);

create table if not exists sessions (
  session_id      text primary key,
  patient_id      text references patients(patient_id) on delete cascade,
  therapist_id    text,
  date            date,
  pain_score      int check (pain_score between 0 and 10),
  session_notes   text,
  session_number  int,
  created_at      timestamptz default now()
);

create table if not exists invoices (
  invoice_id      text primary key,
  patient_id      text references patients(patient_id) on delete cascade,
  amount          numeric,
  paid            numeric default 0,
  payment_method  text,
  status          text default 'pending',
  created_at      timestamptz default now()
);

create table if not exists staff (
  staff_id  text primary key,
  name      text not null,
  role      text check (role in ('admin','receptionist','doctor','therapist')),
  phone     text,
  email     text unique,
  auth_uid  uuid                                -- links to auth.users.id
);

-- ── Therapists (roster + workload) ──────────────────────────
create table if not exists therapists (
  id          text primary key,
  name        text not null,
  spec        text,
  "load"      int default 0,
  max         int default 8,
  color       text default '#7BBDE8',
  created_at  timestamptz default now()
);

-- ── Packages (treatment plans / pricing) ────────────────────
create table if not exists packages (
  id          text primary key,
  name        text not null,
  sessions    int default 1,
  price       numeric default 0,
  active      boolean default true,
  popular     boolean default false,
  color       text default '#7BBDE8',
  sold        int default 0,
  created_at  timestamptz default now()
);

-- ── WhatsApp campaigns ──────────────────────────────────────
create table if not exists campaigns (
  id          text primary key,
  name        text not null,
  audience    int default 0,
  sent        int default 0,
  "read"      int default 0,
  replied     int default 0,
  status      text default 'draft',
  template    text,
  schedule    text,
  best        boolean default false,
  created_at  timestamptz default now()
);

-- ── Patient files (normalized document store) ───────────────
-- The `patients` table stays PII-only. Uploaded documents (reports,
-- X-rays, MRI/CT scans, lab results, prescriptions, images, PDFs, …)
-- are stored in Supabase Storage; only their path/public URL is kept
-- here. `file_type` is a free-text MIME/label so new document kinds
-- need no schema change.
create table if not exists patient_files (
  file_id      text primary key,
  patient_id   text references patients(patient_id) on delete cascade,
  file_name    text not null,
  file_type    text,
  file_url     text,
  uploaded_at  timestamptz default now()
);
create index if not exists patient_files_patient_id_idx on patient_files(patient_id);

-- ── Audit log (PRD Section 8) ───────────────────────────────
create table if not exists audit_events (
  id          bigserial primary key,
  actor_uid   uuid,
  actor_role  text,
  action      text not null,                   -- delete / refund / role-change / etc.
  table_name  text not null,
  row_pk      text,
  payload     jsonb,
  created_at  timestamptz default now()
);

-- ── Row Level Security policies ─────────────────────────────
alter table clinic_settings enable row level security;
alter table custom_sections enable row level security;

-- Allow anon read of branding + visible sections (safe: no PII)
create policy "public read clinic_settings"
  on clinic_settings for select using (true);

create policy "public read custom_sections"
  on custom_sections for select using (visible = true);

-- Writes require an authenticated admin JWT.
-- Replace the check with your real admin claim once auth is wired.
create policy "admin write clinic_settings"
  on clinic_settings for all
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create policy "admin write custom_sections"
  on custom_sections for all
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

-- ── Domain-table RLS (PRD Section 8) ────────────────────────
-- Enable RLS on every domain table.
alter table patients      enable row level security;
alter table bookings      enable row level security;
alter table sessions      enable row level security;
alter table invoices      enable row level security;
alter table staff         enable row level security;
alter table therapists    enable row level security;
alter table packages      enable row level security;
alter table campaigns     enable row level security;
alter table patient_files enable row level security;
alter table audit_events  enable row level security;

-- Helper: current role from JWT ('admin' | 'receptionist' | 'doctor' | 'therapist' | 'patient')
-- (auth.jwt() ->> 'role') is set by Supabase Auth via user_metadata.role or a trigger.

-- ── patients ─────────────────────────────────────────────────
create policy "staff read patients" on patients for select using (
  auth.jwt() ->> 'role' in ('admin','receptionist','doctor','therapist')
);
create policy "admin/reception write patients" on patients for all using (
  auth.jwt() ->> 'role' in ('admin','receptionist')
) with check (
  auth.jwt() ->> 'role' in ('admin','receptionist')
);

-- ── bookings ─────────────────────────────────────────────────
create policy "staff read bookings" on bookings for select using (
  auth.jwt() ->> 'role' in ('admin','receptionist','doctor','therapist')
);
create policy "admin/reception write bookings" on bookings for all using (
  auth.jwt() ->> 'role' in ('admin','receptionist')
) with check (
  auth.jwt() ->> 'role' in ('admin','receptionist')
);

-- ── sessions ─────────────────────────────────────────────────
create policy "staff read sessions" on sessions for select using (
  auth.jwt() ->> 'role' in ('admin','receptionist','doctor','therapist')
);
-- Therapists write their own sessions; admins can write any.
create policy "therapist writes own sessions" on sessions for all using (
  auth.jwt() ->> 'role' = 'admin'
  or (auth.jwt() ->> 'role' = 'therapist' and therapist_id = (
    select staff_id from staff where auth_uid = auth.uid()
  ))
) with check (
  auth.jwt() ->> 'role' = 'admin'
  or (auth.jwt() ->> 'role' = 'therapist' and therapist_id = (
    select staff_id from staff where auth_uid = auth.uid()
  ))
);

-- ── invoices ─────────────────────────────────────────────────
create policy "staff read invoices" on invoices for select using (
  auth.jwt() ->> 'role' in ('admin','receptionist','doctor')
);
create policy "admin/reception write invoices" on invoices for all using (
  auth.jwt() ->> 'role' in ('admin','receptionist')
) with check (
  auth.jwt() ->> 'role' in ('admin','receptionist')
);

-- ── staff ────────────────────────────────────────────────────
create policy "staff read own+admin all" on staff for select using (
  auth.jwt() ->> 'role' = 'admin'
  or auth_uid = auth.uid()
);
create policy "admin write staff" on staff for all using (
  auth.jwt() ->> 'role' = 'admin'
) with check (
  auth.jwt() ->> 'role' = 'admin'
);

-- ── therapists ───────────────────────────────────────────────
create policy "staff read therapists" on therapists for select using (
  auth.jwt() ->> 'role' in ('admin','receptionist','doctor','therapist')
);
create policy "admin write therapists" on therapists for all using (
  auth.jwt() ->> 'role' = 'admin'
) with check (
  auth.jwt() ->> 'role' = 'admin'
);

-- ── packages ─────────────────────────────────────────────────
create policy "staff read packages" on packages for select using (
  auth.jwt() ->> 'role' in ('admin','receptionist','doctor','therapist')
);
create policy "admin/reception write packages" on packages for all using (
  auth.jwt() ->> 'role' in ('admin','receptionist')
) with check (
  auth.jwt() ->> 'role' in ('admin','receptionist')
);

-- ── campaigns ────────────────────────────────────────────────
create policy "staff read campaigns" on campaigns for select using (
  auth.jwt() ->> 'role' in ('admin','receptionist','doctor')
);
create policy "admin/reception write campaigns" on campaigns for all using (
  auth.jwt() ->> 'role' in ('admin','receptionist')
) with check (
  auth.jwt() ->> 'role' in ('admin','receptionist')
);

-- ── patient_files ────────────────────────────────────────────
create policy "staff read patient_files" on patient_files for select using (
  auth.jwt() ->> 'role' in ('admin','receptionist','doctor','therapist')
);
create policy "admin/reception write patient_files" on patient_files for all using (
  auth.jwt() ->> 'role' in ('admin','receptionist')
) with check (
  auth.jwt() ->> 'role' in ('admin','receptionist')
);

-- ── audit_events ─────────────────────────────────────────────
create policy "admin read audit" on audit_events for select using (
  auth.jwt() ->> 'role' = 'admin'
);
create policy "system insert audit" on audit_events for insert with check (true);

-- ── Storage bucket for patient documents ────────────────────
-- Files live in the 'patient-files' bucket; patient_files.file_url stores
-- the public URL. Run once (safe to re-run).
insert into storage.buckets (id, name, public)
  values ('patient-files', 'patient-files', true)
  on conflict (id) do nothing;

create policy "staff read patient files bucket" on storage.objects for select using (
  bucket_id = 'patient-files'
  and auth.jwt() ->> 'role' in ('admin','receptionist','doctor','therapist')
);
create policy "admin/reception write patient files bucket" on storage.objects for all using (
  bucket_id = 'patient-files'
  and auth.jwt() ->> 'role' in ('admin','receptionist')
) with check (
  bucket_id = 'patient-files'
  and auth.jwt() ->> 'role' in ('admin','receptionist')
);
