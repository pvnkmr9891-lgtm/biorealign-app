-- Lite-mode manual exercise logging: structured detail fields for warmup/
-- workout/cooldown items the client adds themselves (sets, reps, side,
-- hold time, rest time). Additive only — nullable, existing rows unaffected.
ALTER TABLE manual_workout_logs ADD COLUMN IF NOT EXISTS sets integer;
ALTER TABLE manual_workout_logs ADD COLUMN IF NOT EXISTS reps integer;
ALTER TABLE manual_workout_logs ADD COLUMN IF NOT EXISTS side text;
ALTER TABLE manual_workout_logs ADD COLUMN IF NOT EXISTS hold_secs integer;
ALTER TABLE manual_workout_logs ADD COLUMN IF NOT EXISTS rest_secs integer;
ALTER TABLE manual_workout_logs ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false;

ALTER TABLE manual_workout_logs
  ADD CONSTRAINT manual_workout_logs_side_check
  CHECK (side IS NULL OR side IN ('right', 'left', 'rotation', 'na'));
