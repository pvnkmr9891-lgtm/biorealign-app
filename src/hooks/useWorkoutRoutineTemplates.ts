// Client-owned "saved routine" templates for the workout/nutrition/supplement
// Save Routine / Add Routine features. Snapshots a day's items for one
// domain into a reusable named template, and re-applies a template's items
// into one or more target dates later.
//
// Deliberately separate from the older (disabled) routines/routine_exercises
// tables, which model exercise-library browsing, not day-application.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getWeekStart } from '@/lib/dateHelpers';

export type RoutineDomain = 'workout' | 'nutrition' | 'supplement';

export interface RoutineTemplateItem {
  id?: string;
  item_type:   'warmup' | 'workout' | 'cooldown' | 'food' | 'supplement';
  item_name:   string;
  item_order:  number;
  // workout-only
  sets?:       number | null;
  reps?:       number | null;
  side?:       string | null;
  hold_secs?:  number | null;
  rest_secs?:  number | null;
  // nutrition/supplement-only
  meal_slot?:  string | null;
  quantity?:   string | null;
  calories?:   number | null;
  protein_g?:  number | null;
  carbs_g?:    number | null;
  fat_g?:      number | null;
}

export interface RoutineTemplate {
  id: string;
  name: string;
  domain: RoutineDomain;
  created_at: string;
  items: RoutineTemplateItem[];
}

const routineKeys = {
  list: (uid: string, domain: RoutineDomain) => ['routine_templates', uid, domain] as const,
};

const TEMPLATE_ITEM_COLUMNS =
  'id, item_type, item_name, item_order, sets, reps, side, hold_secs, rest_secs, meal_slot, quantity, calories, protein_g, carbs_g, fat_g';

// ── List saved templates for one domain (for the "Add Routine" picker) ──────
export function useMyRoutineTemplates(domain: RoutineDomain) {
  const { user } = useAuth();

  return useQuery({
    queryKey: routineKeys.list(user?.id ?? '', domain),
    enabled: !!user?.id,
    queryFn: async (): Promise<RoutineTemplate[]> => {
      const { data, error } = await supabase
        .from('client_routine_templates')
        .select(`id, name, domain, created_at, items:client_routine_template_items(${TEMPLATE_ITEM_COLUMNS})`)
        .eq('client_id', user!.id)
        .eq('domain', domain)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        items: (t.items ?? []).sort((a: any, b: any) => a.item_order - b.item_order),
      }));
    },
  });
}

// ── Save the current day's items as a new named template ────────────────────
export function useSaveRoutineTemplate() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, domain, items }: { name: string; domain: RoutineDomain; items: RoutineTemplateItem[] }) => {
      const { data: template, error: templateError } = await supabase
        .from('client_routine_templates')
        .insert({ client_id: user!.id, name, domain })
        .select()
        .single();
      if (templateError) throw templateError;

      if (items.length) {
        const rows = items.map((item, idx) => ({
          template_id: template.id,
          item_type:   item.item_type,
          item_name:   item.item_name,
          item_order:  item.item_order ?? idx,
          sets:        item.sets ?? null,
          reps:        item.reps ?? null,
          side:        item.side ?? null,
          hold_secs:   item.hold_secs ?? null,
          rest_secs:   item.rest_secs ?? null,
          meal_slot:   item.meal_slot ?? null,
          quantity:    item.quantity ?? null,
          calories:    item.calories ?? null,
          protein_g:   item.protein_g ?? null,
          carbs_g:     item.carbs_g ?? null,
          fat_g:       item.fat_g ?? null,
        }));
        const { error: itemsError } = await supabase.from('client_routine_template_items').insert(rows);
        if (itemsError) throw itemsError;
      }
      return template;
    },
    onSuccess: (_data, variables) => {
      if (user?.id) qc.invalidateQueries({ queryKey: routineKeys.list(user.id, variables.domain) });
    },
  });
}

// ── Delete a saved template ───────────────────────────────────────────────
export function useDeleteRoutineTemplate(domain: RoutineDomain) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from('client_routine_templates').delete().eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: routineKeys.list(user.id, domain) });
    },
  });
}

// Converts a calendar Date into its (week_start_date, day_number) pair.
// Returns null for Sundays — day_number only covers 1-6 (Mon-Sat); Sunday
// is the untracked rest day throughout this app, so it's never a valid
// apply target.
function toWeekDayPair(d: Date): { weekStart: string; dayNumber: number } | null {
  const dow = d.getDay(); // 0=Sun...6=Sat
  if (dow === 0) return null;
  return { weekStart: getWeekStart(d), dayNumber: dow };
}

// ── Apply a template's items to one or more target dates ────────────────────
// Single RPC round-trip (apply_routine_template_items) instead of looping
// delete-then-insert per day in JS. Two things that fixed:
//
// 1. Correctness — the old code deleted EVERY one of the client's own
//    domain items for a target day, then reinserted the whole template
//    fresh with completed=false. Re-applying a routine that's a superset of
//    an already-completed one (e.g. saved 12 exercises checked off, then
//    later applied a 14-exercise version of the "same" routine) wiped the
//    green ticks on all 12, not just the 2 new ones. The RPC now diffs:
//    items still present in the new routine (matched by item_type +
//    item_name + meal_slot) are left completely untouched — including
//    completed status — items dropped from the routine get deleted, and
//    only genuinely new items get inserted (completed=false). Applies to
//    all three domains (workout/nutrition/supplement) since they share this
//    one function.
// 2. Performance — was 2 round trips (delete + upsert) per target day, so
//    applying to an entire month was ~52 sequential requests. Now one RPC
//    call handles every target day in a single request, same reasoning as
//    the batch-save fix.
//
// Sundays are silently skipped (reported back) since there's no day_number
// for them. Past dates are temporarily allowed (skippedPast always 0 for
// now) so testing can apply routines retroactively — re-add a `dayOnly <
// today` filter on targetDates here if that needs locking back down.
export function useApplyRoutineTemplate(domain: RoutineDomain) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, targetDates }: { items: RoutineTemplateItem[]; targetDates: Date[] }) => {
      const pairs: { week_start_date: string; day_number: number }[] = [];
      let skippedSunday = 0;

      for (const d of targetDates) {
        const dayOnly = new Date(d); dayOnly.setHours(0, 0, 0, 0);
        const pair = toWeekDayPair(dayOnly);
        if (!pair) { skippedSunday++; continue; }
        pairs.push({ week_start_date: pair.weekStart, day_number: pair.dayNumber });
      }

      if (pairs.length) {
        const rpcItems = items.map((item, idx) => ({
          item_type:   item.item_type,
          item_name:   item.item_name,
          item_order:  item.item_order ?? idx,
          sets:        item.sets ?? null,
          reps:        item.reps ?? null,
          side:        item.side ?? null,
          hold_secs:   item.hold_secs ?? null,
          rest_secs:   item.rest_secs ?? null,
          meal_slot:   item.meal_slot ?? null,
          quantity:    item.quantity ?? null,
          calories:    item.calories ?? null,
          protein_g:   item.protein_g ?? null,
          carbs_g:     item.carbs_g ?? null,
          fat_g:       item.fat_g ?? null,
        }));
        const { error } = await supabase.rpc('apply_routine_template_items', {
          p_domain:  domain,
          p_targets: pairs,
          p_items:   rpcItems,
        });
        if (error) throw error;
      }

      return { appliedCount: pairs.length, skippedPast: 0, skippedSunday };
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: ['manual_logs', user.id] });
    },
  });
}
