-- ══════════════════════════════════════════════════════════════════════
-- Migration 2026-07-12: fix clinic settings persistence + user management
--
-- ROOT CAUSE (clinic settings): the `clinic_settings` table only had the
-- columns { id, name, subtitle, logo, primary_color, updated_at }, but
-- the Settings form was upserting { branch, phone, email, address,
-- tax_id, hours, ... }. PostgREST rejected every save with 400 because
-- those columns did not exist. The client ignored the response, showed
-- "saved" from a local optimistic update, then the next page load
-- fetched the untouched singleton row and everything "reverted".
--
-- ROOT CAUSE (users): the `staff` table lacked `status`, `created_by`,
-- and `created_at`, so the admin-create flow could not record the
-- provenance the PRD requires.
--
-- Fix: add every column that the client actually writes, and refresh
-- the RLS policies so admins can INSERT + UPDATE the singleton row.
-- Safe to re-run — every statement is idempotent.
-- ══════════════════════════════════════════════════════════════════════

-- ── clinic_settings: add every field the Settings form exposes ──
alter table clinic_settings add column if not exists branch                text;
alter table clinic_settings add column if not exists phone                 text;
alter table clinic_settings add column if not exists email                 text;
alter table clinic_settings add column if not exists address               text;
alter table clinic_settings add column if not exists tax_id                text;
alter table clinic_settings add column if not exists hours                 text;
alter table clinic_settings add column if not exists website               text;
alter table clinic_settings add column if not exists currency              text default 'EGP';
alter table clinic_settings add column if not exists timezone              text default 'Africa/Cairo';
alter table clinic_settings add column if not exists appointment_duration  int  default 30;

-- Make sure the singleton row actually exists before the first save.
insert into clinic_settings (id) values (1) on conflict do nothing;

-- Refresh RLS: admins get SELECT + INSERT + UPDATE. Read stays public so
-- the login page can pull branding before an auth session exists.
drop policy if exists "public read clinic_settings" on clinic_settings;
create policy "public read clinic_settings"
  on clinic_settings for select using (true);

drop policy if exists "admin write clinic_settings" on clinic_settings;
create policy "admin write clinic_settings"
  on clinic_settings for all
  using      (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- ── staff: provenance columns the PRD requires ──
alter table staff add column if not exists status      text default 'active';
alter table staff add column if not exists created_by  uuid;
alter table staff add column if not exists created_at  timestamptz default now();

-- Backfill created_at for pre-existing rows so downstream sorts don't NaN.
update staff set created_at = now() where created_at is null;

-- Case-insensitive uniqueness on email — the current text-unique index is
-- case-sensitive and would let "user@x" and "User@x" coexist.
create unique index if not exists staff_email_lower_uniq
  on staff (lower(email))
  where email is not null and email <> '';

-- ══════════════════════════════════════════════════════════════════════
-- Notes for the operator:
--   • Deploy the `admin-create-user` Edge Function alongside this
--     migration so the client can create users without triggering the
--     GoTrue signup email rate limit.
--   • If you must keep the anon signUp fallback, go to Supabase
--     Dashboard → Authentication → Providers → Email and either
--     (a) disable "Confirm email", or (b) increase the SMTP quota.
-- ══════════════════════════════════════════════════════════════════════
