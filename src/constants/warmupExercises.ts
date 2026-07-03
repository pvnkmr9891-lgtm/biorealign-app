// src/constants/warmupExercises.ts
// Curated warm-up exercise library — "select from list" source for the manual
// add-exercise flow. Defaults are sensible starting points; users can edit any
// field before adding. See app/(client)/workout-plan.tsx AddExerciseModal.
export type ExerciseSide = 'right' | 'left' | 'both' | 'rotation' | 'na';

export interface WarmupExerciseDefault {
  id: string;
  name: string;
  defaultSets: number;
  defaultReps: number | null;
  defaultSide: ExerciseSide;
  defaultHoldSecs: number | null;
  defaultRestSecs: number;
}

export const WARMUP_EXERCISES: WarmupExerciseDefault[] = [
  { id: '90_90_breathing_drill', name: '90/90 breathing drill', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 60, defaultRestSecs: 0 },
  { id: 'active_shoulder_abduction_full_pain_free_range', name: 'Active shoulder abduction (full pain-free range)', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'active_shoulder_flexion_full_pain_free_range', name: 'Active shoulder flexion (full pain-free range)', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'agility_ladder_basic_run', name: 'Agility ladder - basic run', defaultSets: 2, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 20, defaultRestSecs: 20 },
  { id: 'animal_walk_bear_crawl', name: 'Animal walk - Bear crawl', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'animal_walk_crab_walk', name: 'Animal walk - Crab walk', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'ankle_circles', name: 'Ankle circles', defaultSets: 1, defaultReps: 10, defaultSide: 'rotation', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'ankle_circles_seated', name: 'Ankle circles (seated)', defaultSets: 1, defaultReps: 10, defaultSide: 'rotation', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'ankle_dorsiflexion_rocks', name: 'Ankle dorsiflexion rocks', defaultSets: 1, defaultReps: 10, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 15 },
  { id: 'ankle_hops_low_amplitude_rhythm_focus', name: 'Ankle hops (low amplitude, rhythm focus)', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'arm_circles', name: 'Arm circles', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'arm_circles_full_range', name: 'Arm circles (full range)', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'band_dislocations', name: 'Band dislocations', defaultSets: 2, defaultReps: 15, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'band_pull_apart', name: 'Band pull-apart', defaultSets: 2, defaultReps: 15, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'band_pull_apart_light_band', name: 'Band pull-apart (light band)', defaultSets: 2, defaultReps: 15, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'band_pull_apart_arm_circles_combo', name: 'Band pull-apart + arm circles combo', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'band_pull_apart_shoulder_cars_combo', name: 'Band pull-apart + shoulder CARs combo', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'bird_dog', name: 'Bird-dog', defaultSets: 2, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'bodyweight_squat_full_range', name: 'Bodyweight squat (full range)', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'bodyweight_squat_no_load', name: 'Bodyweight squat (no load)', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'bodyweight_squat_tempo_3_count_down', name: 'Bodyweight squat (tempo, 3-count down)', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'bodyweight_squat_band_pull_apart_combo', name: 'Bodyweight squat + band pull-apart combo', defaultSets: 2, defaultReps: 15, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'cat_cow', name: 'Cat-cow', defaultSets: 2, defaultReps: 10, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 15 },
  { id: 'cat_cow_floor_or_bench', name: 'Cat-cow (floor or bench)', defaultSets: 2, defaultReps: 10, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 15 },
  { id: 'cone_weave_run_slow', name: 'Cone weave run (slow)', defaultSets: 2, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 20, defaultRestSecs: 20 },
  { id: 'dead_bug_prep', name: 'Dead bug prep', defaultSets: 2, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'dynamic_arm_swings', name: 'Dynamic arm swings', defaultSets: 1, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'dynamic_leg_swings_a_skip_drill', name: 'Dynamic leg swings + A-skip drill', defaultSets: 1, defaultReps: 12, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'dynamic_mobility_flow_full_body', name: 'Dynamic mobility flow (full body)', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 180, defaultRestSecs: 0 },
  { id: 'glute_activation_standing_march', name: 'Glute activation (standing march)', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'glute_bridge_activation', name: 'Glute bridge activation', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'high_knee_drill_dynamic_mobility_flow', name: 'High knee drill + dynamic mobility flow', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 180, defaultRestSecs: 0 },
  { id: 'high_knees_marching', name: 'High knees (marching)', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'hip_circles', name: 'Hip circles', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'hip_circles_leg_swings', name: 'Hip circles + leg swings', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'hula_hoop_waist_twist', name: 'Hula hoop waist twist', defaultSets: 1, defaultReps: 20, defaultSide: 'rotation', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'inchworm', name: 'Inchworm', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'jumping_jacks', name: 'Jumping jacks', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'jumping_jacks_low_impact_step_version', name: 'Jumping jacks (low impact - step version)', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'leg_swings', name: 'Leg swings', defaultSets: 1, defaultReps: 12, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'marching_in_place', name: 'Marching in place', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'marching_in_place_with_arm_drive', name: 'Marching in place with arm drive', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'marching_in_place_with_knee_drive', name: 'Marching in place with knee drive', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'marching_with_arm_swings', name: 'Marching with arm swings', defaultSets: 1, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'neck_circles', name: 'Neck circles', defaultSets: 1, defaultReps: 8, defaultSide: 'rotation', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'neck_side_stretch', name: 'Neck side stretch', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 20, defaultRestSecs: 10 },
  { id: 'pendulum_swings_gentle_gravity_assisted', name: 'Pendulum swings (gentle, gravity-assisted)', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 30, defaultRestSecs: 0 },
  { id: 'recumbent_bike_easy_pace', name: 'Recumbent bike easy pace', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 300, defaultRestSecs: 0 },
  { id: 'recumbent_bike_easy_pace_arms_relaxed', name: 'Recumbent bike easy pace (arms relaxed)', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 300, defaultRestSecs: 0 },
  { id: 'rowing_machine_light_pace', name: 'Rowing machine (light pace)', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 300, defaultRestSecs: 0 },
  { id: 'seated_ankle_circles', name: 'Seated ankle circles', defaultSets: 1, defaultReps: 10, defaultSide: 'rotation', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'seated_arm_circles', name: 'Seated arm circles', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'seated_band_pull_apart', name: 'Seated band pull-apart', defaultSets: 2, defaultReps: 15, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'seated_cat_cow', name: 'Seated cat-cow', defaultSets: 2, defaultReps: 10, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 15 },
  { id: 'seated_cat_cow_chair', name: 'Seated cat-cow (chair)', defaultSets: 2, defaultReps: 10, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 15 },
  { id: 'seated_glute_activation', name: 'Seated glute activation', defaultSets: 1, defaultReps: 10, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 15 },
  { id: 'seated_hip_circles', name: 'Seated hip circles', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'seated_march_warm_up_pace', name: 'Seated march (warm-up pace)', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'seated_marching_chair', name: 'Seated marching (chair)', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'seated_marching_warm_up_pace', name: 'Seated marching (warm-up pace)', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'seated_neck_circles', name: 'Seated neck circles', defaultSets: 1, defaultReps: 8, defaultSide: 'rotation', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'seated_shoulder_rolls', name: 'Seated shoulder rolls', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'shoulder_cars', name: 'Shoulder CARs', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'shoulder_rolls', name: 'Shoulder rolls', defaultSets: 1, defaultReps: 10, defaultSide: 'right', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'sport_general_dynamic_warm_up_flow', name: 'Sport-general dynamic warm-up flow', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 180, defaultRestSecs: 0 },
  { id: 'standing_marching_with_arm_swings', name: 'Standing marching with arm swings', defaultSets: 1, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'standing_neck_circles', name: 'Standing neck circles', defaultSets: 1, defaultReps: 8, defaultSide: 'rotation', defaultHoldSecs: null, defaultRestSecs: 10 },
  { id: 'stationary_bike_easy_pace', name: 'Stationary bike (easy pace)', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 300, defaultRestSecs: 0 },
  { id: 'stationary_bike_easy_pace_2', name: 'Stationary bike easy pace', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 300, defaultRestSecs: 0 },
  { id: 'thoracic_extension_on_foam_roller', name: 'Thoracic extension on foam roller', defaultSets: 2, defaultReps: null, defaultSide: 'rotation', defaultHoldSecs: 20, defaultRestSecs: 15 },
  { id: 'thread_the_needle_thoracic_rotation', name: 'Thread the needle (thoracic rotation)', defaultSets: 2, defaultReps: null, defaultSide: 'rotation', defaultHoldSecs: 20, defaultRestSecs: 15 },
  { id: 'toy_soldier_march', name: 'Toy soldier march', defaultSets: 2, defaultReps: 12, defaultSide: 'na', defaultHoldSecs: null, defaultRestSecs: 20 },
  { id: 'treadmill_brisk_walk', name: 'Treadmill brisk walk', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 300, defaultRestSecs: 0 },
  { id: 'treadmill_easy_walk', name: 'Treadmill easy walk', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 300, defaultRestSecs: 0 },
  { id: 'treadmill_or_bike_easy_pace', name: 'Treadmill or bike easy pace', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 300, defaultRestSecs: 0 },
  { id: 'wrist_circles', name: 'Wrist circles', defaultSets: 1, defaultReps: 10, defaultSide: 'rotation', defaultHoldSecs: null, defaultRestSecs: 10 },
];
