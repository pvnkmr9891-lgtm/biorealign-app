-- Lite-mode "Need a Coach?" flow: client browses coaches, requests one,
-- coach approves/declines, approval unlocks a 5-stage detailed assessment.
-- Deliberately NOT reusing enrollments/enrollment_requests — those FK to
-- programs (program_id NOT NULL), which is empty/gated off in Lite mode.
-- This is additive only; nothing existing is touched.

-- ── Coach-facing bio fields (nullable, populated for existing coach rows) ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_experience integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialties text[];

-- ── Coach requests ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
  message      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

-- One pending request per client at a time
CREATE UNIQUE INDEX IF NOT EXISTS coach_requests_one_pending_per_client
  ON coach_requests (client_id) WHERE (status = 'pending');

CREATE INDEX IF NOT EXISTS coach_requests_coach_idx ON coach_requests (coach_id, status);

ALTER TABLE coach_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage their own requests" ON coach_requests
  FOR ALL USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Coaches view and respond to their requests" ON coach_requests
  FOR ALL USING (auth.uid() = coach_id) WITH CHECK (auth.uid() = coach_id);

-- ── Detailed assessment (5 stages: lifestyle, health, nutrition, workstyle, goals) ──
CREATE TABLE IF NOT EXISTS coach_detailed_assessments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'reviewed')),
  current_stage integer NOT NULL DEFAULT 1,
  lifestyle     jsonb,
  health        jsonb,
  nutrition     jsonb,
  workstyle     jsonb,
  goals         jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  submitted_at  timestamptz,
  reviewed_at   timestamptz,
  reviewed_by   uuid REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE coach_detailed_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage their own detailed assessment" ON coach_detailed_assessments
  FOR ALL USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Coaches view their clients' detailed assessment" ON coach_detailed_assessments
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches update review fields" ON coach_detailed_assessments
  FOR UPDATE USING (auth.uid() = coach_id);

-- ── Seed bio content for the two existing coach accounts ──────────────
UPDATE profiles SET
  bio = 'Arjun specialises in posture correction and strength rebuilding for desk-bound professionals. He blends biomechanics assessment with progressive overload programming to fix root-cause movement faults, not just symptoms.',
  years_experience = 7,
  specialties = ARRAY['Posture Correction', 'Strength Training', 'Corporate Wellness']
WHERE id = '087de144-ac95-4c80-8d64-85ad5947bf70';

UPDATE profiles SET
  bio = 'Priya focuses on sustainable fat loss and metabolic health, combining nutrition coaching with low-impact conditioning. She works closely with clients managing PCOS, thyroid, and post-pregnancy recovery goals.',
  years_experience = 5,
  specialties = ARRAY['Weight Management', 'Nutrition Coaching', 'Women''s Health']
WHERE id = 'cd0a55fb-de16-4f37-8d12-befaf9d50556';
