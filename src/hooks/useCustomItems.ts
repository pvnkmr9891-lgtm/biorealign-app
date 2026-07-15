// "My List" for food and supplements — a client's own manually-typed items,
// remembered across meal slots / supplement scopes so they don't have to
// retype the same custom item every time. Sibling to useCustomExercises.ts's
// "My List" for exercises, kept as a separate table since food/supplement
// share a shape (name + quantity, food adds macros) that doesn't overlap
// with exercise's sets/reps/side/hold/rest. See app/(client)/workout-plan.tsx
// AddExerciseModal.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export type CustomItemKind = 'food' | 'supplement';

export interface CustomItem {
  id: string;
  name: string;
  quantity: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  // Food only — which of the 5 meal-time sections (morning_drink/breakfast/
  // lunch/evening_snacks/dinner) this item belongs to. Null for supplements,
  // which aren't sectioned in "My List".
  meal_slot: string | null;
}

export function useMyCustomItems(kind: CustomItemKind, enabled: boolean) {
  const userId = useAuthStore((s) => s.user)?.id;
  return useQuery({
    queryKey: ['client', userId, 'custom_items', kind],
    enabled: !!userId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_custom_items')
        .select('*')
        .eq('client_id', userId!)
        .eq('kind', kind)
        .order('name');
      if (error) throw error;
      return (data ?? []) as CustomItem[];
    },
  });
}

export interface SaveCustomItemInput {
  kind: CustomItemKind;
  name: string;
  quantity: string | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  mealSlot?: string | null;
}

// Best-effort save — a manually-added item still gets logged for today even
// if this fails, so callers should fire-and-forget rather than block on it.
// Select-then-insert/update (not .upsert()) to dedupe by case-insensitive
// name without depending on an expression-index conflict target through
// PostgREST — same pattern as useCustomExercises.ts.
export function useSaveCustomItem() {
  const userId = useAuthStore((s) => s.user)?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveCustomItemInput) => {
      const name = input.name.trim();
      if (!userId || !name) return;

      // Same-name items in different meal-slot sections are distinct entries
      // (e.g. "Dosa" saved under both Breakfast and Dinner), so the lookup
      // matches on meal_slot too — .is() rather than .eq() for the null case
      // (supplements, which aren't sectioned).
      let existingQuery = supabase
        .from('client_custom_items')
        .select('id')
        .eq('client_id', userId)
        .eq('kind', input.kind)
        .ilike('name', name);
      existingQuery = input.mealSlot
        ? existingQuery.eq('meal_slot', input.mealSlot)
        : existingQuery.is('meal_slot', null);
      const { data: existing } = await existingQuery.maybeSingle();

      const row = {
        client_id: userId,
        kind:      input.kind,
        name,
        quantity:  input.quantity ?? null,
        calories:  input.calories ?? null,
        protein_g: input.proteinG ?? null,
        carbs_g:   input.carbsG ?? null,
        fat_g:     input.fatG ?? null,
        meal_slot: input.mealSlot ?? null,
      };

      if (existing) {
        const { error } = await supabase.from('client_custom_items').update(row).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_custom_items').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      if (userId) qc.invalidateQueries({ queryKey: ['client', userId, 'custom_items', vars.kind] });
    },
  });
}
