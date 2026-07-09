-- ============================================================
-- Kinetic — Main admin account: "amir"
--
-- Run this ONCE in the Supabase SQL editor, AFTER running
-- supabase-schema.sql.
--
--   Email:    amir@kinetic.eg
--   Password: Amir@2026!     ←  CHANGE THIS after first login
--                                (Supabase Dashboard → Authentication →
--                                 Users → amir@kinetic.eg → Reset password)
--
-- What it does:
--   1. Creates the Supabase Auth user with role "admin" in
--      user_metadata (this is what the app's RLS policies and the
--      login screen read).
--   2. Creates the matching row in the `staff` table, linked via
--      auth_uid, so the app can resolve the display name and role.
--
-- Safe to re-run: it skips the auth user if the email already exists
-- and upserts the staff row.
-- ============================================================

create extension if not exists pgcrypto;

do $$
declare
  uid uuid;
begin
  select id into uid from auth.users where email = 'amir@kinetic.eg';

  if uid is null then
    uid := gen_random_uuid();

    -- NOTE: the *_token / *_change columns must be '' (not NULL) — GoTrue
    -- returns 500 "Database error" on login when they are NULL, which is
    -- the classic pitfall of SQL-created auth users.
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token,
      is_sso_user
    ) values (
      '00000000-0000-0000-0000-000000000000',
      uid,
      'authenticated',
      'authenticated',
      'amir@kinetic.eg',
      crypt('Amir@2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin","name":"أمير"}'::jsonb,
      now(), now(),
      '', '',
      '', '', '',
      '', '', '',
      false
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      uid,
      uid::text,
      jsonb_build_object('sub', uid::text, 'email', 'amir@kinetic.eg', 'email_verified', true),
      'email',
      now(), now(), now()
    );
  end if;

  -- Repair pass: if the user was created by an earlier version of this
  -- script (or any SQL insert) with NULL token columns, GoTrue answers
  -- every login with 500. Normalize them to '' so sign-in works.
  update auth.users set
    confirmation_token         = coalesce(confirmation_token, ''),
    recovery_token             = coalesce(recovery_token, ''),
    email_change               = coalesce(email_change, ''),
    email_change_token_new     = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change               = coalesce(phone_change, ''),
    phone_change_token         = coalesce(phone_change_token, ''),
    reauthentication_token     = coalesce(reauthentication_token, ''),
    email_confirmed_at         = coalesce(email_confirmed_at, now()),
    raw_user_meta_data         = coalesce(raw_user_meta_data, '{}'::jsonb)
                                   || '{"role":"admin","name":"أمير"}'::jsonb
  where email = 'amir@kinetic.eg';

  insert into staff (staff_id, name, role, email, auth_uid)
  values ('ST-AMIR', 'أمير', 'admin', 'amir@kinetic.eg', uid)
  on conflict (staff_id) do update
    set auth_uid = excluded.auth_uid,
        role     = 'admin',
        email    = excluded.email,
        name     = excluded.name;
end $$;
