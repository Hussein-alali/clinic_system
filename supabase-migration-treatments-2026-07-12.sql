-- ============================================================
-- Migration 2026-07-12 — Treatments (سجلات العلاج)
--
-- Turns the template workflow into a real record flow:
-- clicking «استخدام» on a قالب opens the treatment form with every
-- template field pre-filled; saving inserts an independent row here.
-- The row keeps a full copy of every clinical field PLUS the id,
-- version and snapshot of the template that generated it, so later
-- template edits never change existing treatments and vice-versa.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- Templates can carry file attachments (copied into treatments on use).
alter table treatment_templates add column if not exists attachments jsonb not null default '[]'::jsonb;

-- ── Treatments table ──────────────────────────────────────────
create table if not exists treatments (
  treatment_id           text primary key,
  patient_id             text not null references patients(patient_id) on delete cascade,
  therapist_id           text not null,
  therapist_name         text,
  -- Template linkage (audit only — values below are independent copies).
  template_id            text references treatment_templates(template_id),
  template_version       int,
  template_name          text,
  template_snapshot      jsonb,          -- full template row at apply time
  -- Clinical fields (copied from the template, editable before save).
  name                   text,
  category               text,
  diagnosis              text,
  body_part              text,
  goals                  jsonb not null default '[]'::jsonb,
  exercises              jsonb not null default '[]'::jsonb,
  methods                jsonb not null default '[]'::jsonb,
  home_instructions      text,
  notes                  text,
  warnings               text,
  followup_instructions  text,
  estimated_sessions     int,
  weekly_frequency       int,
  expected_recovery_days int,
  attachments            jsonb not null default '[]'::jsonb,
  extra_fields           jsonb not null default '{}'::jsonb,  -- future custom fields, no schema change needed
  treatment_date         date default current_date,
  start_date             date,
  status                 text not null default 'active'
                           check (status in ('draft','active','completed','cancelled')),
  created_by             uuid,
  created_by_name        text,
  updated_by             uuid,
  updated_by_name        text,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);
create index if not exists treatments_patient_idx   on treatments(patient_id);
create index if not exists treatments_therapist_idx on treatments(therapist_id);
create index if not exists treatments_template_idx  on treatments(template_id);
create index if not exists treatments_created_idx   on treatments(created_at desc);

alter table treatments enable row level security;

-- Read: clinical roles. Writes go through the security-definer RPCs only.
drop policy if exists "clinical read treatments" on treatments;
create policy "clinical read treatments" on treatments for select using (
  public.app_role() in ('admin','doctor','therapist')
);

