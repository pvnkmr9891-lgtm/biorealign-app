-- rebuild_alignment_streak: recomputes streak from full history for a client.
-- Fixes the issue where recalculate_alignment_streak only advances from stored state,
-- missing retroactive days that were logged before the function was first called.

CREATE OR REPLACE FUNCTION rebuild_alignment_streak(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date          date;
  v_score         numeric;
  v_streak        int  := 0;
  v_longest       int  := 0;
  v_last_qual     date := null;
  v_freeze_banked bool := false;
  v_freeze_used   date := null;
  v_gap           int;
BEGIN
  -- Walk every logged date (Mon–Sat only) in chronological order,
  -- computing alignment score = avg(workout%, water%, food%)
  FOR v_date, v_score IN
    SELECT
      day_date,
      ROUND(
        (
          COALESCE(
            100.0 * SUM(CASE WHEN item_type IN ('warmup','workout','cooldown') AND completed THEN 1 ELSE 0 END)
              / NULLIF(SUM(CASE WHEN item_type IN ('warmup','workout','cooldown') THEN 1 ELSE 0 END), 0),
            0
          ) +
          COALESCE(
            100.0 * SUM(CASE WHEN item_type = 'water' AND completed THEN 1 ELSE 0 END)
              / NULLIF(SUM(CASE WHEN item_type = 'water' THEN 1 ELSE 0 END), 0),
            0
          ) +
          COALESCE(
            100.0 * SUM(CASE WHEN item_type = 'food' AND completed THEN 1 ELSE 0 END)
              / NULLIF(SUM(CASE WHEN item_type = 'food' THEN 1 ELSE 0 END), 0),
            0
          )
        ) / 3
      ) AS score
    FROM (
      SELECT
        (week_start_date::date + (day_number - 1)) AS day_date,
        item_type, completed
      FROM manual_workout_logs
      WHERE client_id = p_client_id
        AND day_number IS NOT NULL
        AND day_number BETWEEN 1 AND 6
    ) sub
    WHERE EXTRACT(DOW FROM day_date) <> 0  -- skip Sundays
    GROUP BY day_date
    ORDER BY day_date
  LOOP
    IF v_score >= 70 THEN
      IF v_last_qual IS NULL THEN
        v_streak := 1;
      ELSE
        -- Count non-Sunday days between last qualifying day and today (exclusive)
        SELECT COUNT(*) INTO v_gap
        FROM generate_series(v_last_qual + 1, v_date - 1, '1 day'::interval) gs(d)
        WHERE EXTRACT(DOW FROM gs.d) <> 0;

        IF v_gap = 0 THEN
          v_streak := v_streak + 1;  -- consecutive (only Sundays or no gap)
        ELSE
          v_streak := 1;             -- gap breaks streak
        END IF;
      END IF;

      -- Bank a freeze on 100% days
      IF v_score = 100 THEN v_freeze_banked := true; END IF;
      v_last_qual := v_date;
      IF v_streak > v_longest THEN v_longest := v_streak; END IF;

    ELSIF v_freeze_banked AND v_last_qual IS NOT NULL THEN
      -- Use banked freeze to survive one missed day
      v_freeze_banked := false;
      v_freeze_used   := v_date;

    ELSE
      v_streak := 0;
    END IF;
  END LOOP;

  -- Upsert result
  INSERT INTO client_streaks (
    client_id, current_streak, longest_streak,
    freeze_banked, freeze_used_on, last_qualified_date, updated_at
  )
  VALUES (
    p_client_id, v_streak, v_longest,
    v_freeze_banked, v_freeze_used, v_last_qual, now()
  )
  ON CONFLICT (client_id) DO UPDATE
    SET current_streak      = EXCLUDED.current_streak,
        longest_streak      = EXCLUDED.longest_streak,
        freeze_banked       = EXCLUDED.freeze_banked,
        freeze_used_on      = EXCLUDED.freeze_used_on,
        last_qualified_date = EXCLUDED.last_qualified_date,
        updated_at          = EXCLUDED.updated_at;

  RETURN jsonb_build_object(
    'current_streak',      v_streak,
    'longest_streak',      v_longest,
    'freeze_banked',       v_freeze_banked,
    'last_qualified_date', v_last_qual
  );
END;
$$;
