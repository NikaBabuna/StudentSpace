-- =============================================================================
-- 0004_recurring_lessons.sql — repeating (recurring) lessons
-- -----------------------------------------------------------------------------
-- Goal: let a tutor define a *recurring schedule* ("every Monday 18:00, 1.5h")
-- and have concrete `lessons` rows generated from it.
--
-- Design decision — MATERIALISE, don't virtualise:
--   A recurring_schedules row only stores the *rule*. Real lessons are still
--   generated as individual `lessons` rows (linked back via recurring_schedule_id).
--   This keeps every existing per-lesson behaviour working unchanged — status
--   (scheduled/completed/missed/cancelled), payment_cycle linkage, makeups
--   (replaces_lesson_id), and soft-delete all operate on a single lesson, exactly
--   as today. The recurrence layer just *creates* those rows for you.
--
-- Scope: weekly recurrence (the only realistic tutoring case). interval_weeks
--   covers "every week" (1), "every other week" (2), etc. Multiple weekdays =
--   multiple schedule rows (one slot each) — which is also the most intuitive UI.
--
-- Idempotent + safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. recurring_schedules — one weekly slot for a class
-- -----------------------------------------------------------------------------
create table if not exists public.recurring_schedules (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid not null references public.classes (id) on delete cascade,
  created_by      uuid not null references public.users (id),

  -- The slot, expressed as local wall-clock in `timezone`:
  weekday         smallint not null check (weekday between 0 and 6), -- 0=Sun .. 6=Sat (Postgres DOW)
  start_time      time     not null,                                 -- e.g. 18:00
  duration_hours  numeric  not null check (duration_hours > 0),
  timezone        text     not null default 'Asia/Tbilisi',         -- interprets start_time -> UTC

  -- Recurrence cadence + window:
  interval_weeks  smallint not null default 1 check (interval_weeks >= 1), -- 1=weekly, 2=biweekly...
  anchor_date     date     not null default current_date,  -- defines the biweekly phase / earliest date
  until_date      date,                                    -- inclusive last date; null = open-ended
  generated_until date,                                    -- watermark: occurrences materialised through here

  active          boolean  not null default true,          -- pause without deleting
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz,

  check (until_date is null or until_date >= anchor_date)
);

comment on table public.recurring_schedules is
  'A weekly recurring lesson slot for a class. Concrete lessons are materialised from it by generate_recurring_lessons().';
comment on column public.recurring_schedules.weekday is 'Postgres DOW: 0=Sunday .. 6=Saturday.';
comment on column public.recurring_schedules.generated_until is
  'How far ahead lessons have been generated. The generator only ever moves forward of this, so deleting a future occurrence is not undone.';

create index if not exists recurring_schedules_class_idx
  on public.recurring_schedules (class_id) where deleted_at is null;
create index if not exists recurring_schedules_active_idx
  on public.recurring_schedules (active) where deleted_at is null and active;

-- -----------------------------------------------------------------------------
-- 2. Link lessons back to the schedule that generated them
-- -----------------------------------------------------------------------------
-- NULL = a one-off lesson (manually scheduled, or a makeup). ON DELETE SET NULL
-- so that hard-deleting a schedule never deletes lesson history — it just detaches.
alter table public.lessons
  add column if not exists recurring_schedule_id uuid
    references public.recurring_schedules (id) on delete set null;

create index if not exists lessons_recurring_schedule_idx
  on public.lessons (recurring_schedule_id) where recurring_schedule_id is not null;

-- One live lesson per (schedule, instant): makes generation race-safe + idempotent.
-- Partial, so it ignores soft-deleted rows and never touches one-off lessons.
create unique index if not exists lessons_recurring_slot_uniq
  on public.lessons (recurring_schedule_id, scheduled_at)
  where recurring_schedule_id is not null and deleted_at is null;

-- -----------------------------------------------------------------------------
-- 3. RLS — mirror the `lessons` policies (member reads, tutor writes)
-- -----------------------------------------------------------------------------
alter table public.recurring_schedules enable row level security;

drop policy if exists recurring_schedules_select on public.recurring_schedules;
drop policy if exists recurring_schedules_insert on public.recurring_schedules;
drop policy if exists recurring_schedules_update on public.recurring_schedules;
drop policy if exists recurring_schedules_delete on public.recurring_schedules;

create policy recurring_schedules_select on public.recurring_schedules
  for select to authenticated
  using (public.is_class_member(class_id));

create policy recurring_schedules_insert on public.recurring_schedules
  for insert to authenticated
  with check (public.is_class_tutor(class_id));

create policy recurring_schedules_update on public.recurring_schedules
  for update to authenticated
  using (public.is_class_tutor(class_id))
  with check (public.is_class_tutor(class_id));

create policy recurring_schedules_delete on public.recurring_schedules
  for delete to authenticated
  using (public.is_class_tutor(class_id));

