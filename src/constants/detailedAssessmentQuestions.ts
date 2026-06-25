// Field definitions for the coach-reviewed detailed assessment.
// Distinct from the onboarding assessment — this is deeper, coach-facing
// intake completed only after a coach request is approved.
//
// Stages map 1:1 to jsonb columns on coach_detailed_assessments. The athlete
// toggle (`is_athlete`) is its own relational boolean column on that table
// (not stored in any of these jsonb blobs) so it stays directly queryable —
// see useDetailedAssessment.ts. Stages flagged `athleteOnly` are hidden from
// the stage list entirely when is_athlete is false.

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'select' | 'chips'
  | 'scale'           // 1..max numeric tap-grid (mirrors the pain/energy/sleep selectors in checkin.tsx)
  | 'list'            // predefined chips (optional) + free-text "+ Add" — value is string[]
  | 'toggle'          // Yes/No — value is boolean
  | 'date'            // simple YYYY-MM-DD text entry (no native date-picker dependency in this app)
  | 'number_unit'     // numeric value + a unit toggle (e.g. cm/ft-in, kg/lb) — value is { value: string; unit: string }
  | 'pain_per_item';  // one 1-10 scale per entry of another `list` field on the same stage — value is Record<string, number>

export interface AssessmentField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];     // select/chips options, or predefined chips for `list`
  units?: string[];       // for number_unit
  placeholder?: string;
  helperText?: string;
  max?: number;           // for scale, default 10
  dependsOnKey?: string;  // for pain_per_item — the sibling `list` field whose entries get a pain scale each
  /** This field's value lives on profiles.diet_type, not in the stage jsonb — handled specially by the screen. */
  crossTableProfileDiet?: boolean;
}

export interface AssessmentStageDef {
  key: 'lifestyle' | 'health' | 'nutrition' | 'workstyle' | 'goals' | 'body_metrics' | 'resources' | 'sport_profile' | 'performance';
  title: string;
  subtitle: string;
  icon: string;
  fields: AssessmentField[];
  /** Hidden from the stage list unless the assessment's is_athlete flag is true. */
  athleteOnly?: boolean;
}

