-- ═══════════════════════════════════════════════════════════════════
-- physio_sessions — persisted physiotherapy diagnosis sessions.
--
-- Each saved diagnosis is one row (full history per patient), including the
-- interactive body-diagram markers [{view,x,y}] and the rest of the physio
-- form. Previously PhysioSessionForm persisted only to the browser's
-- localStorage, so the coordinates were per-browser, lost on cache clear,
-- and never part of the permanent patient record.
--
-- ADDITIVE migration: creates a NEW table only. No existing table, column,
-- row, or policy is modified. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.physio_sessions (
  id              text primary key,
  patient_id      text references public.patients(patient_id) on delete cascade,
  therapist_id    text,
  data            jsonb not null default '{}'::jsonb,   -- full form snapshot (diagnosis, markers, modalities, …)
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz not null default now()
);

create index if not exists physio_sessions_patient_idx
  on public.physio_sessions(patient_id, created_at desc);

alter table public.physio_sessions enable row level security;

-- Every staff role may read and add a diagnosis; history is append-only for
-- non-admins (only admins may update/delete), to protect the record.
drop policy if exists "staff read physio_sessions" on public.physio_sessions;
create policy "staff read physio_sessions" on public.physio_sessions
  for select using (public.app_role() in ('admin','receptionist','doctor','therapist'));

drop policy if exists "staff insert physio_sessions" on public.physio_sessions;
create policy "staff insert physio_sessions" on public.physio_sessions
  for insert with check (public.app_role() in ('admin','receptionist','doctor','therapist'));

drop policy if exists "admin manage physio_sessions" on public.physio_sessions;
create policy "admin manage physio_sessions" on public.physio_sessions
  for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

grant select, insert, update, delete on public.physio_sessions to authenticated;
