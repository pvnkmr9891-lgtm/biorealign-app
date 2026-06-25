-- Lite-mode manual nutrition logging: structured detail fields for food
-- items the client adds themselves (quantity, calories, protein, carbs,
-- fat). Additive only — nullable, existing rows unaffected.
ALTER TABLE manual_workout_logs ADD COLUMN IF NOT EXISTS quantity text;
ALTER TABLE manual_workout_logs ADD COLUMN IF NOT EXISTS calories integer;
ALTER TABLE manual_workout_logs ADD COLUMN IF NOT EXISTS protein_g numeric;
ALTER TABLE manual_workout_logs ADD COLUMN IF NOT EXISTS carbs_g numeric;
ALTER TABLE manual_workout_logs ADD COLUMN IF NOT EXISTS fat_g numeric;

-- Buckets a food row into one of the 5 meal-time sections (Morning Drink,
-- Breakfast, Lunch, Evening Snacks, Dinner). item_type stays 'food' for
-- all of them so existing alignment-score queries (filtered on
-- item_type = 'food') keep working unchanged.
ALTER TABLE manual_workout_logs ADD COLUMN IF NOT EXISTS meal_slot text;