export const DETAILED_ASSESSMENT_STAGES: AssessmentStageDef[] = [
  {
    key: 'body_metrics',
    title: 'Body Metrics',
    subtitle: 'Baseline measurements',
    icon: '📏',
    fields: [
      { key: 'height', label: 'Height', type: 'number_unit', units: ['cm', 'ft-in'], placeholder: 'e.g. 175' },
      { key: 'weight', label: 'Weight', type: 'number_unit', units: ['kg', 'lb'], placeholder: 'e.g. 70' },
      { key: 'body_fat_pct', label: 'Body Fat %', type: 'number', placeholder: 'e.g. 18 (optional)' },
      { key: 'resting_heart_rate', label: 'Resting Heart Rate (bpm)', type: 'number', placeholder: 'e.g. 68' },
      { key: 'blood_pressure', label: 'Blood Pressure', type: 'text', placeholder: 'e.g. 120/80' },
      { key: 'mobility_limits', label: 'Mobility Limits', type: 'textarea', placeholder: 'Any restricted ranges of motion...' },
    ],
  },
  {
    key: 'lifestyle',
    title: 'Lifestyle',
    subtitle: 'Your daily rhythm and recovery',
    icon: '🌤️',
    fields: [
      { key: 'sleep_hours', label: 'Average sleep per night (hours)', type: 'number', placeholder: 'e.g. 7' },
      { key: 'sleep_quality', label: 'Sleep quality', type: 'select', options: ['Poor', 'Fair', 'Good', 'Excellent'] },
      { key: 'stress_level', label: 'Stress Level', type: 'scale', max: 10 },
      { key: 'daily_activity', label: 'How active is a typical day (outside workouts)?', type: 'select', options: ['Mostly sedentary', 'Lightly active', 'Moderately active', 'Very active'] },
      { key: 'screen_time', label: 'Daily screen time (hours)', type: 'number', placeholder: 'e.g. 9' },
      { key: 'support_system', label: 'Who supports your fitness routine at home/work?', type: 'textarea', placeholder: 'Family, friends, colleagues...' },
      { key: 'diet_preference', label: 'Diet Preference', type: 'select', options: ['Veg', 'Non-Veg'], crossTableProfileDiet: true },
      { key: 'hydration_level', label: 'Hydration per Day', type: 'scale', max: 13, helperText: '1 = very low intake, 13 = excellent hydration' },
      { key: 'travel_schedule', label: 'Travel Schedule', type: 'textarea', placeholder: 'Frequent travel, time zones, typical trip length...' },
    ],
  },
  {
    key: 'health',
    title: 'Health',
    subtitle: 'Conditions, pain, and medical context',
    icon: '🩺',
    fields: [
      { key: 'past_injuries', label: 'Past Injuries', type: 'list', options: ['ACL Tear', 'Rotator Cuff', 'Lower Back Strain', 'Ankle Sprain', 'Meniscus Tear', 'Shoulder Dislocation'] },
      { key: 'current_pain', label: 'Current Pain (per injury)', type: 'pain_per_item', dependsOnKey: 'past_injuries' },
      { key: 'surgeries', label: 'Surgeries', type: 'list', options: ['Knee Surgery', 'Shoulder Surgery', 'Spinal Surgery', 'Hip Replacement', 'Appendectomy'] },
      { key: 'conditions', label: 'Existing medical conditions', type: 'chips', options: ['None', 'Diabetes', 'Hypertension', 'Thyroid', 'PCOS/PCOD', 'Cardiac', 'Asthma', 'Arthritis'] },
      { key: 'additional_conditions', label: 'Other Medical Conditions', type: 'list', options: [], placeholder: 'Add a condition not listed above' },
      { key: 'allergies', label: 'Allergies', type: 'list', options: ['Peanuts', 'Shellfish', 'Dairy/Lactose', 'Gluten', 'Pollen', 'Dust', 'Pet Dander'] },
      { key: 'medications', label: 'Medications', type: 'list', options: [], placeholder: 'Add a medication' },
      { key: 'pain_areas', label: 'Areas of current pain or discomfort', type: 'chips', options: ['None', 'Neck', 'Lower back', 'Knees', 'Shoulders', 'Hips', 'Ankles'] },
      { key: 'pain_severity', label: 'Pain severity (if any)', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'] },
      { key: 'energy_level', label: 'Typical energy level through the day', type: 'select', options: ['Low all day', 'Dips in afternoon', 'Stable', 'High all day'] },
    ],
  },
  {
    key: 'nutrition',
    title: 'Nutrition',
    subtitle: 'Eating patterns and preferences',
    icon: '🍽️',
    fields: [
      { key: 'diet_type', label: 'Diet preference (detailed)', type: 'select', options: ['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Vegan'] },
      { key: 'meals_per_day', label: 'Meals per day', type: 'number', placeholder: 'e.g. 3' },
      { key: 'food_allergies', label: 'Food allergies or intolerances', type: 'textarea', placeholder: 'e.g. Lactose intolerant, write None' },
      { key: 'eating_out_frequency', label: 'How often do you eat out / order in?', type: 'select', options: ['Rarely', 'A few times a week', 'Daily', 'Multiple times a day'] },
      // Note: a "Supplements" field already lives here as free text. The new
      // Lifestyle spec asked for a Supplements field too — kept as this one
      // single free-text field rather than duplicating it under Lifestyle.
      { key: 'supplements', label: 'Current supplements (if any)', type: 'textarea', placeholder: 'Protein, multivitamins, etc.' },
    ],
  },
  {
    key: 'workstyle',
    title: 'Work Style',
    subtitle: 'How your job shapes your body',
    icon: '💼',
    fields: [
      { key: 'occupation', label: 'Occupation', type: 'text', placeholder: 'e.g. Software Engineer' },
      { key: 'work_hours', label: 'Working hours per day', type: 'number', placeholder: 'e.g. 9' },
      { key: 'posture_type', label: 'Most of your workday is spent...', type: 'select', options: ['Sitting at a desk', 'Standing', 'Walking/moving', 'Mixed'] },
      { key: 'commute_time', label: 'Daily commute time (minutes)', type: 'number', placeholder: 'e.g. 45' },
      { key: 'work_breaks', label: 'Do you take movement breaks during work?', type: 'select', options: ['Never', 'Rarely', 'Sometimes', 'Regularly'] },
      // available_workout_time moved to the Resources stage (relabeled
      // "Session Duration") — existing answers are copied over by migration
      // rather than duplicating the field here.
    ],
  },
  {
    key: 'goals',
    title: 'Goals',
    subtitle: 'What you want to achieve and by when',
    icon: '🎯',
    fields: [
      { key: 'primary_goal', label: 'Primary Goal', type: 'list', options: ['Weight loss', 'Muscle gain', 'Posture correction', 'Pain relief', 'General fitness', 'Athletic performance'] },
      { key: 'secondary_goals', label: 'Secondary Goal', type: 'list', options: ['Better sleep', 'More energy', 'Stress reduction', 'Flexibility', 'Strength', 'Endurance'] },
      { key: 'target_date', label: 'Target Date', type: 'date', helperText: 'e.g. event date, milestone, or personal deadline' },
      { key: 'timeline', label: 'Target timeline (general)', type: 'select', options: ['1 month', '3 months', '6 months', '1 year+'] },
      { key: 'commitment_level', label: 'How many days/week can you commit?', type: 'select', options: ['1-2 days', '3-4 days', '5-6 days', 'Daily'] },
      { key: 'weaknesses', label: 'Weaknesses', type: 'list', options: ['Flexibility', 'Core Strength', 'Balance', 'Endurance', 'Upper Body Strength', 'Lower Body Strength', 'Mobility'] },
      { key: 'strengths', label: 'Strengths', type: 'list', options: ['Flexibility', 'Core Strength', 'Balance', 'Endurance', 'Upper Body Strength', 'Lower Body Strength', 'Mobility'] },
      { key: 'past_attempts', label: 'What have you tried before, and what didn’t work?', type: 'textarea', placeholder: 'Past programs, diets, what stopped you...' },
      { key: 'ideal_outcome', label: 'Describe your ideal outcome in your own words', type: 'textarea', placeholder: 'What would success look like for you?' },
    ],
  },
  {
    key: 'resources',
    title: 'Resources',
    subtitle: 'What you have available to train with',
    icon: '🧰',
    fields: [
      { key: 'available_days_per_week', label: 'Available Days/Week', type: 'number', placeholder: 'e.g. 4' },
      { key: 'available_workout_time', label: 'Session Duration (minutes)', type: 'number', placeholder: 'e.g. 45' },
      { key: 'gym_access', label: 'Gym Access', type: 'toggle' },
      { key: 'equipment_access', label: 'Equipment Access', type: 'textarea', placeholder: 'Dumbbells, resistance bands, full gym, none...' },
    ],
  },
  {
    key: 'sport_profile',
    title: 'Sport Profile',
    subtitle: 'Athlete-specific background',
    icon: '🏆',
    athleteOnly: true,
    fields: [
      { key: 'sport_event', label: 'Sport / Event', type: 'list', options: ['Football', 'Basketball', 'Cricket', 'Tennis', 'Swimming', 'Athletics/Track', 'Badminton', 'Volleyball', 'Boxing', 'Weightlifting'] },
      { key: 'playing_position', label: 'Playing Position', type: 'list', options: [], placeholder: 'Add a position' },
      { key: 'competition_level', label: 'Competition Level', type: 'select', options: ['Recreational', 'Amateur/Club', 'State/National', 'International/Professional'] },
      { key: 'dominant_side', label: 'Dominant Side', type: 'select', options: ['Left', 'Right', 'Ambidextrous'] },
      { key: 'years_experience', label: 'Years Experience', type: 'number', placeholder: 'e.g. 5' },
      { key: 'current_coach_outside', label: 'Current Coach (outside BioRealign, if any)', type: 'text', placeholder: 'Name or club' },
    ],
  },
  {
    key: 'performance',
    title: 'Performance',
    subtitle: 'Athletic performance notes',
    icon: '⚡',
    athleteOnly: true,
    fields: [
      { key: 'best_performance', label: 'Best Performance / PB', type: 'text', placeholder: 'e.g. 100m in 11.4s' },
      { key: 'recent_results', label: 'Recent Results', type: 'textarea' },
      { key: 'speed', label: 'Speed', type: 'text', placeholder: 'Qualitative or quantitative note' },
      { key: 'strength', label: 'Strength', type: 'text', placeholder: 'Qualitative or quantitative note' },
      { key: 'endurance', label: 'Endurance', type: 'text', placeholder: 'Qualitative or quantitative note' },
      { key: 'flexibility', label: 'Flexibility', type: 'text', placeholder: 'Qualitative or quantitative note' },
      { key: 'track_field_access', label: 'Track / Field Access', type: 'toggle' },
      { key: 'tournament', label: 'Upcoming Tournament', type: 'textarea', placeholder: 'Name, date, and any prep deadline' },
    ],
  },
];
