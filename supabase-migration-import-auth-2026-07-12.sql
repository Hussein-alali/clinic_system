-- ============================================================
-- Migration 2026-07-12: Import-page auth + staff-wide patient INSERT
-- Idempotent — safe to re-run in the Supabase SQL editor.
--
-- Root causes fixed:
--   1. public.app_role() trusted the JWT's user_metadata.role — a value
--      any signed-in user can rewrite for themselves via
--      auth.updateUser({ data: { role: 'admin' } }). Role checks now read
--      the `staff` table in PostgreSQL by auth.uid(); only an admin can
--      write staff rows, so roles are server-controlled.
--   2. RLS allowed INSERT on patients / patient_files / the patient-files
--      storage bucket only for admin + receptionist. Every staff role
--      (admin, receptionist, doctor, therapist) can now register patients
--      and upload their documents. Deleting patients stays restricted to
--      admin + receptionist.
--
-- RLS stays ENABLED on every table — policies are replaced, not dropped.
-- ============================================================

-- ── 1. Backfill staff rows ───────────────────────────────────
-- app_role() now resolves from staff.auth_uid, so every auth user that
-- was provisioned with a staff role in user_metadata needs a staff row.
-- (Accounts created through the app already have one; this catches any
-- created directly in the dashboard.)
insert into staff (staff_id, name, role, email, auth_uid)
select
  'ST-' || left(u.id::text, 8),
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'role',
  u.email,
  u.id
from auth.users u
where u.raw_user_meta_data->>'role' in ('admin','receptionist','doctor','therapist')
  and not exists (select 1 from staff s where s.auth_uid = u.id)
on conflict (staff_id) do nothing;

-- ── 2. app_role(): read the role from PostgreSQL, not the JWT ─
-- SECURITY DEFINER so the lookup is not blocked by staff's own RLS and
-- cannot recurse into it. Anonymous requests have auth.uid() = null →
-- role = null → every staff policy evaluates to false, so anon can never
-- read or write patient data.
create or replace function public.app_role() returns text
language plpgsql stable security definer
set search_path = public
as $$
begin
  return (select s.role from staff s where s.auth_uid = auth.uid() limit 1);
end $$;

-- ── 3. patients: every staff role may INSERT + UPDATE ────────
-- Replaces the single FOR ALL admin/reception policy with per-command
-- policies. SELECT stays as-is ("staff read patients" already covers all
-- four roles). DELETE remains admin/reception only.
drop policy if exists "admin/reception write patients" on patients;

drop policy if exists "staff insert patients" on patients;
create policy "staff insert patients" on patients for insert with check (
  public.app_role() in ('admin','receptionist','doctor','therapist')
);

drop policy if exists "staff update patients" on patients;
create policy "staff update patients" on patients for update using (
  public.app_role() in ('admin','receptionist','doctor','therapist')
) with check (
  public.app_role() in ('admin','receptionist','doctor','therapist')
);

drop policy if exists "admin/reception delete patients" on patients;
create policy "admin/reception delete patients" on patients for delete using (
  public.app_role() in ('admin','receptionist')
);

-- ── 4. patient_files: every staff role may attach documents ──
-- uploaded_by may not exist yet if supabase-migration-files-2026-07-12.sql
-- hasn't run; make this migration self-contained.
alter table patient_files add column if not exists uploaded_by uuid;

drop policy if exists "admin/reception write patient_files" on patient_files;

drop policy if exists "staff insert patient_files" on patient_files;
create policy "staff insert patient_files" on patient_files for insert with check (
  public.app_role() in ('admin','receptionist','doctor','therapist')
);

drop policy if exists "admin/reception update patient_files" on patient_files;
create policy "admin/reception update patient_files" on patient_files for update using (
  public.app_role() in ('admin','receptionist')
) with check (
  public.app_role() in ('admin','receptionist')
);

-- Uploaders may delete their own rows (needed for the client's
-- compensating rollback when a storage upload succeeds but the metadata
-- insert fails); admin/reception may delete any.
drop policy if exists "staff delete patient_files" on patient_files;
create policy "staff delete patient_files" on patient_files for delete using (
  public.app_role() in ('admin','receptionist')
  or uploaded_by = auth.uid()
);

-- ── 5. Storage bucket: every staff role may upload ───────────
drop policy if exists "admin/reception write patient files bucket" on storage.objects;

drop policy if exists "staff upload patient files bucket" on storage.objects;
create policy "staff upload patient files bucket" on storage.objects for insert with check (
  bucket_id = 'patient-files'
  and public.app_role() in ('admin','receptionist','doctor','therapist')
);

drop policy if exists "admin/reception update patient files bucket" on storage.objects;
create policy "admin/reception update patient files bucket" on storage.objects for update using (
  bucket_id = 'patient-files'
  and public.app_role() in ('admin','receptionist')
) with check (
  bucket_id = 'patient-files'
  and public.app_role() in ('admin','receptionist')
);

-- Uploaders may remove their own objects (upload rollback); storage sets
-- owner/owner_id to auth.uid() on upload.
drop policy if exists "staff delete patient files bucket" on storage.objects;
create policy "staff delete patient files bucket" on storage.objects for delete using (
  bucket_id = 'patient-files'
  and (
    public.app_role() in ('admin','receptionist')
    or owner = auth.uid()
    or owner_id = auth.uid()::text
  )
);

-- ── 6. Belt-and-braces table grants ──────────────────────────
-- Supabase grants these by default; restated so a hardened project that
-- revoked defaults still lets RLS be the single gate.
grant select, insert, update, delete on patients      to authenticated;
grant select, insert, update, delete on patient_files to authenticated;
grant select on staff to authenticated;
