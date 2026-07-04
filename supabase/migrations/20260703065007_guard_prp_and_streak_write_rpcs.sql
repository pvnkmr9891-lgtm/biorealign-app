-- Applied to production 2026-07-03 (RLS security audit).
-- seed_prp_week and recalculate_alignment_streak are SECURITY DEFINER write
-- RPCs that accepted any client UUID. Adds the can_access_client guard;
-- bodies otherwise unchanged from the originals.

CREATE OR REPLACE FUNCTION public.seed_prp_week(p_user_id uuid, p_week_start date, p_training_type text, p_intensity text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec         RECORD;
  v_item_name TEXT;
  v_sets      INT;
  v_reps      INT;
  v_side      TEXT;
  v_hold      INT;
  v_db_type   TEXT;
  v_day       INT;
BEGIN
  IF NOT public.can_access_client(p_user_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  DELETE FROM manual_workout_logs
  WHERE client_id = p_user_id
    AND week_start_date = p_week_start
    AND item_type IN ('warmup','workout','cooldown');

  FOR v_day IN 1..6 LOOP
    v_db_type := CASE p_training_type
      WHEN 'home'   THEN 'home'
      WHEN 'gym'    THEN 'gym'
      WHEN 'hybrid' THEN
        CASE WHEN v_day % 2 = 1 THEN 'hybrid-home' ELSE 'hybrid-gym' END
    END;

    FOR rec IN
      SELECT * FROM prp_exercises
      WHERE  program_id    = '3-PRP'
        AND  training_type = v_db_type
        AND  day_number    = v_day
      ORDER BY
        CASE section WHEN 'warmup' THEN 1 WHEN 'main' THEN 2 ELSE 3 END,
        sort_order
    LOOP
      IF    p_intensity = 'beginner' THEN
        v_sets := rec.beg_sets;  v_reps := rec.beg_reps;
        v_side := rec.beg_side;  v_hold := rec.beg_hold_secs;
      ELSIF p_intensity = 'medium' THEN
        v_sets := rec.med_sets;  v_reps := rec.med_reps;
        v_side := rec.med_side;  v_hold := rec.med_hold_secs;
      ELSE
        v_sets := rec.hard_sets; v_reps := rec.hard_reps;
        v_side := rec.hard_side; v_hold := rec.hard_hold_secs;
      END IF;

      v_item_name := format_prp_exercise_name(
        rec.exercise_name, v_sets, v_reps, v_side, v_hold, null
      );

      INSERT INTO manual_workout_logs (
        client_id, week_start_date, day_number,
        item_type, item_name, item_order, completed
      ) VALUES (
        p_user_id, p_week_start, v_day,
        CASE rec.section
          WHEN 'warmup' THEN 'warmup'
          WHEN 'main'   THEN 'workout'
          ELSE               'cooldown'
        END,
        v_item_name,
        rec.sort_order,
        FALSE
      );
    END LOOP;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_alignment_streak(p_client_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today             date    := CURRENT_DATE;
  v_score             numeric := 0;
  v_last_qualified    date;
  v_current_streak    int;
  v_longest_streak    int;
  v_freeze_banked     boolean;
  v_freeze_used_on    date;
  v_effective_gap     int;
  v_sunday_count      int;
BEGIN
  IF NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO client_streaks (client_id)
  VALUES (p_client_id)
  ON CONFLICT (client_id) DO NOTHING;

  SELECT current_streak, longest_streak, freeze_banked, freeze_used_on, last_qualified_date
  INTO   v_current_streak, v_longest_streak, v_freeze_banked, v_freeze_used_on, v_last_qualified
  FROM   client_streaks
  WHERE  client_id = p_client_id;

  WITH day_logs AS (
    SELECT item_type, completed
    FROM   manual_workout_logs
    WHERE  client_id = p_client_id
      AND  week_start_date::date + (day_number - 1) = v_today
  ),
  cats AS (
    SELECT
      COALESCE(ROUND(100.0 * SUM(CASE WHEN item_type IN ('warmup','workout','cooldown') AND completed THEN 1 ELSE 0 END)::numeric / NULLIF(SUM(CASE WHEN item_type IN ('warmup','workout','cooldown') THEN 1 ELSE 0 END), 0), 0), 0) AS workout_pct,
      COALESCE(ROUND(100.0 * SUM(CASE WHEN item_type = 'water' AND completed THEN 1 ELSE 0 END)::numeric / NULLIF(SUM(CASE WHEN item_type = 'water' THEN 1 ELSE 0 END), 0), 0), 0) AS water_pct,
      COALESCE(ROUND(100.0 * SUM(CASE WHEN item_type = 'food' AND completed THEN 1 ELSE 0 END)::numeric / NULLIF(SUM(CASE WHEN item_type = 'food' THEN 1 ELSE 0 END), 0), 0), 0) AS food_pct
    FROM day_logs
  )
  SELECT ROUND((workout_pct + water_pct + food_pct) / 3.0)
  INTO   v_score
  FROM   cats;

  v_score := COALESCE(v_score, 0);

  IF v_score < 70 THEN
    UPDATE client_streaks SET updated_at = now() WHERE client_id = p_client_id;
    RETURN jsonb_build_object('score', v_score, 'current_streak', v_current_streak, 'freeze_banked', v_freeze_banked, 'action', 'no_change');
  END IF;

  IF v_last_qualified IS NULL THEN
    v_current_streak := 1;
  ELSIF v_last_qualified = v_today THEN
    NULL;
  ELSE
    SELECT COUNT(*) INTO v_sunday_count
    FROM generate_series(v_last_qualified + 1, v_today, '1 day'::interval) AS d
    WHERE EXTRACT(DOW FROM d) = 0;

    v_effective_gap := (v_today - v_last_qualified) - v_sunday_count;

    IF v_effective_gap = 1 THEN
      v_current_streak := v_current_streak + 1;
    ELSIF v_effective_gap = 2 AND v_freeze_banked AND (v_freeze_used_on IS NULL OR v_freeze_used_on < v_last_qualified) THEN
      v_freeze_banked  := false;
      v_freeze_used_on := v_last_qualified + 1;
      v_current_streak := v_current_streak + 1;
    ELSE
      v_current_streak := 1;
    END IF;
  END IF;

  v_last_qualified := v_today;
  v_longest_streak := GREATEST(v_longest_streak, v_current_streak);

  IF v_score >= 100 AND NOT v_freeze_banked THEN
    v_freeze_banked := true;
  END IF;

  UPDATE client_streaks
  SET current_streak = v_current_streak, longest_streak = v_longest_streak,
      freeze_banked = v_freeze_banked, freeze_used_on = v_freeze_used_on,
      last_qualified_date = v_last_qualified, updated_at = now()
  WHERE client_id = p_client_id;

  RETURN jsonb_build_object('score', v_score, 'current_streak', v_current_streak, 'longest_streak', v_longest_streak, 'freeze_banked', v_freeze_banked, 'action', 'updated');
END;
$function$;
