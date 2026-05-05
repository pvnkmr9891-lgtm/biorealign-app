import { create } from 'zustand';

// ── Stage types ───────────────────────────────────────────────────────────────

export interface Stage1Data {
  occupation_type: string;
  work_hours_daily: number;
  daily_activity_level: string;
  available_minutes_per_day: number;
  primary_stressor: string;
  previous_coaching: string;
}

export interface PainLocation {
  zone: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface Stage2Data {
  height_cm: number;
  weight_kg: number;
  complaints: string[];
  pain_locations: PainLocation[];
  conditions: string[];
  injuries: string[];
  medications: string;
  energy_morning: number;
  energy_afternoon: number;
  energy_evening: number;
  breathing_quality: string;
}

export interface Stage3Data {
  last_exercise_period: string;
  exercise_history: string[];
  weekly_frequency: number;
  workout_environment: string;
  available_equipment: string[];
  posture_issues: string[];
  movement_limitations: string[];
  pain_during_movement: string[];
  flexibility_score: number;
  balance_score: number;
}

export interface Stage4Data {
  diet_type: string;
  food_allergies: string[];
  meals_per_day: number;
  meal_timing: string;
  hydration_glasses: number;
  caffeine_cups: number;
  alcohol_frequency: string;
  sleep_hours_avg: number;
  sleep_quality_avg: number;
  stress_level: number;
  recovery_tools: string[];
}

export interface Stage5Data {
  primary_goal: string;
  secondary_goals: string[];
  timeline: string;
  commitment_level: string;
  past_blockers: string[];
  ideal_outcome: string;
  coach_notes_from_client: string;
}

// ── Default values ────────────────────────────────────────────────────────────

const defaultStage1: Stage1Data = {
  occupation_type: '',
  work_hours_daily: 8,
  daily_activity_level: '',
  available_minutes_per_day: 30,
  primary_stressor: '',
  previous_coaching: '',
};

const defaultStage2: Stage2Data = {
  height_cm: 0,
  weight_kg: 0,
  complaints: [],
  pain_locations: [],
  conditions: [],
  injuries: [],
  medications: '',
  energy_morning: 5,
  energy_afternoon: 5,
  energy_evening: 5,
  breathing_quality: '',
};

const defaultStage3: Stage3Data = {
  last_exercise_period: '',
  exercise_history: [],
  weekly_frequency: 0,
  workout_environment: '',
  available_equipment: [],
  posture_issues: [],
  movement_limitations: [],
  pain_during_movement: [],
  flexibility_score: 5,
  balance_score: 5,
};

const defaultStage4: Stage4Data = {
  diet_type: '',
  food_allergies: [],
  meals_per_day: 3,
  meal_timing: '',
  hydration_glasses: 6,
  caffeine_cups: 2,
  alcohol_frequency: '',
  sleep_hours_avg: 7,
  sleep_quality_avg: 5,
  stress_level: 5,
  recovery_tools: [],
};

const defaultStage5: Stage5Data = {
  primary_goal: '',
  secondary_goals: [],
  timeline: '',
  commitment_level: '',
  past_blockers: [],
  ideal_outcome: '',
  coach_notes_from_client: '',
};

// ── Store interface ───────────────────────────────────────────────────────────

interface AssessmentStore {
  currentStage: number; // 1–5, then 'photos', 'complete'
  stage1: Stage1Data;
  stage2: Stage2Data;
  stage3: Stage3Data;
  stage4: Stage4Data;
  stage5: Stage5Data;
  isSubmitting: boolean;
  submitError: string | null;

  // Setters
  setStage1: (data: Partial<Stage1Data>) => void;
  setStage2: (data: Partial<Stage2Data>) => void;
  setStage3: (data: Partial<Stage3Data>) => void;
  setStage4: (data: Partial<Stage4Data>) => void;
  setStage5: (data: Partial<Stage5Data>) => void;

  // Navigation
  setCurrentStage: (stage: number) => void;

  // State control
  setSubmitting: (val: boolean) => void;
  setSubmitError: (err: string | null) => void;
  reset: () => void;

  // Computed
  getPayload: () => object;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAssessmentStore = create<AssessmentStore>((set, get) => ({
  currentStage: 1,
  stage1: { ...defaultStage1 },
  stage2: { ...defaultStage2 },
  stage3: { ...defaultStage3 },
  stage4: { ...defaultStage4 },
  stage5: { ...defaultStage5 },
  isSubmitting: false,
  submitError: null,

  setStage1: (data) => set((s) => ({ stage1: { ...s.stage1, ...data } })),
  setStage2: (data) => set((s) => ({ stage2: { ...s.stage2, ...data } })),
  setStage3: (data) => set((s) => ({ stage3: { ...s.stage3, ...data } })),
  setStage4: (data) => set((s) => ({ stage4: { ...s.stage4, ...data } })),
  setStage5: (data) => set((s) => ({ stage5: { ...s.stage5, ...data } })),

  setCurrentStage: (stage) => set({ currentStage: stage }),
  setSubmitting: (val) => set({ isSubmitting: val }),
  setSubmitError: (err) => set({ submitError: err }),

  reset: () =>
    set({
      currentStage: 1,
      stage1: { ...defaultStage1 },
      stage2: { ...defaultStage2 },
      stage3: { ...defaultStage3 },
      stage4: { ...defaultStage4 },
      stage5: { ...defaultStage5 },
      isSubmitting: false,
      submitError: null,
    }),

  getPayload: () => {
    const { stage1, stage2, stage3, stage4, stage5 } = get();
    return {
      ...stage1,
      ...stage2,
      ...stage3,
      ...stage4,
      ...stage5,
    };
  },
}));
