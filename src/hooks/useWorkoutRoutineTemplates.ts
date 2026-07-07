// Client-owned "saved routine" templates for the Workout Plan screen's
// Save Routine / Add Routine feature. Snapshots a day's Warmup/Workout/
// Cooldown items (manual_workout_logs rows) into a reusable named template,
// and re-applies a template's items into one or more target dates later.
//
// Deliberately separate from the older (disabled) routines/routine_exercises
// tables, which model exercise-library browsing, not day-application.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getWeekStart } from '@/lib/dateHelpers';

export interface RoutineTemplateItem {
  id?: string;
  item_type: 'warmup' | 'workout' | 'cooldown';
  item_name: string;
  item_order: number;
  sets: number | null;
  reps: number | null;
  side: string | null;
  hold_secs: number | null;
  rest_secs: number | null;
}

export interface RoutineTemplate {
  id: string;
  name: string;
  created_at: string;
  items: RoutineTemplateItem[];
}

const routineKeys = {
  list: (uid: string) => ['workout_routine_templates', uid] as const,
};

// ── List saved templates (for the "Add Routine" picker) ─────────────────────
export function useMyRoutineTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: routineKeys.list(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async (): Promise<RoutineTemplate[]> => {
      const { data, error } = await supabase
        .from('client_routine_templates')
        .select('id, name, created_at, items:client_routine_template_items(id, item_type, item_name, item_order, sets, reps, side, hold_secs, rest_secs)')
        .eq('client_id', user!.id)
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
    mutationFn: async ({ name, items }: { name: string; items: RoutineTemplateItem[] }) => {
      const { data: template, error: templateError } = await supabase
        .from('client_routine_templates')
        .insert({ client_id: user!.id, name })
        .select()
        .single();
      if (templateError) throw templateError;

      if (items.length) {
        const rows = items.map((item, idx) => ({
          template_id: template.id,
          item_type:   item.item_type,
          item_name:   item.item_name,
          item_order:  item.item_order ?? idx,
          sets:        item.sets,
          reps:        item.reps,
          side:        item.side,
          hold_secs:   item.hold_secs,
          rest_secs:   item.rest_secs,
        }));
        const { error: itemsError } = await supabase.from('client_routine_template_items').insert(rows);
        if (itemsError) throw itemsError;
      }
      return template;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: routineKeys.list(user.id) });
    },
  });
}

// ── Delete a saved template ───────────────────────────────────────────────
export function useDeleteRoutineTemplate() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from('client_routine_templates').delete().eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: routineKeys.list(user.id) });
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
// Only ever deletes the client's OWN existing warmup/workout/cooldown rows
// (added_by_coach = false) for each target day before inserting the
// template's items — coach-assigned exercises for that day are never
// touched. Dates before today are silently skipped (skippedCount reported
// back) since re-writing a day that's already happened doesn't make sense.
export function useApplyRoutineTemplate() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, targetDates }: { items: RoutineTemplateItem[]; targetDates: Date[] }) => {
      const userId = user!.id;
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const pairs: { weekStart: string; dayNumber: number }[] = [];
      let skippedPast = 0;
      let skippedSunday = 0;

      for (const d of targetDates) {
        const dayOnly = new Date(d); dayOnly.setHours(0, 0, 0, 0);
        if (dayOnly < today) { skippedPast++; continue; }
        const pair = toWeekDayPair(dayOnly);
        if (!pair) { skippedSunday++; continue; }
        pairs.push(pair);
      }

      for (const { weekStart, dayNumber } of pairs) {
        const { error: deleteError } = await supabase
          .from('manual_workout_logs')
          .delete()
          .eq('client_id', userId)
          .eq('week_start_date', weekStart)
          .eq('day_number', dayNumber)
          .in('item_type', ['warmup', 'workout', 'cooldown'])
          .eq('added_by_coach', false);
        if (deleteError) throw deleteError;

        if (items.length) {
          const rows = items.map((item, idx) => ({
            client_id:       userId,
            week_start_date: weekStart,
            day_number:      dayNumber,
            item_type:       item.item_type,
            item_name:       item.item_name,
            item_order:      item.item_order ?? idx,
            sets:            item.sets,
            reps:            item.reps,
            side:            item.side,
            hold_secs:       item.hold_secs,
            rest_secs:       item.rest_secs,
            completed:       false,
            is_custom:       true,
            added_by_coach:  false,
          }));
          // upsert + ignoreDuplicates, not insert: manual_workout_logs has a
          // unique constraint on (client_id, week_start_date, day_number,
          // item_type, item_name). If a routine's exercise name happens to
          // match a coach-assigned exercise already on that day (which the
          // delete above deliberately leaves alone), a plain insert would
          // throw a conflict and fail the whole apply — this just silently
          // skips that one exercise instead, same pattern already used for
          // supplement scope-apply elsewhere in this screen.
          const { error: insertError } = await supabase.from('manual_workout_logs').upsert(rows, {
            onConflict: 'client_id,week_start_date,day_number,item_type,item_name',
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