-- ── RPC: create a treatment (optionally from a template) ─────
-- When p_payload->>'template_id' is set, EVERY clinical field of the
-- template is copied first, then the payload (the doctor's edits) is
-- merged on top — so fields the client never rendered still arrive in
-- the treatment row. Validates patient, therapist and template before
-- inserting, logs template_usage and bumps usage_count in the same
-- transaction as the insert.
create or replace function public.create_treatment(
  p_treatment_id text,
  p_payload      jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_role   text := public.app_role();
  v_uid    uuid := auth.uid();
  v_name   text := coalesce((select raw_user_meta_data->>'name' from auth.users where id = v_uid),'—');
  v_tpl    treatment_templates%rowtype;
  v_tpl_id text := nullif(btrim(coalesce(p_payload->>'template_id','')),'');
  v_pat_id text := nullif(btrim(coalesce(p_payload->>'patient_id','')),'');
  v_th_id  text := nullif(btrim(coalesce(p_payload->>'therapist_id','')),'');
  v_th_nm  text;
  v_base   jsonb := '{}'::jsonb;
  v_data   jsonb;
  v_use_id text;
  v_status text := coalesce(nullif(btrim(coalesce(p_payload->>'status','')),''),'active');
  v_row    treatments%rowtype;
begin
  if v_role not in ('admin','doctor','therapist') then
    raise exception 'غير مصرح';
  end if;
  if p_treatment_id is null or btrim(p_treatment_id) = '' then
    raise exception 'معرّف العلاج مفقود';
  end if;

  -- 1. المريض موجود؟
  if v_pat_id is null then raise exception 'اختر المريض'; end if;
  if not exists (select 1 from patients where patient_id = v_pat_id) then
    raise exception 'المريض غير موجود';
  end if;

  -- 2. الأخصائي موجود؟ (roster أو جدول الموظفين)
  if v_th_id is null then raise exception 'اختر الأخصائي المسؤول'; end if;
  select name into v_th_nm from therapists where id = v_th_id;
  if v_th_nm is null then
    select name into v_th_nm from staff
     where staff_id = v_th_id and role in ('therapist','doctor','admin');
  end if;
  if v_th_nm is null then raise exception 'الأخصائي غير موجود'; end if;

  -- 3. القالب موجود؟ انسخ كل حقوله كقاعدة ثم طبّق تعديلات الطبيب فوقها.
  if v_tpl_id is not null then
    select * into v_tpl from treatment_templates where template_id = v_tpl_id;
    if v_tpl.template_id is null then raise exception 'القالب غير موجود'; end if;
    if v_tpl.status = 'archived' then raise exception 'لا يمكن استخدام قالب مؤرشف'; end if;
    v_base := jsonb_build_object(
      'name',                   v_tpl.name,
      'category',               v_tpl.category,
      'diagnosis',              v_tpl.diagnosis,
      'body_part',              v_tpl.body_part,
      'goals',                  v_tpl.goals,
      'exercises',              v_tpl.exercises,
      'methods',                v_tpl.methods,
      'home_instructions',      v_tpl.home_instructions,
      'notes',                  v_tpl.notes,
      'warnings',               v_tpl.warnings,
      'followup_instructions',  v_tpl.followup_instructions,
      'estimated_sessions',     v_tpl.estimated_sessions,
      'weekly_frequency',       v_tpl.weekly_frequency,
      'expected_recovery_days', v_tpl.expected_recovery_days,
      'attachments',            v_tpl.attachments
    );
  end if;
  v_data := jsonb_strip_nulls(v_base) || jsonb_strip_nulls(coalesce(p_payload,'{}'::jsonb));

  insert into treatments (
    treatment_id, patient_id, therapist_id, therapist_name,
    template_id, template_version, template_name, template_snapshot,
    name, category, diagnosis, body_part,
    goals, exercises, methods,
    home_instructions, notes, warnings, followup_instructions,
    estimated_sessions, weekly_frequency, expected_recovery_days,
    attachments, extra_fields, treatment_date, start_date, status,
    created_by, created_by_name, updated_by, updated_by_name
  ) values (
    p_treatment_id, v_pat_id, v_th_id, v_th_nm,
    v_tpl.template_id, v_tpl.version, v_tpl.name,
    case when v_tpl.template_id is null then null else to_jsonb(v_tpl) end,
    v_data->>'name', v_data->>'category', v_data->>'diagnosis', v_data->>'body_part',
    coalesce(v_data->'goals','[]'::jsonb),
    coalesce(v_data->'exercises','[]'::jsonb),
    coalesce(v_data->'methods','[]'::jsonb),
    v_data->>'home_instructions', v_data->>'notes', v_data->>'warnings', v_data->>'followup_instructions',
    nullif(v_data->>'estimated_sessions','')::int,
    nullif(v_data->>'weekly_frequency','')::int,
    nullif(v_data->>'expected_recovery_days','')::int,
    coalesce(v_data->'attachments','[]'::jsonb),
    coalesce(v_data->'extra_fields','{}'::jsonb),
    coalesce(nullif(v_data->>'treatment_date','')::date, current_date),
    nullif(v_data->>'start_date','')::date,
    case when v_status in ('draft','active','completed','cancelled') then v_status else 'active' end,
    v_uid, v_name, v_uid, v_name
  );

  -- Usage log + counter — only now that the treatment really exists.
  if v_tpl.template_id is not null then
    v_use_id := 'TU-' || to_char(now(),'YYYYMMDD-HH24MISS') || '-'
             || upper(substr(md5(random()::text),1,4));
    insert into template_usage (use_id, template_id, patient_id, plan_id, applied_by, applied_by_name)
    values (v_use_id, v_tpl.template_id, v_pat_id, p_treatment_id, v_uid, v_name);
    update treatment_templates
       set usage_count  = coalesce(usage_count,0) + 1,
           last_used_at = now()
     where template_id = v_tpl.template_id;
  end if;

  insert into audit_events (actor_uid, actor_role, action, table_name, row_pk, payload)
  values (v_uid, v_role, 'treatment_create', 'treatments', p_treatment_id,
    jsonb_build_object('patient_id', v_pat_id, 'therapist_id', v_th_id,
                       'template_id', v_tpl.template_id, 'template_version', v_tpl.version,
                       'use_id', v_use_id));

  select * into v_row from treatments where treatment_id = p_treatment_id;
  return to_jsonb(v_row);
end;
$$;
grant execute on function public.create_treatment(text, jsonb) to authenticated;

-- ── RPC: update a treatment ───────────────────────────────────
-- Touches ONLY the treatment row. The originating template — and the
-- snapshot/version stored here — are never modified.
create or replace function public.update_treatment(
  p_treatment_id text,
  p_payload      jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.app_role();
  v_uid  uuid := auth.uid();
  v_name text := coalesce((select raw_user_meta_data->>'name' from auth.users where id = v_uid),'—');
  v_th_id text := nullif(btrim(coalesce(p_payload->>'therapist_id','')),'');
  v_th_nm text;
  v_row  treatments%rowtype;
begin
  if v_role not in ('admin','doctor','therapist') then
    raise exception 'غير مصرح';
  end if;
  select * into v_row from treatments where treatment_id = p_treatment_id;
  if v_row.treatment_id is null then raise exception 'سجل العلاج غير موجود'; end if;

  if p_payload ? 'patient_id'
     and nullif(btrim(coalesce(p_payload->>'patient_id','')),'') is distinct from v_row.patient_id then
    if not exists (select 1 from patients where patient_id = p_payload->>'patient_id') then
      raise exception 'المريض غير موجود';
    end if;
  end if;
  if v_th_id is not null and v_th_id is distinct from v_row.therapist_id then
    select name into v_th_nm from therapists where id = v_th_id;
    if v_th_nm is null then
      select name into v_th_nm from staff
       where staff_id = v_th_id and role in ('therapist','doctor','admin');
    end if;
    if v_th_nm is null then raise exception 'الأخصائي غير موجود'; end if;
  end if;

  update treatments set
    patient_id             = coalesce(nullif(btrim(coalesce(p_payload->>'patient_id','')),''), patient_id),
    therapist_id           = coalesce(v_th_id, therapist_id),
    therapist_name         = coalesce(v_th_nm, therapist_name),
    name                   = coalesce(p_payload->>'name', name),
    category               = case when p_payload ? 'category'  then p_payload->>'category'  else category  end,
    diagnosis              = case when p_payload ? 'diagnosis' then p_payload->>'diagnosis' else diagnosis end,
    body_part              = case when p_payload ? 'body_part' then p_payload->>'body_part' else body_part end,
    goals                  = coalesce(p_payload->'goals', goals),
    exercises              = coalesce(p_payload->'exercises', exercises),
    methods                = coalesce(p_payload->'methods', methods),
    home_instructions      = case when p_payload ? 'home_instructions'     then p_payload->>'home_instructions'     else home_instructions end,
    notes                  = case when p_payload ? 'notes'                 then p_payload->>'notes'                 else notes end,
    warnings               = case when p_payload ? 'warnings'              then p_payload->>'warnings'              else warnings end,
    followup_instructions  = case when p_payload ? 'followup_instructions' then p_payload->>'followup_instructions' else followup_instructions end,
    estimated_sessions     = case when p_payload ? 'estimated_sessions'     then nullif(p_payload->>'estimated_sessions','')::int     else estimated_sessions end,
    weekly_frequency       = case when p_payload ? 'weekly_frequency'       then nullif(p_payload->>'weekly_frequency','')::int       else weekly_frequency end,
    expected_recovery_days = case when p_payload ? 'expected_recovery_days' then nullif(p_payload->>'expected_recovery_days','')::int else expected_recovery_days end,
    attachments            = coalesce(p_payload->'attachments', attachments),
    extra_fields           = coalesce(p_payload->'extra_fields', extra_fields),
    treatment_date         = coalesce(nullif(p_payload->>'treatment_date','')::date, treatment_date),
    start_date             = case when p_payload ? 'start_date' then nullif(p_payload->>'start_date','')::date else start_date end,
    status                 = case when coalesce(p_payload->>'status','') in ('draft','active','completed','cancelled')
                                  then p_payload->>'status' else status end,
    updated_by             = v_uid,
    updated_by_name        = v_name,
    updated_at             = now()
  where treatment_id = p_treatment_id;

  insert into audit_events (actor_uid, actor_role, action, table_name, row_pk, payload)
  values (v_uid, v_role, 'treatment_update', 'treatments', p_treatment_id, p_payload);

  select * into v_row from treatments where treatment_id = p_treatment_id;
  return to_jsonb(v_row);
end;
$$;
grant execute on function public.update_treatment(text, jsonb) to authenticated;

-- ── RPC: list treatments (joined with patient name) ──────────
create or replace function public.list_treatments(
  p_patient_id text default null,
  p_status     text default null,
  p_search     text default null,
  p_limit      int  default 200,
  p_offset     int  default 0
) returns jsonb
language plpgsql security definer set search_path = public stable as $$
declare
  v_lim  int  := least(greatest(coalesce(p_limit,200),1),500);
  v_off  int  := greatest(coalesce(p_offset,0),0);
  v_srch text := nullif(btrim(coalesce(p_search,'')),'');
  v_st   text := nullif(btrim(coalesce(p_status,'')),'');
  v_pid  text := nullif(btrim(coalesce(p_patient_id,'')),'');
  v_rows jsonb;
  v_cnt  int;
begin
  if public.app_role() not in ('admin','doctor','therapist') then
    raise exception 'غير مصرح';
  end if;

  with base as (
    select t.*, p.name as patient_name
      from treatments t
      left join patients p on p.patient_id = t.patient_id
     where (v_pid  is null or t.patient_id = v_pid)
       and (v_st   is null or t.status = v_st)
       and (
         v_srch is null
         or t.treatment_id   ilike '%'||v_srch||'%'
         or coalesce(p.name,'')          ilike '%'||v_srch||'%'
         or coalesce(t.diagnosis,'')     ilike '%'||v_srch||'%'
         or coalesce(t.therapist_name,'') ilike '%'||v_srch||'%'
       )
  ),
  ordered as (
    select * from base order by created_at desc limit v_lim offset v_off
  )
  select coalesce(jsonb_agg(to_jsonb(ordered.*)),'[]'::jsonb),
         (select count(*)::int from base)
    into v_rows, v_cnt
    from ordered;

  return jsonb_build_object('rows', v_rows, 'count', v_cnt,
                            'limit', v_lim, 'offset', v_off);
end;
$$;
grant execute on function public.list_treatments(text,text,text,int,int) to authenticated;

-- ── RPC: fetch one treatment ──────────────────────────────────
create or replace function public.get_treatment(
  p_treatment_id text
) returns jsonb
language plpgsql security definer set search_path = public stable as $$
declare
  v_out jsonb;
begin
  if public.app_role() not in ('admin','doctor','therapist') then
    raise exception 'غير مصرح';
  end if;
  select to_jsonb(t.*) || jsonb_build_object('patient_name', p.name)
    into v_out
    from treatments t
    left join patients p on p.patient_id = t.patient_id
   where t.treatment_id = p_treatment_id;
  return v_out;
end;
$$;
grant execute on function public.get_treatment(text) to authenticated;

-- ── Guard: a template that generated treatments can't be deleted ──
-- delete_treatment_template already refuses when template_usage rows
-- exist (every treatment created from a template writes one). The FK
-- from treatments.template_id (no cascade) is the hard backstop.
