-- Applied to production 2026-07-03 (RLS security audit).
-- CRITICAL fix: profiles had RLS disabled with full anon CRUD grants —
-- anyone with the (public) anon key could read every user, modify any row,
-- or self-escalate to admin.

-- ============================================================
-- 1. Recursion-safe helpers (SECURITY DEFINER so policies on
--    profiles can check enrollments/coach_requests without RLS
--    bouncing back into profiles)
-- ============================================================
create or replace function public.coach_can_view_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments e
    where e.client_id = p_profile_id and e.coach_id = auth.uid() and e.status = 'active'
  ) or exists (
    select 1 from coach_requests cr
    where cr.client_id = p_profile_id and cr.coach_id = auth.uid() and cr.status in ('pending','approved')
  );
$$;

create or replace function public.coach_can_update_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from coach_requests cr
    where cr.client_id = p_profile_id and cr.coach_id = auth.uid() and cr.status = 'approved'
  );
$$;

revoke execute on function public.coach_can_view_profile(uuid) from anon;
revoke execute on function public.coach_can_update_profile(uuid) from anon;

-- ============================================================
-- 2. Privilege-escalation guard: only admins may change role;
--    assigned_coach_id may change only via admin, a coach
--    claiming the client (setting it to their own id), or an
--    unassign (null). auth.uid() is null for service-role calls
--    (edge functions), which stay unrestricted.
-- ============================================================
create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.get_my_role() = 'admin' then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'changing role is not allowed';
  end if;
  if new.assigned_coach_id is distinct from old.assigned_coach_id
     and new.assigned_coach_id is not null
     and new.assigned_coach_id <> auth.uid() then
    raise exception 'invalid coach assignment';
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_profile_privileges on public.profiles;
create trigger trg_protect_profile_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileges();

-- ============================================================
-- 3. RLS policies
-- ============================================================
alter table public.profiles enable row level security;

create policy profiles_own_select on public.profiles
  for select using (id = auth.uid());

create policy profiles_own_insert on public.profiles
  for insert with check (id = auth.uid());

create policy profiles_own_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- clients browse the coach directory; rehab flow looks up admin ids
create policy profiles_read_staff on public.profiles
  for select using (role in ('coach','admin'));

create policy profiles_coach_read_clients on public.profiles
  for select using (assigned_coach_id = auth.uid() or public.coach_can_view_profile(id));

create policy profiles_coach_update_clients on public.profiles
  for update
  using (assigned_coach_id = auth.uid() or public.coach_can_update_profile(id))
  with check (assigned_coach_id = auth.uid() or public.coach_can_update_profile(id));

create policy profiles_admin_all on public.profiles
  for all using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- ============================================================
-- 4. Grants: anon gets nothing; authenticated loses footguns
--    (TRUNCATE is not RLS-checked!)
-- ============================================================
revoke all on public.profiles from anon;
revoke truncate, references, trigger on public.profiles from authenticated;
revoke delete on public.profiles from authenticated;
