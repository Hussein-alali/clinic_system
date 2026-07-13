# Supabase — schema & migrations

This folder holds the database schema as **versioned migrations** for the
Supabase CLI. The repo-root `supabase-schema.sql` is the same content as a
single paste-friendly file for the Dashboard SQL editor — the two are kept in
sync.

```
supabase/
├── config.toml                              # CLI project config
├── seed.sql                                 # (admin bootstrap note)
└── migrations/
    ├── 20260101000000_baseline_schema.sql   # full schema (idempotent)
    ├── 20260712000000_payments_templates_patients_treatments.sql
    │                                        # catch-up: Quick Payment, payments
    │                                        # ledger, subscriptions, treatment
    │                                        # methods/templates, patient fields,
    │                                        # files, staff roles, treatments
    └── 20260713000000_appointment_scheduling.sql
                                             # recurring patient schedules,
                                             # optional doctor / required
                                             # therapist, calendar indexes
```

Every statement is **idempotent** (`create ... if not exists`,
`alter ... add column if not exists`, `drop policy if exists` + `create policy`,
`create or replace function`, `insert ... on conflict`). So applying it to a
**fresh** project or an **existing** database is safe — existing objects are
left untouched and only what's missing is created.

## Applying it

### Option A — Supabase CLI (recommended)

```bash
# one-time
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>

# push all pending migrations to the linked project
supabase db push
```

Then provision the admin once (see `seed.sql`): run `seed-admin.sql` in the
Dashboard SQL editor.

### Option B — Dashboard (no CLI)

1. Open your project → **SQL Editor**.
2. Paste and run the root **`supabase-schema.sql`** (or the baseline migration —
   identical content).
3. Paste and run **`seed-admin.sql`** to create the `amir` admin.

## Adding future changes

Create a **new** timestamped migration (never edit an applied one):

```bash
supabase migration new add_something   # creates supabase/migrations/<ts>_add_something.sql
# write your idempotent DDL, then:
supabase db push
```

Keep the root `supabase-schema.sql` in sync (it's the consolidated snapshot
used by Dashboard users) by appending the same statements.

## What the baseline contains

Tables: `clinic_settings`, `custom_sections`, `patients` (+`therapist_id`),
`bookings` (+`doctor_id`, `department_id`), `sessions`, `invoices`, `staff`,
`therapists`, `departments`, `doctors`, `packages`, `campaigns`, `branches`,
`patient_files`, `audit_events` — plus the `app_role()` helper, row-level
security on every table, and the public **`patient-files`** Storage bucket with
its access policies.