-- -----------------------------------------------------------------------------
-- 4. generate_recurring_lessons() — materialise lessons from a schedule
-- -----------------------------------------------------------------------------
-- Generates `scheduled` lessons from the schedule's watermark forward to
-- min(until_date, today + horizon). Idempotent: never creates a slot that
-- already exists, and never reaches back before `generated_until` — so a future
-- occurrence you deleted stays deleted. Returns the number of lessons created.
--
-- SECURITY INVOKER (default): runs under the caller's RLS. A tutor calling it via
-- RPC can only generate for their own classes (lessons_insert = is_class_tutor);
-- a cron job running as service_role bypasses RLS and can generate for all.
create or replace function public.generate_recurring_lessons(
  p_schedule_id   uuid,
  p_horizon_weeks integer default 8
)
returns integer
language plpgsql
as $$
declare
  s         public.recurring_schedules;
  v_first   date;      -- first occurrence on/after anchor_date landing on `weekday`
  v_from    date;      -- earliest date to actually insert (never past, never behind watermark)
  v_to      date;      -- last date to generate
  v_count   integer := 0;
begin
  select * into s from public.recurring_schedules where id = p_schedule_id;
  if not found or s.deleted_at is not null or not s.active then
    return 0;
  end if;

  -- Snap the anchor forward to the target weekday (0..6 = Sun..Sat).
  v_first := s.anchor_date
           + (((s.weekday - extract(dow from s.anchor_date)::int) + 7) % 7);

  v_to := least(
    coalesce(s.until_date, 'infinity'::date),
    current_date + (p_horizon_weeks * 7)
  );

  -- Start from the first occurrence, but never in the past and never behind the
  -- watermark (so deleted future occurrences are not resurrected).
  v_from := greatest(v_first, current_date, coalesce(s.generated_until + 1, v_first));

  if v_from <= v_to then
    with candidate as (
      -- Stepping from v_first by N weeks keeps the correct weekday + biweekly phase.
      select gd::date as occ_date
      from generate_series(v_first::timestamp, v_to::timestamp,
                           make_interval(weeks => s.interval_weeks::int)) as gd
      where gd::date >= v_from
    ),
    ins as (
      insert into public.lessons (class_id, scheduled_at, duration_hours, recurring_schedule_id)
      select s.class_id,
             (c.occ_date::timestamp + s.start_time) at time zone s.timezone, -- local -> timestamptz
             s.duration_hours,
             s.id
      from candidate c
      where not exists (
        select 1 from public.lessons l
        where l.recurring_schedule_id = s.id
          and l.scheduled_at = (c.occ_date::timestamp + s.start_time) at time zone s.timezone
          and l.deleted_at is null
      )
      on conflict do nothing  -- race backstop against lessons_recurring_slot_uniq
      returning 1
    )
    select count(*) into v_count from ins;
  end if;

  -- Advance the watermark even when nothing was inserted, so we don't re-scan.
  update public.recurring_schedules
    set generated_until = greatest(v_to, coalesce(generated_until, v_to))
    where id = s.id;

  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. clear_future_recurring_lessons() — for editing/pausing a series
-- -----------------------------------------------------------------------------
-- Soft-deletes the schedule's *untouched future* lessons (still `scheduled`,
-- from p_from onward) and rewinds the watermark, so the app can: edit the rule,
-- then call generate_recurring_lessons() again to re-lay future occurrences.
-- Past/completed/missed lessons are never affected. Returns rows cleared.
create or replace function public.clear_future_recurring_lessons(
  p_schedule_id uuid,
  p_from        timestamptz default now()
)
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  update public.lessons
    set deleted_at = now()
    where recurring_schedule_id = p_schedule_id
      and deleted_at is null
      and status = 'scheduled'
      and scheduled_at >= p_from;
  get diagnostics v_count = row_count;

  update public.recurring_schedules
    set generated_until = (p_from at time zone recurring_schedules.timezone)::date - 1
    where id = p_schedule_id;

  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. generate_all_recurring_lessons() — roll the horizon forward (cron/maintenance)
-- -----------------------------------------------------------------------------
-- Calls the generator for every active schedule. Intended for a scheduled job
-- (pg_cron / Edge Function as service_role) so open-ended schedules keep ~horizon
-- weeks of lessons populated. Returns total lessons created.
create or replace function public.generate_all_recurring_lessons(
  p_horizon_weeks integer default 8
)
returns integer
language plpgsql
as $$
declare
  r       record;
  v_total integer := 0;
begin
  for r in
    select id from public.recurring_schedules
    where active and deleted_at is null
      and (until_date is null or until_date >= current_date)
  loop
    v_total := v_total + public.generate_recurring_lessons(r.id, p_horizon_weeks);
  end loop;
  return v_total;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Grants — match the existing helper-function pattern
-- -----------------------------------------------------------------------------
revoke all on function public.generate_recurring_lessons(uuid, integer) from public;
revoke all on function public.clear_future_recurring_lessons(uuid, timestamptz) from public;
revoke all on function public.generate_all_recurring_lessons(integer) from public;

grant execute on function public.generate_recurring_lessons(uuid, integer)        to authenticated, service_role;
grant execute on function public.clear_future_recurring_lessons(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.generate_all_recurring_lessons(integer)          to service_role;

-- =============================================================================
-- Rollback (manual):
--   drop function if exists public.generate_all_recurring_lessons(integer);
--   drop function if exists public.clear_future_recurring_lessons(uuid, timestamptz);
--   drop function if exists public.generate_recurring_lessons(uuid, integer);
--   alter table public.lessons drop column if exists recurring_schedule_id;
--   drop table if exists public.recurring_schedules;
-- =============================================================================
