# Deploying Kinetic (clinksys)

The app is fully static (React + Babel Standalone in the browser). `server.js`
is a zero-dependency Node static server so any Node host — including Railway —
can run it with `npm start`.

## 1. Prepare Supabase (once)

1. Open your Supabase project → **SQL Editor**.
2. Apply the schema. Either:
   - **Dashboard:** paste and run **`supabase-schema.sql`** (safe to re-run —
     every statement is idempotent), or
   - **CLI:** `supabase link --project-ref <ref>` then `supabase db push`
     (applies `supabase/migrations/`). See **`supabase/README.md`**.

   This creates all tables, RLS policies, and the `patient-files` storage
   bucket.
3. Run **`seed-admin.sql`**. This creates the main admin account:
   - **Email:** `amr@clinic.eg`
   - **Password:** `Amr@2026!` — **change it after first login**
     (Dashboard → Authentication → Users → Reset password).
4. On an existing database, also run
   **`supabase-migration-import-auth-2026-07-12.sql`** — it moves role
   resolution from JWT `user_metadata` to the `staff` table and lets every
   staff role (admin/receptionist/doctor/therapist) register patients and
   upload their documents.

The Supabase URL and anon key are set in `src/supabase.jsx` (overridable by
defining `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY` in `index.html`
before the script tags).

## 2. Deploy on Railway

1. Push this repository to GitHub.
2. Railway → **New Project → Deploy from GitHub repo** → pick the repo.
3. Railway detects Node and runs `npm install` + `npm start` automatically.
4. **Settings → Networking → Generate Domain** to get the public URL.

No environment variables are required.

## 3. Modes

- **Production (default):** starts with an empty dataset and loads everything
  from Supabase. Log in with the seeded admin account (or other staff
  accounts you create — each needs a `staff` row; that row's `role` is what
  authorizes them).
- **Demo (`?demo=1`):** offline demo with sample data and a role picker on
  the login screen; nothing is written to Supabase.
- **Bulk import (`?import=1`):** temporary page for entering historical
  patients from paper records (see comments in `src/import.jsx`). Open to
  every authenticated staff member (admin, receptionist, doctor,
  therapist); anonymous visitors are sent to the login screen.

## Adding more staff accounts

Easiest: **Settings → المستخدمون والأدوار → إنشاء مستخدم** (creates the login +
role for you). Out of the box this uses the public signup API, which
Supabase **rate-limits to a handful of accounts per hour** and which may
require the new user to confirm their email.

### Unlimited account creation (recommended)

Deploy the `admin-create-user` Edge Function once — after that, admins
create accounts instantly, with no rate limit and no confirmation email
(the app automatically prefers the function when it exists). The
service-role key stays on the server; it is never shipped to the browser.

**Option A — Dashboard (no tools needed):**

1. Supabase Dashboard → **Edge Functions** → **Deploy a new function**
   → *Via Editor*.
2. Name it exactly `admin-create-user`, paste the contents of
   [`supabase/functions/admin-create-user/index.ts`](supabase/functions/admin-create-user/index.ts),
   and deploy.
3. In the function's **Details**, turn **Verify JWT** off (the function
   validates the caller's JWT itself and must answer CORS preflights).
4. Done — no secrets to configure; `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
   `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

**Option B — CLI:** run `./deploy-edge-function.sh <project-ref>` with a
personal access token from
https://supabase.com/dashboard/account/tokens.

Only signed-in **admins** can call the function — it checks the caller's
role in the `staff` table and refuses everyone else.

### Fallback path (no Edge Function)

If the function isn't deployed the app falls back to public signup. For
that to work, turn **"Confirm email" OFF** (Authentication → Sign In / Up
→ Email), and expect the hourly rate limit.

### Manual creation:

1. Supabase Dashboard → Authentication → **Add user** (email + password).
2. Add a row in the `staff` table with `auth_uid` = the user's UUID and
   `role` = `receptionist` / `doctor` / `therapist` / `admin`. **This row is
   required** — `public.app_role()` (used by every RLS policy) reads the
   role from `staff`, not from user metadata.
3. Optional: mirror the role into the user's **User Metadata**
   (`{ "role": "receptionist" }`) so the UI greeting shows before the staff
   row loads; it grants no permissions.

## Booking data (departments & doctors)

The booking module reads **departments** and **doctors** from the database
(tables created by `supabase-schema.sql`):

- Add a **department** row (`name_ar`, `icon`, `color`, `sort_order`,
  `active`) → it appears automatically on the booking page.
- Add a **doctor** row (`name`, `department_id`, `specialization`,
  `experience_years`, `status` = available/busy/leave, `active`) → it shows
  under its department. Each department card counts its active doctors;
  departments with zero active doctors are shown as "0 أطباء" and disabled.
- **حجز سريع (Quick Booking)** — for phone/WhatsApp bookings: captures only
  name, phone, department, doctor, date, time, notes. It links to an
  existing patient by phone or creates one flagged **"ملف غير مكتمل"**
  (Incomplete Profile), which shows a warning banner in the patient profile
  until completed. Bookings persist to the `bookings` table
  (`doctor_id` / `department_id` columns).
