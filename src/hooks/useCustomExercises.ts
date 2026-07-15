// "My List" — a client's own manually-typed exercises, remembered across
// Warmup/Workout/Cooldown so they don't have to retype the same custom
// exercise every time. See app/(client)/workout-plan.tsx AddExerciseModal.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { ExerciseSide } from '@/constants/warmupExercises';

export interface CustomExercise {
  id: string;
  name: string;
  default_sets: number;
  default_reps: number | null;
  default_side: ExerciseSide;
  default_hold_secs: number | null;
  default_rest_secs: number;
}

export function useMyCustomExercises(enabled: boolean) {
  const userId = useAuthStore((s) => s.user)?.id;
  return useQuery({
    queryKey: ['client', userId, 'custom_exercises'],
    enabled: !!userId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_custom_exercises')
        .select('*')
        .eq('client_id', userId!)
        .order('name');
      if (error) throw error;
      return (data ?? []) as CustomExercise[];
    },
  });
}

export interface SaveCustomExerciseInput {
  name: string;
  sets: number;
  reps: number | null;
  side: ExerciseSide;
  holdSecs: number | null;
  restSecs: number;
}

// Best-effort save — a manually-added exercise still gets logged for today
// even if this fails, so callers should fire-and-forget rather than block on
// it. Select-then-insert/update (not .upsert()) to dedupe by
// case-insensitive name without depending on an expression-index conflict
// target through PostgREST.
export function useSaveCustomExercise() {
  const userId = useAuthStore((s) => s.user)?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveCustomExerciseInput) => {
      const name = input.name.trim();
      if (!userId || !name) return;

      const { data: existing } = await supabase
        .from('client_custom_exercises')
        .select('id')
        .eq('client_id', userId)
        .ilike('name', name)
        .maybeSingle();

      const row = {
        client_id: userId,
        name,
        default_sets: input.sets,
        default_reps: input.reps,
        default_side: input.side,
        default_hold_secs: input.holdSecs,
        default_rest_secs: input.restSecs,
      };

      if (existing) {
        const { error } = await supabase.from('client_custom_exercises').update(row).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_custom_exercises').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: ['client', userId, 'custom_exercises'] });
    },
  });
}
