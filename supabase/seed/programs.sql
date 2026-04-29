-- =============================================================================
-- BioRealign — Seed Data
-- Run AFTER 001_schema.sql + 002_rls.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 7 Core Programs
-- ---------------------------------------------------------------------------
insert into public.programs
  (name, slug, tagline, description, duration_weeks, target_conditions, pillars, display_order)
values
  (
    'Future Body Reset',
    'future-body-reset',
    'Build a biomechanically strong foundation from childhood',
    'A preventive protocol designed for children and youth to develop optimal posture, movement patterns, and metabolic health before lifestyle damage sets in.',
    12,
    array['poor posture', 'sedentary lifestyle', 'developmental concerns', 'childhood obesity'],
    array['activation_mind', 'body_awareness', 'training_architecture']::pillar_type[],
    1
  ),
  (
    'Metabolic Reversal System',
    'metabolic-reversal-system',
    'Reverse metabolic dysfunction without drugs or surgery',
    'A 16-week precision protocol targeting insulin resistance, visceral fat, and metabolic markers through structured movement, nutrition timing, and lifestyle architecture.',
    16,
    array['type 2 diabetes', 'pre-diabetes', 'obesity', 'metabolic syndrome', 'PCOS', 'fatty liver'],
    array['body_awareness', 'nutrition_lifestyle', 'performance_recovery', 'goal_progression']::pillar_type[],
    2
  ),
  (
    'Posture Recode Protocol',
    'posture-recode-protocol',
    'Structurally realign your body for pain-free movement',
    'An 8-week systematic deconstruction and rebuilding of posture patterns — from spinal alignment to joint centration — using diagnostic assessment and progressive loading.',
    8,
    array['forward head posture', 'rounded shoulders', 'scoliosis', 'kyphosis', 'lordosis', 'chronic back pain'],
    array['body_awareness', 'training_architecture', 'activation_mind']::pillar_type[],
    3
  ),
  (
    'Rebuild & Rehab System',
    'rebuild-rehab-system',
    'Return to full function stronger than before injury',
    'A phased rehabilitation protocol combining movement re-education, progressive load management, and nervous system recalibration for complete injury recovery.',
    10,
    array['sports injuries', 'post-surgery recovery', 'chronic pain', 'joint dysfunction', 'muscle tears'],
    array['body_awareness', 'training_architecture', 'performance_recovery']::pillar_type[],
    4
  ),
  (
    'Corporate Performance Reset',
    'corporate-performance-reset',
    'Peak cognitive and physical performance for leaders',
    'A 6-week workplace wellness protocol targeting desk-related dysfunction, stress physiology, and executive performance through targeted movement, breathwork, and recovery systems.',
    6,
    array['desk posture', 'tech neck', 'burnout', 'chronic fatigue', 'stress', 'poor focus'],
    array['activation_mind', 'performance_recovery', 'nutrition_lifestyle']::pillar_type[],
    5
  ),
  (
    'Peak Performance Lab',
    'peak-performance-lab',
    'Elevate athletic output through precision biomechanics',
    'A 12-week elite performance protocol integrating force output optimisation, movement efficiency, recovery science, and sport-specific programming for competitive athletes.',
    12,
    array['athletic performance', 'sport-specific training', 'performance plateau', 'injury prevention'],
    array['training_architecture', 'performance_recovery', 'goal_progression', 'nutrition_lifestyle']::pillar_type[],
    6
  ),
  (
    'Longevity & Vitality Engine',
    'longevity-vitality-engine',
    'Add life to your years through precision longevity science',
    'A 20-week deep transformation protocol combining epigenetic lifestyle design, movement longevity, mitochondrial health, and hormonal optimisation for adults 40+.',
    20,
    array['aging', 'hormonal decline', 'sarcopenia', 'osteoporosis', 'vitality loss', 'cognitive decline'],
    array['nutrition_lifestyle', 'performance_recovery', 'activation_mind', 'goal_progression']::pillar_type[],
    7
  );

-- ---------------------------------------------------------------------------
-- Sample content for Posture Recode Protocol (Week 1)
-- ---------------------------------------------------------------------------
insert into public.program_content
  (program_id, week_num, day_num, title, description, type, pillar, duration_min, order_index, is_required)
select
  p.id,
  1,
  1,
  'Posture baseline assessment',
  'Full-body postural screening — photograph from front, side, and back. Record baseline measurements.',
  'assessment'::content_type,
  'body_awareness'::pillar_type,
  20,
  1,
  true
from public.programs p where p.slug = 'posture-recode-protocol'

union all

select
  p.id, 1, 1,
  'Diaphragmatic breathing activation',
  'Activate the primary stabiliser. 4-7-8 breathing pattern, supine position, 3 sets of 10 breaths.',
  'exercise'::content_type,
  'activation_mind'::pillar_type,
  15, 2, true
