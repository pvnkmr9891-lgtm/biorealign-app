import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toLocalDateStr } from '@/lib/dateHelpers';

export interface WorkoutExercise {
  id: string;
  section_id: string;
  name: string;
  instructions: string;
  sets?: number;
  reps?: string;
  duration_seconds?: number;
  rest_seconds: number;
  is_timed: boolean;
  coach_tip?: string;
  sort_order: number;
}

export interface WorkoutSection {
  id: string;
  day_id: string;
  title: string;
  type: 'warmup' | 'stretch' | 'main' | 'cooldown';
  sort_order: number;
  exercises: WorkoutExercise[];
}

export interface WorkoutDay {
  id: string;
  plan_id: string;
  day_number: number;
  title: string;
  subtitle?: string;
  focus: string;
  estimated_mins: number;
  color: string;
  sort_order: number;
  sections?: WorkoutSection[];
  is_completed_today?: boolean;
  total_completions?: number;
}

export function useWorkoutPlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['workout', 'plan', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: plan, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('client_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!plan) return null;

      const { data: days } = await supabase
        .from('workout_days')
        .select('*')
        .eq('plan_id', plan.id)
        .order('sort_order');

      const today = toLocalDateStr(new Date());
      const { data: completions } = await supabase
        .from('workout_completions')
        .select('day_id, completed_at')
        .eq('client_id', user!.id);

      const todaySet = new Set(
        (completions ?? []).filter(c => c.completed_at?.startsWith(today)).map(c => c.day_id)
      );
      const totalMap: Record<string, number> = {};
      (completions ?? []).forEach(c => { totalMap[c.day_id] = (totalMap[c.day_id] ?? 0) + 1; });

      return {
        ...plan,
        days: (days ?? []).map(d => ({
          ...d,
          is_completed_today: todaySet.has(d.id),
          total_completions: totalMap[d.id] ?? 0,
        })),
      };
    },
  });
}

export function useWorkoutDay(dayId: string) {
  return useQuery({
    queryKey: ['workout', 'day', dayId],
    enabled: !!dayId,
    queryFn: async () => {
      const { data: day, error } = await supabase
        .from('workout_days').select('*').eq('id', dayId).single();
      if (error) throw error;

      const { data: sections } = await supabase
        .from('workout_sections').select('*').eq('day_id', dayId).order('sort_order');

      const { data: exercises } = await supabase
        .from('workout_exercises')
        .select('*')
        .in('section_id', (sections ?? []).map(s => s.id))
        .order('sort_order');

      const exMap: Record<string, WorkoutExercise[]> = {};
      (exercises ?? []).forEach(ex => {
        if (!exMap[ex.section_id]) exMap[ex.section_id] = [];
        exMap[ex.section_id].push(ex);
      });

      return {
        ...day,
        sections: (sections ?? []).map(s => ({ ...s, exercises: exMap[s.id] ?? [] })),
      } as WorkoutDay;
    },
  });
}

export function useCompleteWorkout() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dayId, durationMins, notes }: { dayId: string; durationMins?: number; notes?: string }) => {
      const { error } = await supabase
        .from('workout_completions')
        .insert({ client_id: user!.id, day_id: dayId, duration_mins: durationMins, notes });
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workout', 'plan', user?.id] }); },
  });
}

export function getFocusEmoji(focus: string): string {
  const map: Record<string, string> = {
    core: '🎯', upper_body: '💪', lower_body: '🦵',
    cardio: '🏃', recovery: '🌊', full_body: '⚡', stretch: '🧘',
  };
  return map[focus] ?? '🏋️';
}

export function getSectionEmoji(type: string): string {
  const map: Record<string, string> = { warmup: '🔥', stretch: '🧘', main: '💪', cooldown: '🌿' };
  return map[type] ?? '▶️';
}
