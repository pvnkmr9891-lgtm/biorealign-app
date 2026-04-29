-- =============================================================================
-- BioRealign — Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Custom types / enums
-- ---------------------------------------------------------------------------
create type user_role        as enum ('client', 'coach', 'admin');
create type enrollment_status as enum ('prospect', 'active', 'paused', 'completed');
create type session_status   as enum ('scheduled', 'completed', 'cancelled', 'no_show');
create type session_type     as enum ('assessment', 'coaching', 'follow_up', 'check_in');
create type content_type     as enum ('video', 'audio', 'article', 'exercise', 'assessment');
create type pillar_type      as enum (
  'activation_mind',
  'body_awareness',
  'training_architecture',
  'performance_recovery',
  'nutrition_lifestyle',
  'goal_progression'
);

-- ---------------------------------------------------------------------------
-- Helper: get current user's role (used in RLS policies)
-- ---------------------------------------------------------------------------
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- 1. profiles  (extends auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'client',
  full_name     text not null,
  phone         text,
  dob           date,
  gender        text check (gender in ('male', 'female', 'other')),
  health_goals  text[] not null default '{}',
  conditions    text[] not null default '{}',
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. programs
-- ---------------------------------------------------------------------------
create table public.programs (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  slug                text not null unique,
  tagline             text not null,
  description         text not null,
  icon_url            text,
  duration_weeks      int not null check (duration_weeks > 0),
  target_conditions   text[] not null default '{}',
  pillars             pillar_type[] not null default '{}',
  is_active           boolean not null default true,
  display_order       int not null default 0,
  created_at          timestamptz not null default now()
);

create index programs_slug_idx  on public.programs (slug);
create index programs_active_idx on public.programs (is_active);

-- ---------------------------------------------------------------------------
-- 3. enrollments
-- ---------------------------------------------------------------------------
create table public.enrollments (
  id             uuid primary key default uuid_generate_v4(),
  client_id      uuid not null references public.profiles(id) on delete cascade,
  program_id     uuid not null references public.programs(id),
  coach_id       uuid references public.profiles(id),
  status         enrollment_status not null default 'prospect',
  current_week   int not null default 1 check (current_week >= 1),
  notes          text,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),

  -- One active enrollment per program per client
  unique (client_id, program_id)
);

create index enrollments_client_idx on public.enrollments (client_id);
create index enrollments_coach_idx  on public.enrollments (coach_id);
create index enrollments_status_idx on public.enrollments (status);

-- ---------------------------------------------------------------------------
-- 4. sessions
-- ---------------------------------------------------------------------------
create table public.sessions (
  id             uuid primary key default uuid_generate_v4(),
  client_id      uuid not null references public.profiles(id) on delete cascade,
  coach_id       uuid not null references public.profiles(id),
  enrollment_id  uuid references public.enrollments(id),
  scheduled_at   timestamptz not null,
  duration_min   int not null default 60 check (duration_min > 0),
  type           session_type not null default 'coaching',
  status         session_status not null default 'scheduled',
  location       text,
  notes_pre      text,
  notes_post     text,
  created_at     timestamptz not null default now()
);

create index sessions_client_idx    on public.sessions (client_id);
create index sessions_coach_idx     on public.sessions (coach_id);
create index sessions_scheduled_idx on public.sessions (scheduled_at);
create index sessions_status_idx    on public.sessions (status);

-- ---------------------------------------------------------------------------
-- 5. daily_checkins
-- ---------------------------------------------------------------------------
create table public.daily_checkins (
  id             uuid primary key default uuid_generate_v4(),
  client_id      uuid not null references public.profiles(id) on delete cascade,
  enrollment_id  uuid references public.enrollments(id),
  date           date not null,
  mood           int not null check (mood between 1 and 10),
  energy         int not null check (energy between 1 and 10),
  sleep_hrs      numeric(4,1) not null check (sleep_hrs between 0 and 24),
  pain_level     int not null check (pain_level between 0 and 10),
  notes          text,
  created_at     timestamptz not null default now(),

  unique (client_id, date)
);

create index checkins_client_idx on public.daily_checkins (client_id);
create index checkins_date_idx   on public.daily_checkins (client_id, date desc);

-- ---------------------------------------------------------------------------
-- 6. progress_metrics
-- ---------------------------------------------------------------------------
create table public.progress_metrics (
  id               uuid primary key default uuid_generate_v4(),
  client_id        uuid not null references public.profiles(id) on delete cascade,
  enrollment_id    uuid references public.enrollments(id),
  recorded_at      timestamptz not null default now(),
  weight_kg        numeric(5,2),
  bmi              numeric(4,1),
  body_fat_pct     numeric(4,1),
  posture_score    int check (posture_score between 0 and 100),
  fitness_score    int check (fitness_score between 0 and 100),
  recovery_score   int check (recovery_score between 0 and 100),
  longevity_score  int check (longevity_score between 0 and 100),
  notes            text
);

create index metrics_client_idx on public.progress_metrics (client_id);
create index metrics_date_idx   on public.progress_metrics (client_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- 7. program_content
-- ---------------------------------------------------------------------------
create table public.program_content (
  id            uuid primary key default uuid_generate_v4(),
  program_id    uuid not null references public.programs(id) on delete cascade,
  week_num      int not null check (week_num >= 1),
  day_num       int check (day_num between 1 and 7),
  title         text not null,
  description   text,
  type          content_type not null,
  content_url   text,
  thumbnail_url text,
  pillar        pillar_type not null,
  duration_min  int,
  order_index   int not null default 0,
  is_required   boolean not null default true,
  created_at    timestamptz not null default now()
);

create index content_program_idx on public.program_content (program_id);
create index content_week_idx    on public.program_content (program_id, week_num, day_num);

-- ---------------------------------------------------------------------------
-- 8. messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id             uuid primary key default uuid_generate_v4(),
  enrollment_id  uuid not null references public.enrollments(id) on delete cascade,
  sender_id      uuid not null references public.profiles(id),
  receiver_id    uuid not null references public.profiles(id),
  body           text not null check (length(trim(body)) > 0),
  sent_at        timestamptz not null default now(),
  read_at        timestamptz,

  check (sender_id <> receiver_id)
);

create index messages_enrollment_idx on public.messages (enrollment_id, sent_at desc);
create index messages_receiver_idx   on public.messages (receiver_id, read_at) where read_at is null;

-- ---------------------------------------------------------------------------
-- View: enrollment_summary (convenience join for dashboard queries)
-- ---------------------------------------------------------------------------
create or replace view public.enrollment_summary as
select
  e.id,
  e.client_id,
  e.coach_id,
  e.status,
  e.current_week,
  e.started_at,
  p.name        as program_name,
  p.slug        as program_slug,
  p.duration_weeks,
  p.tagline     as program_tagline,
  c.full_name   as coach_name,
  c.avatar_url  as coach_avatar
from public.enrollments e
join public.programs p on p.id = e.program_id
left join public.profiles c on c.id = e.coach_id;

-- ---------------------------------------------------------------------------
-- Function: get_streak(client_id) — consecutive check-in days
-- ---------------------------------------------------------------------------
create or replace function public.get_checkin_streak(p_client_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  streak int := 0;
  check_date date := current_date;
begin
  loop
    if exists (
      select 1 from public.daily_checkins
      where client_id = p_client_id and date = check_date
    ) then
      streak := streak + 1;
      check_date := check_date - 1;
    else
      exit;
    end if;
  end loop;
  return streak;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.get_checkin_streak(uuid) to authenticated;
