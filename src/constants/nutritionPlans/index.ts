// Central lookup for all FBR nutrition plans.
// Structure: diet → age_group → intensity → 18-day NutritionDay[]
// Add new age groups / programs by extending FBR_PLANS below.

import { FBR_AGE6TO8_VEG_BEGINNER }      from './fbr_age6to8_veg_beginner';
import { FBR_AGE6TO8_VEG_MEDIUM }        from './fbr_age6to8_veg_medium';
import { FBR_AGE6TO8_VEG_HARD }          from './fbr_age6to8_veg_hard';
import { FBR_AGE6TO8_NONVEG_BEGINNER }   from './fbr_age6to8_nonveg_beginner';
import { FBR_AGE6TO8_NONVEG_MEDIUM }     from './fbr_age6to8_nonveg_medium';
import { FBR_AGE6TO8_NONVEG_HARD }       from './fbr_age6to8_nonveg_hard';
import { FBR_AGE9TO12_VEG_BEGINNER }     from './fbr_age9to12_veg_beginner';
import { FBR_AGE9TO12_VEG_MEDIUM }       from './fbr_age9to12_veg_medium';
import { FBR_AGE9TO12_VEG_HARD }         from './fbr_age9to12_veg_hard';
import { FBR_AGE9TO12_NONVEG_BEGINNER }  from './fbr_age9to12_nonveg_beginner';
import { FBR_AGE9TO12_NONVEG_MEDIUM }    from './fbr_age9to12_nonveg_medium';
import { FBR_AGE9TO12_NONVEG_HARD }      from './fbr_age9to12_nonveg_hard';

export interface NutritionMeal {
  order:  number;
  label:  string;
  name:   string;
}

export interface NutritionDay {
  day:   number;
  meals: NutritionMeal[];
}

export type DietType     = 'veg' | 'non_veg';
export type AgeGroup     = '6_8' | '9_12';
export type IntensityKey = 'beginner' | 'medium' | 'hard';

const FBR_PLANS: Record<DietType, Record<AgeGroup, Record<IntensityKey, NutritionDay[]>>> = {
  veg: {
    '6_8': {
      beginner: FBR_AGE6TO8_VEG_BEGINNER,
      medium:   FBR_AGE6TO8_VEG_MEDIUM,
      hard:     FBR_AGE6TO8_VEG_HARD,
    },
    '9_12': {
      beginner: FBR_AGE9TO12_VEG_BEGINNER,
      medium:   FBR_AGE9TO12_VEG_MEDIUM,
      hard:     FBR_AGE9TO12_VEG_HARD,
    },
  },
  non_veg: {
    '6_8': {
      beginner: FBR_AGE6TO8_NONVEG_BEGINNER,
      medium:   FBR_AGE6TO8_NONVEG_MEDIUM,
      hard:     FBR_AGE6TO8_NONVEG_HARD,
    },
    '9_12': {
      beginner: FBR_AGE9TO12_NONVEG_BEGINNER,
      medium:   FBR_AGE9TO12_NONVEG_MEDIUM,
      hard:     FBR_AGE9TO12_NONVEG_HARD,
    },
  },
};

/**
 * Returns the correct 18-day rotation for the given combination.
 * Falls back: non_veg → veg if missing; 9_12 → 6_8 if missing; medium/hard → beginner if missing.
 */
export function getFBRNutritionPlan(
  dietType:  DietType     = 'veg',
  ageGroup:  AgeGroup     = '6_8',
  intensity: IntensityKey = 'beginner',
): NutritionDay[] {
  const byDiet = FBR_PLANS[dietType] ?? FBR_PLANS['veg'];
  const byAge  = byDiet[ageGroup]    ?? byDiet['6_8'];
  return byAge[intensity]            ?? byAge['beginner'];
}

/** Derives the FBR age-group key from a date-of-birth string (YYYY-MM-DD or ISO). */
export function getFBRAgeGroup(dob: string | null | undefined): AgeGroup {
  if (!dob) return '6_8';
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age >= 9) return '9_12';
  return '6_8';
}
