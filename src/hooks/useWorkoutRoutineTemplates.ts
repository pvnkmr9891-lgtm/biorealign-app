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

// Which manual_workout_logs rows a domain's "replace" step is allowed to
// touch for a given day. Nutrition explicitly excludes meal_slot='craving'
// (Confession Booth) — that's free-form logging of what actually happened,
// not part of a plannable routine, and the Save/Add Routine buttons sit
// before it on the Nutrition screen specifically to keep it untouched.
function domainDeleteFilter(query: any, domain: RoutineDomain) {
  if (domain === 'workout')    return query.in('item_type', ['warmup', 'workout', 'cooldown']);
  if (domain === 'supplement') return query.eq('item_type', 'supplement');
  return query.eq('item_type', 'food').neq('meal_slot', 'craving'); // nutrition
}

// ── Apply a template's items to one or more target dates ────────────────────
// Only ever deletes the client's OWN existing rows for that domain
// (added_by_coach = false) for each target day before inserting the
// template's items — coach-assigned exercises for that day are never
// touched. Sundays are silently skipped (reported back) since there's no
// day_number for them. Past dates are temporarily allowed (skippedPast
// always 0 for now) so testing can apply routines retroactively — re-add
// the `dayOnly < today` gate here if that needs locking back down.
export function useApplyRoutineTemplate(domain: RoutineDomain) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, targetDates }: { items: RoutineTemplateItem[]; targetDates: Date[] }) => {
      const userId = user!.id;

      const pairs: { weekStart: string; dayNumber: number }[] = [];
      let skippedPast = 0;
      let skippedSunday = 0;

      for (const d of targetDates) {
        const dayOnly = new Date(d); dayOnly.setHours(0, 0, 0, 0);
        const pair = toWeekDayPair(dayOnly);
        if (!pair) { skippedSunday++; continue; }
        pairs.push(pair);
      }

      for (const { weekStart, dayNumber } of pairs) {
        const baseQuery = supabase
          .from('manual_workout_logs')
          .delete()
          .eq('client_id', userId)
          .eq('week_start_date', weekStart)
          .eq('day_number', dayNumber)
          .eq('added_by_coach', false);
        const { error: deleteError } = await domainDeleteFilter(baseQuery, domain);
        if (deleteError) throw deleteError;

        if (items.length) {
          const rows = items.map((item, idx) => ({
            client_id:       userId,
            week_start_date: weekStart,
            day_number:      dayNumber,
            item_type:       item.item_type,
            item_name:       item.item_name,
            item_order:      item.item_order ?? idx,
            sets:            item.sets ?? null,
            reps:            item.reps ?? null,
            side:            item.side ?? null,
            hold_secs:       item.hold_secs ?? null,
            rest_secs:       item.rest_secs ?? null,
            meal_slot:       item.meal_slot ?? null,
            quantity:        item.quantity ?? null,
            calories:        item.calories ?? null,
            protein_g:       item.protein_g ?? null,
            carbs_g:         item.carbs_g ?? null,
            fat_g:           item.fat_g ?? null,
            completed:       false,
            is_custom:       true,
            added_by_coach:  false,
          }));
          // upsert + ignoreDuplicates, not insert: manual_workout_logs has a
          // unique constraint on (client_id, week_start_date, day_number,
          // item_type, item_name, meal_slot). If a routine's item name happens
          // to match a coach-assigned item already on that day (which the delete
          // above deliberately leaves alone), a plain insert would throw a
          // conflict and fail the whole apply — this just silently skips
          // that one item instead, same pattern already used for supplement
          // scope-apply elsewhere in the Workout Plan screen.
          const { error: insertError } = await supabase.from('manual_workout_logs').upsert(rows, {
            onConflict: 'client_id,week_start_date,day_number,item_type,item_name,meal_slot',
            ignoreDuplicates: true,
          });
          if (insertError) throw insertError;
        }
      }

      return { appliedCount: pairs.length, skippedPast, skippedSunday };
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: ['manual_logs', user.id] });
    },
  });
}
