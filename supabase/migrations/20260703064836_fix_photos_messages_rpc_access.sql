-- Applied to production 2026-07-03 (RLS security audit).

-- HIGH #1: coaches should only see progress photos of THEIR clients,
-- matching the medical-documents pattern (was: any coach saw all photos)
drop policy if exists coach_read_client_photos on storage.objects;
create policy coach_read_client_photos on storage.objects
  for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(objects.name))[1]
        and (p.assigned_coach_id = auth.uid() or public.coach_can_view_profile(p.id))
    )
  );

-- HIGH #2: message receiver may flag read but not rewrite content.
-- Column-scoped UPDATE grant: receivers can only touch read_at.
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- MEDIUM #3: lock down SECURITY DEFINER RPCs that were callable by anon and
-- ignored ownership. Revoke anon entirely; ownership checks added in the
-- following migrations.
revoke execute on function public.get_checkin_streak(uuid) from anon;
revoke execute on function public.get_client_checkin_summary(uuid, integer) from anon;
revoke execute on function public.seed_prp_week(uuid, date, text, text) from anon;
revoke execute on function public.recalculate_alignment_streak(uuid) from anon;
revoke execute on function public.get_suitable_exercises(uuid, public.workout_location, text[], public.fitness_level, public.fitness_goal[], integer, text, text[], public.exercise_category, boolean, integer, integer) from anon;

-- MEDIUM #5: stop the two views from running with owner privileges
alter view public.enrollment_summary set (security_invoker = on);
alter view public.v_exercise_filter set (security_invoker = on);
