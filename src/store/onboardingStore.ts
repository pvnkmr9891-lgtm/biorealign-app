// src/store/onboardingStore.ts
import { create } from 'zustand';

export type IntensityLevel = 'beginner' | 'medium' | 'hard';
export type TrainingType   = 'home' | 'gym' | 'hybrid';

interface OnboardingState {
  programId:  string | null;
  intensity:  IntensityLevel | null;
  type:       TrainingType   | null;

  setProgram:   (id: string) => void;
  setIntensity: (i: IntensityLevel) => void;
  setType:      (t: TrainingType)   => void;
  reset:        () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  programId: null,
  intensity: null,
  type:      null,

  setProgram:   (programId)  => set({ programId }),
  setIntensity: (intensity)  => set({ intensity }),
  setType:      (type)       => set({ type }),
  reset: () => set({ programId: null, intensity: null, type: null }),
}));

// Intensity metadata
export const INTENSITY_META = {
  beginner: {
    label:       'Beginner',
    weeks:       20,
    icon:        '🌱',
    color:       '#10B981',
    description: 'Build your foundation safely with gradual progression and full recovery time.',
  },
  medium: {
    label:       'Medium',
    weeks:       12,
    icon:        '⚡',
    color:       '#E8A44A',
    description: 'Balanced challenge and recovery for consistent, measurable results.',
  },
  hard: {
    label:       'Hard',
    weeks:       8,
    icon:        '🔥',
    color:       '#EF4444',
    description: 'Accelerated transformation for those ready to go all-in with maximum commitment.',
  },
} as const;

// Training type metadata
export const TYPE_META = {
  home: {
    label:       'Home',
    icon:        '🏠',
    description: 'Minimal equipment. Maximum results.',
  },
  gym: {
    label:       'Gym',
    icon:        '🏋️',
    description: 'Full equipment access for optimal progression.',
  },
  hybrid: {
    label:       'Hybrid',
    icon:        '🔄',
    description: 'The best of both — flexible and effective.',
  },
} as const;
