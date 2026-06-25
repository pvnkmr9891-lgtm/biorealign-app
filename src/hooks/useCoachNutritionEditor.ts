import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const coachNutritionEditorKeys = {
  week: (clientId: string, weekStart: string) => ['coach_client', clientId, 'nutrition_week', weekStart] as const,
};

export const MEAL_SLOTS = ['morning_drink', 'breakfast', 'lunch', 'evening_snacks', 'dinner'] as const;
export type MealSlot = typeof MEAL_SLOTS[number];

// ── A client's full week of food logs, grouped by day → meal slot ──────
export function useClientWeekNutrition(clientId: string, weekStart: string) {
  return useQuery({
    queryKey: coachNutritionEditorKeys.week(clientId, weekStart),
    enabled: !!clientId && !!weekStart,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('*')
        .eq('client_id', clientId)
        .eq('week_start_date', weekStart)
        .eq('item_type', 'food')
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

interface AddMealPayload {
  clientId: string;
  weekStart: string;
  dayNumbers: number[];
  mealSlot: MealSlot;
  itemName: string;
  quantity?: string | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  startOrderByDay: Record<number, number>;
}

export function useCoachAddMeal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddMealPayload) => {
      const rows = payload.dayNumbers.map((dayNumber) => ({
        client_id:       payload.clientId,
        week_start_date: payload.weekStart,
        day_number:      dayNumber,
        item_type:       'food',
        meal_slot:       payload.mealSlot,
        item_name:       payload.itemName,
        item_order:      payload.startOrderByDay[dayNumber] ?? 1,
        quantity:        payload.quantity ?? null,
        calories:        payload.calories ?? null,
        protein_g:       payload.proteinG ?? null,
        carbs_g:         payload.carbsG ?? null,
        fat_g:           payload.fatG ?? null,
        // Not is_custom — that flag is what makes an item removable on the
        // client's own screen, and coach-assigned items must not be.
        added_by_coach:  true,
        completed:       false,
      }));
      const { error } = await supabase.from('manual_workout_logs').insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: coachNutritionEditorKeys.week(vars.clientId, vars.weekStart) });
    },
  });
}

export function useCoachRemoveMeal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; clientId: string; weekStart: string }) => {
      const { error } = await supabase.from('manual_workout_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: coachNutritionEditorKeys.week(vars.clientId, vars.weekStart) });
    },
  });
}
