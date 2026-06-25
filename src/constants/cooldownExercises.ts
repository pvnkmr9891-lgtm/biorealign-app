// src/constants/cooldownExercises.ts
// Curated cooldown exercise library for the manual add-exercise flow on the
// Cool-down section. Defaults are sensible starting points, fully editable
// before adding. See app/(client)/workout-plan.tsx AddExerciseModal.
import type { ExerciseSide } from './warmupExercises';

export interface CooldownExerciseDefault {
  id: string;
  name: string;
  defaultSets: number;
  defaultReps: number | null;
  defaultSide: ExerciseSide;
  defaultHoldSecs: number | null;
  defaultRestSecs: number;
}

export const COOLDOWN_EXERCISES: CooldownExerciseDefault[] = [
  { id: 'box_breathing_4_counts_in_4_hold_4_out_4_hold', name: 'Box breathing (4 counts in, 4 hold, 4 out, 4 hold)', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 60, defaultRestSecs: 0 },
  { id: 'box_breathing_butterfly_stretch', name: 'Box breathing + butterfly stretch', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 45, defaultRestSecs: 0 },
  { id: 'box_breathing_standing_forward_fold', name: 'Box breathing + standing forward fold', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 45, defaultRestSecs: 0 },
  { id: 'child_s_pose', name: "Child's pose", defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 30, defaultRestSecs: 0 },
  { id: 'cross_body_shoulder_stretch', name: 'Cross-body shoulder stretch', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 20, defaultRestSecs: 10 },
  { id: 'doorway_chest_stretch', name: 'Doorway chest stretch', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 20, defaultRestSecs: 10 },
  { id: 'doorway_pec_stretch', name: 'Doorway pec stretch', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 20, defaultRestSecs: 10 },
  { id: 'eye_rest_box_breathing', name: 'Eye rest + box breathing', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 60, defaultRestSecs: 0 },
  { id: 'hamstring_stretch', name: 'Hamstring stretch', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 25, defaultRestSecs: 10 },
  { id: 'knee_to_chest_stretch', name: 'Knee-to-chest stretch', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 20, defaultRestSecs: 10 },
  { id: 'levator_scapulae_stretch', name: 'Levator scapulae stretch', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 20, defaultRestSecs: 10 },
  { id: 'lying_lumbar_extension_stretch_gentle', name: 'Lying lumbar extension stretch (gentle)', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 20, defaultRestSecs: 10 },
  { id: 'neck_side_stretch', name: 'Neck side stretch', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 20, defaultRestSecs: 10 },
  { id: 'seated_spinal_twist_gentle', name: 'Seated spinal twist (gentle)', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 20, defaultRestSecs: 10 },
  { id: 'standing_forward_fold_gentle', name: 'Standing forward fold (gentle)', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 30, defaultRestSecs: 0 },
  { id: 'standing_forward_fold_gentle_hands_on_desk', name: 'Standing forward fold (gentle, hands on desk)', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 30, defaultRestSecs: 0 },
  { id: 'standing_forward_fold_box_breathing', name: 'Standing forward fold + box breathing', defaultSets: 1, defaultReps: null, defaultSide: 'na', defaultHoldSecs: 45, defaultRestSecs: 0 },
  { id: 'standing_quad_stretch', name: 'Standing quad stretch', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 20, defaultRestSecs: 10 },
  { id: 'upper_trap_stretch', name: 'Upper trap stretch', defaultSets: 1, defaultReps: null, defaultSide: 'right', defaultHoldSecs: 20, defaultRestSecs: 10 },
];
