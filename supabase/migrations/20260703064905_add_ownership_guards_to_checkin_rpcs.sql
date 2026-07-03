-- Applied to production 2026-07-03 (RLS security audit).
-- Any authenticated user could read any client's check-in data by UUID via
-- these SECURITY DEFINER RPCs. Adds a shared authorization check.

-- Shared authorization check: caller is the client, their assigned coach,
-- an active-enrollment coach, or an admin.
create or replace function public.can_access_client(p_client_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    auth.uid() = p_client_id
    or public.get_my_role() = 'admin'
    or exists (select 1 from profiles where id = p_client_id and assigned_coach_id = auth.uid())
    or public.coach_can_view_profile(p_client_id);
$$;
revoke execute on function public.can_access_client(uuid) from anon;

create or replace function public.get_checkin_streak(p_client_id uuid)
returns integer language plpgsql security definer set search_path = public as $function$
DECLARE
  streak int := 0;
  check_date date := CURRENT_DATE;
  has_checkin boolean;
BEGIN
  IF NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM daily_checkins WHERE client_id = p_client_id AND date = check_date
    ) INTO has_checkin;
    EXIT WHEN NOT has_checkin;
    streak := streak + 1;
    check_date := check_date - 1;
  END LOOP;
  RETURN streak;
END;
$function$;

create or replace function public.get_client_checkin_summary(p_client_id uuid, p_days integer default 7)
returns table(checkin_date date, mood integer, energy integer, sleep_hrs numeric, pain_level integer, notes text)
language plpgsql security definer set search_path = public as $function$
BEGIN
  IF NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT dc.date, dc.mood, dc.energy, dc.sleep_hrs, dc.pain_level, dc.notes
  FROM daily_checkins dc
  WHERE dc.client_id = p_client_id AND dc.date >= CURRENT_DATE - p_days
  ORDER BY dc.date DESC;
END;
$function$;
