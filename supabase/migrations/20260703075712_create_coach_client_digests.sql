-- Applied to production 2026-07-03 (coach AI weekly digest feature).
-- One cached digest per coach+client+week, written by the
-- coach-weekly-digest edge function with the caller's JWT.

create table public.coach_client_digests (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  summary text not null,
  wins jsonb not null default '[]'::jsonb,
  concerns jsonb not null default '[]'::jsonb,
  suggested_message text,
  model text,
  created_at timestamptz not null default now(),
  unique (coach_id, client_id, week_start)
);

alter table public.coach_client_digests enable row level security;

-- Coach reads/writes own digests, only for clients they can access
create policy digests_coach_own on public.coach_client_digests
  for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and public.coach_can_view_profile(client_id));

create policy digests_admin_all on public.coach_client_digests
  for all using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

revoke all on public.coach_client_digests from anon;
revoke truncate, references, trigger on public.coach_client_digests from authenticated;
