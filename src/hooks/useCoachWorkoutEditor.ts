import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const coachWorkoutEditorKeys = {
  week: (clientId: string, weekStart: string) => ['coach_client', clientId, 'week_logs', weekStart] as const,
};

export type EditableSection = 'warmup' | 'workout' | 'cooldown';
export const EDITABLE_SECTIONS: EditableSection[] = ['warmup', 'workout', 'cooldown'];

// ── A client's full week of logs, grouped by day → section ─────────────
// Shape: { [dayNumber]: { warmup: Log[], workout: Log[], cooldown: Log[] } }
export function useClientWeekLogs(clientId: string, weekStart: string) {
  return useQuery({
    queryKey: coachWorkoutEditorKeys.week(clientId, weekStart),
    enabled: !!clientId && !!weekStart,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('*')
        .eq('client_id', clientId)
        .eq('week_start_date', weekStart)
        .in('item_type', EDITABLE_SECTIONS)
        .order('item_order', { ascending: true });
      if (error) throw error;

      const grouped: Record<number, Record<EditableSection, any[]>> = {};
      for (let d = 1; d <= 6; d++) {
        grouped[d] = { warmup: [], workout: [], cooldown: [] };
      }
      (data ?? []).forEach((row) => {
        const d = row.day_number;
        if (grouped[d] && EDITABLE_SECTIONS.includes(row.item_type)) {
          grouped[d][row.item_type as EditableSection].push(row);
        }
      });
      return grouped;
    },
    refetchInterval: 20000,
  });
}

interface AddExercisePayload {
  clientId: string;
  weekStart: string;
  dayNumbers: number[]; // one day, or all 6 for "entire week"
  itemType: EditableSection;
  itemName: string;
  sets?: number | null;
  reps?: number | null;
  side?: string | null;
  holdSecs?: number | null;
  restSecs?: number | null;
  startOrderByDay: Record<number, number>; // next item_order per day, computed by caller from current list lengths
}

export function useCoachAddExercise() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddExercisePayload) => {
      const rows = payload.dayNumbers.map((dayNumber) => ({
        client_id:       payload.clientId,
        week_start_date: payload.weekStart,
        day_number:      dayNumber,
        item_type:       payload.itemType,
        item_name:       payload.itemName,
        item_order:      payload.startOrderByDay[dayNumber] ?? 1,
        sets:            payload.sets ?? null,
        reps:            payload.reps ?? null,
        side:            payload.side ?? null,
        hold_secs:       payload.holdSecs ?? null,
        rest_secs:       payload.restSecs ?? null,
        // Not is_custom — that flag is what makes an item removable on the
        // client's own screen, and coach-assigned items must not be.
        added_by_coach:  true,
        completed:       false,
      }));
      const { error } = await supabase.from('manual_workout_logs').insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: coachWorkoutEditorKeys.week(vars.clientId, vars.weekStart) });
    },
  });
}

export function useCoachRemoveExercise() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; clientId: string; weekStart: string }) => {
      const { error } = await supabase.from('manual_workout_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: coachWorkoutEditorKeys.week(vars.clientId, vars.weekStart) });
    },
  });
}
