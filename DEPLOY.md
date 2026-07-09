# Deploying Kinetic (clinksys)

The app is fully static (React + Babel Standalone in the browser). `server.js`
is a zero-dependency Node static server so any Node host — including Railway —
can run it with `npm start`.

## 1. Prepare Supabase (once)

1. Open your Supabase project → **SQL Editor**.
2. Run **`supabase-schema.sql`** (safe to re-run — tables and policies are
   idempotent). This creates all tables, RLS policies, and the
   `patient-files` storage bucket.
3. Run **`seed-admin.sql`**. This creates the main admin account:
   - **Email:** `amir@kinetic.eg`
   - **Password:** `Amir@2026!` — **change it after first login**
     (Dashboard → Authentication → Users → Reset password).

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
  from Supabase. Log in with the amir account (or other staff accounts you
  create with a `role` in user metadata + a `staff` row).
- **Demo (`?demo=1`):** offline demo with sample data and a role picker on
  the login screen; nothing is written to Supabase.
- **Bulk import (`?import=1`):** temporary page for entering historical
  patients from paper records (see comments in `src/import.jsx`).

## Adding more staff accounts

Easiest: **Settings → المستخدمون والأدوار → إنشاء مستخدم** (creates the login +
role for you). Or manually:

1. Supabase Dashboard → Authentication → **Add user** (email + password).
2. Edit the user → **User Metadata** → add:
   `{ "role": "receptionist" }` (or `doctor` / `therapist` / `admin`).
3. Add a row in the `staff` table with `auth_uid` = the user's UUID.

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
