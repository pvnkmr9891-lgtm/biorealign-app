// src/store/assessmentStore.ts
// Flat key-value store keyed by question ID (e.g. 'CORE-Q1', 'PRP-P1-Q1')
import { create } from 'zustand';

interface AssessmentStore {
  programKey: string | null;
  answers: Record<string, any>;
  isSubmitting: boolean;
  submitError: string | null;

  setProgramKey: (key: string) => void;
  setAnswer: (questionId: string, value: any) => void;
  setSubmitting: (val: boolean) => void;
  setSubmitError: (err: string | null) => void;
  reset: () => void;
  getPayload: () => object;
}

export const useAssessmentStore = create<AssessmentStore>((set, get) => ({
  programKey: null,
  answers: {},
  isSubmitting: false,
  submitError: null,

  setProgramKey: (key) => set({ programKey: key }),
  setAnswer: (questionId, value) =>
    set((s) => ({ answers: { ...s.answers, [questionId]: value } })),
  setSubmitting: (val) => set({ isSubmitting: val }),
  setSubmitError: (err) => set({ submitError: err }),

  reset: () => set({ programKey: null, answers: {}, isSubmitting: false, submitError: null }),

  getPayload: () => {
    const { programKey, answers } = get();
    return { program_key: programKey, answers };
  },
}));
