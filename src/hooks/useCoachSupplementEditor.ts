import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MEAL_SLOTS, MealSlot } from '@/hooks/useCoachNutritionEditor';

export const coachSupplementEditorKeys = {
  week: (clientId: string, weekStart: string) => ['coach_client', clientId, 'supplement_week', weekStart] as const,
};

export { MEAL_SLOTS };
export type { MealSlot };

// ── A client's full week of supplement logs, grouped by day → meal slot ──
export function useClientWeekSupplements(clientId: string, weekStart: string) {
  return useQuery({
    queryKey: coachSupplementEditorKeys.week(clientId, weekStart),
    enabled: !!clientId && !!weekStart,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('*')
        .eq('client_id', clientId)
        .eq('week_start_date', weekStart)
        .eq('item_type', 'supplement')
        .order('item_order', { ascending: true });
      if (error) throw error;

      const grouped: Record<number, Record<MealSlot, any[]>> = {};
      for (let d = 1; d <= 6; d++) {
        grouped[d] = { morning_drink: [], breakfast: [], lunch: [], evening_snacks: [], dinner: [] };
      }
      (data ?? []).forEach((row) => {
        const d = row.day_number;
        const slot = row.meal_slot as MealSlot;
        if (grouped[d] && MEAL_SLOTS.includes(slot)) {
          grouped[d][slot].push(row);
        }
      });
      return grouped;
    },
    refetchInterval: 20000,
  });
}

interface AddSupplementPayload {
  clientId: string;
  weekStart: string;
  dayNumbers: number[];
  mealSlot: MealSlot;
  itemName: string;
  quantity?: string | null;
  startOrderByDay: Record<number, number>;
}

export function useCoachAddSupplement() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddSupplementPayload) => {
      const rows = payload.dayNumbers.map((dayNumber) => ({
        client_id:       payload.clientId,
        week_start_date: payload.weekStart,
        day_number:      dayNumber,
        item_type:       'supplement',
        meal_slot:       payload.mealSlot,
        item_name:       payload.itemName,
        item_order:      payload.startOrderByDay[dayNumber] ?? 1,
        quantity:        payload.quantity ?? null,
        // Not is_custom — that flag is what makes an item removable on the
        // client's own screen, and coach-assigned items must not be.
        added_by_coach:  true,
        completed:       false,
      }));
      const { error } = await supabase.from('manual_workout_logs').insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: coachSupplementEditorKeys.week(vars.clientId, vars.weekStart) });
    },
  });
}

export function useCoachRemoveSupplement() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; clientId: string; weekStart: string }) => {
      const { error } = await supabase.from('manual_workout_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: coachSupplementEditorKeys.week(vars.clientId, vars.weekStart) });
    },
  });
}
