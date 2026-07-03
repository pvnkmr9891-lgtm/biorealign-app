-- Applied to production 2026-07-03 (RLS security audit).
-- CREATE OR REPLACE re-grants EXECUTE to PUBLIC by default, which had
-- resurfaced anon access on replaced functions. Strip PUBLIC and re-grant
-- to authenticated only.

-- Trigger-only functions: never called via the REST API. Revoke from
-- everyone; triggers still fire (they run as part of the triggering stmt).
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.protect_profile_privileges() from public;
revoke execute on function public.notify_on_assessment_submit() from public;
revoke execute on function public.notify_plan_published() from public;
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.update_plan_updated_at() from public;
revoke execute on function public.exercises_update_search_vector() from public;

-- App-callable RPCs + policy helpers: strip the default PUBLIC grant (which
-- is what let anon in) and re-grant to authenticated only.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.get_checkin_streak(uuid)',
    'public.get_client_checkin_summary(uuid, integer)',
    'public.seed_prp_week(uuid, date, text, text)',
    'public.recalculate_alignment_streak(uuid)',
    'public.get_suitable_exercises(uuid, public.workout_location, text[], public.fitness_level, public.fitness_goal[], integer, text, text[], public.exercise_category, boolean, integer, integer)',
    'public.can_access_client(uuid)',
    'public.coach_can_view_profile(uuid)',
    'public.coach_can_update_profile(uuid)',
    'public.get_my_role()',
    'public.get_user_role(uuid)'
  ]
  loop
    execute format('revoke execute on function %s from public', fn);
    execute format('revoke execute on function %s from anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
