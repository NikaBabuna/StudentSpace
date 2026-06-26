-- =============================================================================
-- 0001_initial_schema.sql  —  StudentSpace baseline schema
-- =============================================================================
-- This file is a hand-reconstructed baseline of the live Supabase schema,
-- derived from the generated types (lib/database.types.ts) and docs/PRODUCT.md.
--
-- PURPOSE: put the schema under version control for review and onboarding.
--
-- IMPORTANT:
--   * The production database ALREADY contains this schema. Do not run this
--     against prod expecting a fresh create — it is documentation + a baseline
--     for a future staging/local environment.
--   * Statements use IF NOT EXISTS so the file is safe to run against an empty
--     database (e.g. a fresh staging project).
--   * RLS is ENABLED in production but the exact policy bodies and the
--     SECURITY DEFINER helper functions (is_class_member, is_class_tutor,
--     is_parent_of, shares_class_with, has_pending_invite_to_class) live only
--     in Supabase. Capture them with `pg_dump --schema-only` when a Postgres
--     client is available, and add them as 0002_rls_policies.sql.
-- =============================================================================

-- ---------- Enums ----------
do $$ begin
  create type public.class_member_role as enum ('tutor', 'student', 'parent', 'employer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invite_role as enum ('tutor', 'student', 'parent', 'employer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invite_status as enum ('pending', 'accepted', 'declined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lesson_status as enum ('scheduled', 'completed', 'missed', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------- users ----------
-- Mirrors auth.users (id matches). Populated by the handle_new_auth_user trigger.
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null,
  bio         text,
  is_employer boolean not null default false,
  timezone    text not null default 'Asia/Tbilisi',
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ---------- classes ----------
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null references public.users (id),
  title       text not null,
  subject     text,
  level       text,
  description text,
  tutor_notes text,
  cycle_hours integer not null default 8,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ---------- class_members ----------
create table if not exists public.class_members (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  role       public.class_member_role not null,
  created_at timestamptz not null default now(),
  unique (class_id, user_id)
);

-- ---------- invites ----------
create table if not exists public.invites (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid not null references public.classes (id) on delete cascade,
  invited_by      uuid not null references public.users (id),
  invited_user_id uuid not null references public.users (id),
  role            public.invite_role not null,
  status          public.invite_status not null default 'pending',
  responded_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------- payment_cycles ----------
create table if not exists public.payment_cycles (
  id               uuid primary key default gen_random_uuid(),
  class_id         uuid not null references public.classes (id) on delete cascade,
  cycle_number     integer not null,
  started_at       timestamptz not null default now(),
  closed_at        timestamptz,
  paid_at          timestamptz,
  payment_amount   numeric,
  payment_currency text
);

-- ---------- lessons ----------
create table if not exists public.lessons (
  id                 uuid primary key default gen_random_uuid(),
  class_id           uuid not null references public.classes (id) on delete cascade,
  payment_cycle_id   uuid references public.payment_cycles (id),
  replaces_lesson_id uuid references public.lessons (id),
  scheduled_at       timestamptz not null,
  duration_hours     numeric not null check (duration_hours > 0),
  status             public.lesson_status not null default 'scheduled',
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  -- payment_cycle_id may only be set once a lesson is completed
  check (payment_cycle_id is null or status = 'completed')
);

-- ---------- homework ----------
create table if not exists public.homework (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  created_by  uuid not null references public.users (id),
  title       text not null,
  description text,
  deadline    timestamptz not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ---------- submissions ----------
create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework (id) on delete cascade,
  student_id  uuid not null references public.users (id),
  attachments jsonb not null default '[]'::jsonb,
  grade       text,
  created_at  timestamptz not null default now()
);

-- ---------- material_groups ----------
create table if not exists public.material_groups (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  created_by uuid not null references public.users (id),
  name       text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- materials ----------
create table if not exists public.materials (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.material_groups (id) on delete cascade,
  class_id        uuid not null references public.classes (id) on delete cascade,
  uploaded_by     uuid not null references public.users (id),
  title           text not null,
  file_url        text not null,
  file_name       text not null,
  file_size_bytes bigint,
  mime_type       text,
  is_pinned       boolean not null default false,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- ---------- messages (immutable in v1) ----------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  author_id  uuid not null references public.users (id),
  body       text not null,
  created_at timestamptz not null default now()
);

-- ---------- parent_students ----------
create table if not exists public.parent_students (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid not null references public.users (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz default now(),
  check (parent_id <> student_id),
  unique (parent_id, student_id)
);

-- ---------- parent_requests ----------
-- NOTE: status is a plain text column in prod (not an enum like the others).
create table if not exists public.parent_requests (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid not null references public.users (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  status     text not null default 'pending',
  created_at timestamptz default now(),
  check (parent_id <> student_id),
  unique (parent_id, student_id)
);
