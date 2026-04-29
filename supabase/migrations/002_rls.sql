-- =============================================================================
-- BioRealign — Row Level Security Policies
-- Run AFTER 001_schema.sql
-- =============================================================================

-- Enable RLS on every table
alter table public.profiles         enable row level security;
alter table public.programs         enable row level security;
alter table public.enrollments      enable row level security;
alter table public.sessions         enable row level security;
alter table public.daily_checkins   enable row level security;
alter table public.progress_metrics enable row level security;
alter table public.program_content  enable row level security;
alter table public.messages         enable row level security;

-- =============================================================================
-- profiles
-- =============================================================================

-- Anyone authenticated can read their own profile
create policy "profiles: own read"
  on public.profiles for select
  using (id = auth.uid());

-- Coaches can read their clients' profiles
create policy "profiles: coach read clients"
  on public.profiles for select
  using (
    get_my_role() in ('coach', 'admin')
    and id in (
      select client_id from public.enrollments
      where coach_id = auth.uid()
    )
  );

-- Admins can read all profiles
create policy "profiles: admin read all"
  on public.profiles for select
  using (get_my_role() = 'admin');

-- Users can update only their own profile (excluding role)
create policy "profiles: own update"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- Only admins can change roles
create policy "profiles: admin update role"
  on public.profiles for update
  using (get_my_role() = 'admin');

-- Insert is done by trigger/server (on sign-up), not by client directly
create policy "profiles: insert own"
  on public.profiles for insert
  with check (id = auth.uid());

-- =============================================================================
-- programs (public read, admin write)
-- =============================================================================

create policy "programs: all authenticated read"
  on public.programs for select
  using (auth.role() = 'authenticated' and is_active = true);

create policy "programs: admin read all"
  on public.programs for select
  using (get_my_role() = 'admin');

create policy "programs: admin insert"
  on public.programs for insert
  with check (get_my_role() = 'admin');

create policy "programs: admin update"
  on public.programs for update
  using (get_my_role() = 'admin');

-- =============================================================================
-- enrollments
-- =============================================================================

create policy "enrollments: client own"
  on public.enrollments for select
  using (client_id = auth.uid());

create policy "enrollments: coach own clients"
  on public.enrollments for select
  using (coach_id = auth.uid());

create policy "enrollments: admin all"
  on public.enrollments for select
  using (get_my_role() = 'admin');

create policy "enrollments: admin insert"
  on public.enrollments for insert
  with check (get_my_role() in ('admin', 'coach'));

create policy "enrollments: coach/admin update"
  on public.enrollments for update
  using (coach_id = auth.uid() or get_my_role() = 'admin');

-- =============================================================================
-- sessions
-- =============================================================================

create policy "sessions: client own"
  on public.sessions for select
  using (client_id = auth.uid());

create policy "sessions: coach own"
  on public.sessions for select
  using (coach_id = auth.uid());

create policy "sessions: admin all"
  on public.sessions for select
  using (get_my_role() = 'admin');

create policy "sessions: coach/admin insert"
  on public.sessions for insert
  with check (get_my_role() in ('coach', 'admin'));

create policy "sessions: coach/admin update"
  on public.sessions for update
  using (coach_id = auth.uid() or get_my_role() = 'admin');

-- =============================================================================
-- daily_checkins
-- =============================================================================

create policy "checkins: client own read"
  on public.daily_checkins for select
  using (client_id = auth.uid());

create policy "checkins: coach read clients"
  on public.daily_checkins for select
  using (
    get_my_role() in ('coach', 'admin')
    and client_id in (
      select client_id from public.enrollments where coach_id = auth.uid()
    )
  );

create policy "checkins: admin all"
  on public.daily_checkins for select
  using (get_my_role() = 'admin');

create policy "checkins: client insert"
  on public.daily_checkins for insert
  with check (client_id = auth.uid());

create policy "checkins: client update own"
  on public.daily_checkins for update
  using (client_id = auth.uid());

-- =============================================================================
-- progress_metrics
-- =============================================================================

create policy "metrics: client own"
  on public.progress_metrics for select
  using (client_id = auth.uid());

create policy "metrics: coach read clients"
  on public.progress_metrics for select
  using (
    get_my_role() in ('coach', 'admin')
    and client_id in (
      select client_id from public.enrollments where coach_id = auth.uid()
    )
  );

create policy "metrics: admin all"
  on public.progress_metrics for select
  using (get_my_role() = 'admin');

create policy "metrics: client insert"
  on public.progress_metrics for insert
  with check (client_id = auth.uid());

create policy "metrics: coach/admin insert"
  on public.progress_metrics for insert
  with check (get_my_role() in ('coach', 'admin'));

create policy "metrics: client update own"
  on public.progress_metrics for update
  using (client_id = auth.uid());

-- =============================================================================
-- program_content (read-only for clients/coaches, admin can write)
-- =============================================================================

create policy "content: all authenticated read"
  on public.program_content for select
  using (auth.role() = 'authenticated');

create policy "content: admin insert"
  on public.program_content for insert
  with check (get_my_role() = 'admin');

create policy "content: admin update"
  on public.program_content for update
  using (get_my_role() = 'admin');

create policy "content: admin delete"
  on public.program_content for delete
  using (get_my_role() = 'admin');

-- =============================================================================
-- messages
-- =============================================================================

create policy "messages: sender or receiver read"
  on public.messages for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "messages: admin all"
  on public.messages for select
  using (get_my_role() = 'admin');

create policy "messages: authenticated insert"
  on public.messages for insert
  with check (sender_id = auth.uid());

-- Mark as read — only the receiver can update read_at
create policy "messages: receiver mark read"
  on public.messages for update
  using (receiver_id = auth.uid());
