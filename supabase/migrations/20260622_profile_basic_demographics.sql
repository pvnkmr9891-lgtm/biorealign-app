-- Lite-mode basic demographics: capture height/weight without the curated
-- program assessment. Additive only — no existing columns touched.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg numeric;
