-- Applied to production 2026-07-03 (RLS security audit).

-- Trigger functions: revoke from every API role explicitly (Supabase grants
-- EXECUTE to anon+authenticated directly, not only via PUBLIC). Triggers keep
-- firing — grants only govern direct REST /rpc calls.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.handle_new_user()',
    'public.protect_profile_privileges()',
    'public.notify_on_assessment_submit()',
    'public.notify_plan_published()',
    'public.set_updated_at()',
    'public.update_plan_updated_at()',
    'public.exercises_update_search_vector()'
  ]
  loop
    execute format('revoke execute on function %s from anon, authenticated, public', fn);
  end loop;

  -- also strip anon from the app RPCs' companion grants left over
  foreach fn in array array[
    'public.get_client_checkin_summary(uuid, integer)',
    'public.seed_prp_week(uuid, date, text, text)',
    'public.recalculate_alignment_streak(uuid)'
  ]
  loop
    execute format('revoke execute on function %s from anon', fn);
  end loop;
end $$;