from public.programs p where p.slug = 'posture-recode-protocol'

union all

select
  p.id, 1, 2,
  'Thoracic spine mobility flow',
  'Cat-cow, thoracic rotation on foam roller, quadruped reach. Targets T-spine stiffness from prolonged sitting.',
  'exercise'::content_type,
  'body_awareness'::pillar_type,
  20, 3, true
from public.programs p where p.slug = 'posture-recode-protocol'

union all

select
  p.id, 1, 3,
  'Deep cervical flexor activation',
  'Chin tuck progression: supine → seated → standing wall. Corrects forward head posture pattern.',
  'exercise'::content_type,
  'training_architecture'::pillar_type,
  15, 4, true
from public.programs p where p.slug = 'posture-recode-protocol'

union all

select
  p.id, 1, 4,
  'Scapular setting sequence',
  'Wall slides, prone Y-T-W, serratus anterior activation. Rebuilds shoulder girdle stability.',
  'exercise'::content_type,
  'training_architecture'::pillar_type,
  20, 5, true
from public.programs p where p.slug = 'posture-recode-protocol'

union all

select
  p.id, 1, 5,
  'Understanding your posture pattern',
  'Educational article: What your posture tells you about your nervous system and why structural correction must precede strength training.',
  'article'::content_type,
  'body_awareness'::pillar_type,
  10, 6, false
from public.programs p where p.slug = 'posture-recode-protocol'

union all

select
  p.id, 1, 6,
  'Hip flexor & psoas release',
  'Progressive psoas release sequence. Addresses anterior pelvic tilt that drives lumbar lordosis.',
  'exercise'::content_type,
  'body_awareness'::pillar_type,
  25, 7, true
from public.programs p where p.slug = 'posture-recode-protocol'

union all

select
  p.id, 1, 7,
  'Week 1 active recovery',
  'Light walking 20 min, gentle yoga sun salutation ×3, cold-warm contrast shower protocol.',
  'exercise'::content_type,
  'performance_recovery'::pillar_type,
  35, 8, false
from public.programs p where p.slug = 'posture-recode-protocol';

-- ---------------------------------------------------------------------------
-- Sample content for Peak Performance Lab (Week 1)
-- ---------------------------------------------------------------------------
insert into public.program_content
  (program_id, week_num, day_num, title, description, type, pillar, duration_min, order_index, is_required)
select
  p.id, 1, 1,
  'Athletic movement screening',
  'FMS-style movement assessment: squat, hinge, push, pull, carry. Identify primary compensation patterns.',
  'assessment'::content_type,
  'body_awareness'::pillar_type,
  30, 1, true
from public.programs p where p.slug = 'peak-performance-lab'

union all

select
  p.id, 1, 2,
  'CNS primer: PAP protocol',
  'Post-activation potentiation warm-up. Maximises neural drive before primary training session.',
  'exercise'::content_type,
  'training_architecture'::pillar_type,
  15, 2, true
from public.programs p where p.slug = 'peak-performance-lab'

union all

select
  p.id, 1, 3,
  'Force production baseline: velocity testing',
  'Bar speed measurement across loading spectrum. Establishes force-velocity profile for programming.',
  'assessment'::content_type,
  'training_architecture'::pillar_type,
  45, 3, true
from public.programs p where p.slug = 'peak-performance-lab'

union all

select
  p.id, 1, 4,
  'HRV-guided recovery protocol',
  'Morning HRV measurement, interpretation, and training load adjustment. Sleep architecture optimisation.',
  'exercise'::content_type,
  'performance_recovery'::pillar_type,
  20, 4, true
from public.programs p where p.slug = 'peak-performance-lab';

-- ---------------------------------------------------------------------------
-- Sample progress metrics (for testing the dashboard)
-- Note: Replace '00000000-0000-0000-0000-000000000000' with a real client UUID
-- ---------------------------------------------------------------------------
-- Uncomment and replace UUID after creating your first test client:
--
-- insert into public.progress_metrics
--   (client_id, recorded_at, weight_kg, posture_score, fitness_score, recovery_score, longevity_score)
-- values
--   ('CLIENT_UUID', now() - interval '5 weeks', 82.0, 52, 55, 60, 50),
--   ('CLIENT_UUID', now() - interval '4 weeks', 81.2, 58, 60, 65, 54),
--   ('CLIENT_UUID', now() - interval '3 weeks', 80.5, 63, 64, 70, 58),
--   ('CLIENT_UUID', now() - interval '2 weeks', 79.8, 70, 70, 78, 63),
--   ('CLIENT_UUID', now() - interval '1 week',  79.1, 74, 72, 85, 68);
