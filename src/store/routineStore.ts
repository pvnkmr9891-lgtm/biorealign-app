// src/store/routineStore.ts
// Shared state between routine-new and routine-add-exercise screens
import { create } from 'zustand';

export interface RoutineExercise {
  id:            string;
  name:          string;
  primaryMuscle: string;
  equipment:     string;
  sets:          number;
  reps:          string;
  restSeconds:   number;
}

interface RoutineStore {
  title:     string;
  exercises: RoutineExercise[];

  setTitle:       (title: string) => void;
  addExercise:    (ex: RoutineExercise) => void;
  removeExercise: (id: string) => void;
  reorderExercise:(fromIndex: number, toIndex: number) => void;
  updateExercise: (id: string, patch: Partial<Pick<RoutineExercise, 'sets' | 'reps' | 'restSeconds'>>) => void;
  isSelected:     (id: string) => boolean;
  reset:          () => void;
}

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  title:     '',
  exercises: [],

  setTitle: (title) => set({ title }),

  addExercise: (ex) =>
    set((state) => ({
      exercises: state.exercises.some(e => e.id === ex.id)
        ? state.exercises
        : [...state.exercises, ex],
    })),

  removeExercise: (id) =>
    set((state) => ({ exercises: state.exercises.filter(e => e.id !== id) })),

  reorderExercise: (fromIndex, toIndex) =>
    set((state) => {
      const arr  = [...state.exercises];
      const [item] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, item);
      return { exercises: arr };
    }),

  updateExercise: (id, patch) =>
    set((state) => ({
      exercises: state.exercises.map(e => e.id === id ? { ...e, ...patch } : e),
    })),

  isSelected: (id) => get().exercises.some(e => e.id === id),

  reset: () => set({ title: '', exercises: [] }),
}));
