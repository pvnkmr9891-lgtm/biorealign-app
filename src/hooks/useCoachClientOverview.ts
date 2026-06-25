import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getWeekStart } from '@/hooks/useManualLog';

export const coachClientOverviewKeys = {
  profile:    (clientId: string) => ['coach_client', clientId, 'profile'] as const,
  metrics:    (clientId: string) => ['coach_client', clientId, 'body_metrics'] as const,
  photos:     (clientId: string) => ['coach_client', clientId, 'photos'] as const,
  workoutSummary: (clientId: string, weekStart: string) => ['coach_client', clientId, 'workout_summary', weekStart] as const,
  nutritionTrend: (clientId: string) => ['coach_client', clientId, 'nutrition_trend'] as const,
};

const EXERCISE_TYPES = ['warmup', 'workout', 'cooldown'];

// ── Full client profile (for Overview tab) ───────────────────────────────
export function useClientProfile(clientId: string) {
  return useQuery({
    queryKey: coachClientOverviewKeys.profile(clientId),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', clientId).single();
      if (error) throw error;
      return data;
    },
  });
}

// ── Body metrics history (Body Measurements tab) ────────────────────────
export function useClientBodyMetrics(clientId: string) {
  return useQuery({
    queryKey: coachClientOverviewKeys.metrics(clientId),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_metrics')
        .select('*')
        .eq('client_id', clientId)
        .order('recorded_date', { ascending: false })
        .limit(26); // ~6 months of weekly check-ins
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 20000, // pick up new weekly check-ins from the client without a manual reload
  });
}

// ── Progress photos with signed URLs (Pictures tab) ──────────────────────
export function useClientPhotos(clientId: string) {
  return useQuery({
    queryKey: coachClientOverviewKeys.photos(clientId),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('client_id', clientId)
        .order('photo_date', { ascending: false });
      if (error) throw error;

      const photos = data ?? [];
      return Promise.all(
        photos.map(async (p) => {
          try {
            const { data: urlData } = await supabase.storage.from('progress-photos').createSignedUrl(p.storage_path, 3600);
            return { ...p, url: urlData?.signedUrl };
          } catch {
            return p;
          }
        })
      );
    },
    refetchInterval: 20000,
  });
}

// ── A given week's checklist completion, split exercises vs. nutrition ──
// (Workouts tab) — pass a weekStart to browse past/future weeks, not just
// whichever week happens to have the most recent rows.
export interface DayTaskSplit { exTotal: number; exDone: number; nutTotal: number; nutDone: number; calories: number; protein: number; fat: number; }

export function useClientWorkoutSummary(clientId: string, weekStart: string) {
  return useQuery({
    queryKey: coachClientOverviewKeys.workoutSummary(clientId, weekStart),
    enabled: !!clientId && !!weekStart,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('day_number, item_type, completed, calories, protein_g, fat_g')
        .eq('client_id', clientId)
        .eq('week_start_date', weekStart);
      if (error) throw error;

      const rows = data ?? [];
      const byDay: Record<number, DayTaskSplit> = {};
      for (let d = 1; d <= 6; d++) byDay[d] = { exTotal: 0, exDone: 0, nutTotal: 0, nutDone: 0, calories: 0, protein: 0, fat: 0 };

      rows.forEach((r) => {
        const d = r.day_number ?? 0;
        if (!byDay[d]) byDay[d] = { exTotal: 0, exDone: 0, nutTotal: 0, nutDone: 0, calories: 0, protein: 0, fat: 0 };
        const isExercise = EXERCISE_TYPES.includes(r.item_type);
        if (isExercise) {
          byDay[d].exTotal += 1;
          if (r.completed) byDay[d].exDone += 1;
        } else if (r.item_type === 'food') {
          byDay[d].nutTotal += 1;
          if (r.completed) {
            byDay[d].nutDone += 1;
            byDay[d].calories += r.calories ?? 0;
            byDay[d].protein += r.protein_g ?? 0;
            byDay[d].fat += r.fat_g ?? 0;
          }
        }
      });

      const exTotal = rows.filter((r) => EXERCISE_TYPES.includes(r.item_type)).length;
      const exDone = rows.filter((r) => EXERCISE_TYPES.includes(r.item_type) && r.completed).length;
      const nutTotal = rows.filter((r) => r.item_type === 'food').length;
      const nutDone = rows.filter((r) => r.item_type === 'food' && r.completed).length;
      const total = exTotal + nutTotal;
      const done = exDone + nutDone;

      return { weekStart, total, done, exTotal, exDone, nutTotal, nutDone, byDay };
    },
    refetchInterval: 20000,
  });
}

// ── Nutrition trend across recent weeks (for the Body tab's Trend Analysis) ──
// Average daily calories/protein/fat logged (eaten) per week, over the last
// 12 weeks — same averaging convention as the rest of the app (6 tracked
// days per week).
export interface NutritionTrendPoint { weekStart: string; calories: number; protein: number; fat: number }

export function useClientNutritionTrend(clientId: string) {
  return useQuery({
    queryKey: coachClientOverviewKeys.nutritionTrend(clientId),
    enabled: !!clientId,
    queryFn: async () => {
      const currentWeek = getWeekStart();
      const cutoff = (() => {
        const d = new Date(currentWeek + 'T00:00:00');
        d.setDate(d.getDate() - 11 * 7);
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${da}`;
      })();

      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('week_start_date, calories, protein_g, fat_g')
        .eq('client_id', clientId)
        .eq('item_type', 'food')
        .eq('completed', true)
        .gte('week_start_date', cutoff)
        .lte('week_start_date', currentWeek);
      if (error) throw error;

      const byWeek = new Map<string, { calories: number; protein: number; fat: number }>();
      (data ?? []).forEach((r: any) => {
        const wk = r.week_start_date;
        if (!byWeek.has(wk)) byWeek.set(wk, { calories: 0, protein: 0, fat: 0 });
        const agg = byWeek.get(wk)!;
        agg.calories += r.calories ?? 0;
        agg.protein  += r.protein_g ?? 0;
        agg.fat      += r.fat_g ?? 0;
      });

      return Array.from(byWeek.entries())
        .map(([weekStart, agg]) => ({
          weekStart,
          calories: Math.round(agg.calories / 6),
          protein: Math.round(agg.protein / 6),
          fat: Math.round(agg.fat / 6),
        }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart)) as NutritionTrendPoint[];
    },
    refetchInterval: 20000,
  });
}
