-- Applied to production 2026-07-03 (RLS security audit).

-- #4: coaches of Lite clients (assigned_coach_id, no enrollment row) were
-- invisible in daily_checkins + client_health_profiles. Standardize on
-- coach_can_view_profile (enrollment OR assigned) everywhere.

drop policy if exists "checkins: coach read clients" on public.daily_checkins;
create policy "checkins: coach read clients" on public.daily_checkins
  for select using (
    get_my_role() = any (array['coach','admin'])
    and (public.coach_can_view_profile(client_id) or public.get_my_role() = 'admin')
  );

drop policy if exists "Coach reads client health profile" on public.client_health_profiles;
create policy "Coach reads client health profile" on public.client_health_profiles
  for select using (public.coach_can_view_profile(user_id));

drop policy if exists "Coach updates client health profile" on public.client_health_profiles;
create policy "Coach updates client health profile" on public.client_health_profiles
  for update using (public.coach_can_view_profile(user_id));

-- LOW: prp_exercises had RLS on with zero policies (deny-all to API).
-- It's read-only catalog data; allow authenticated reads so the PRP seed
-- path via get_suitable_exercises/seed_prp_week isn't the only door.
drop policy if exists prp_exercises_read on public.prp_exercises;
create policy prp_exercises_read on public.prp_exercises
  for select to authenticated using (true);

-- LOW: harden remaining mutable search_path functions flagged by advisor
alter function public.set_updated_at() set search_path = public;
alter function public.get_user_role(uuid) set search_path = public;
alter function public.get_my_role() set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.notify_on_assessment_submit() set search_path = public;
alter function public.notify_plan_published() set search_path = public;
alter function public.update_plan_updated_at() set search_path = public;
alter function public.exercises_update_search_vector() set search_path = public;
alter function public.format_prp_exercise_name(text, integer, integer, text, integer, text) set search_path = public;
