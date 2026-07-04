import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getWeekStart } from '@/hooks/useManualLog';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Template counts — used as denominators when no logs exist yet
const TEMPLATE_WORKOUT = 3 + 3 + 2; // warmup(3) + workout(3) + cooldown(2)
const TEMPLATE_WATER   = 9;
const TEMPLATE_FOOD    = 5;

type DayAlignment = {
  day: number;        // 1-6
  score: number | null;
  workoutPct: number;
  waterPct: number;
  foodPct: number;
};

function pct(done: number, total: number) {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

export function computeDay(dayLogs: { item_type: string; completed: boolean }[]): Omit<DayAlignment, 'day'> {
  if (dayLogs.length === 0) return { score: null, workoutPct: 0, waterPct: 0, foodPct: 0 };

  const workout = dayLogs.filter(l => ['warmup', 'workout', 'cooldown'].includes(l.item_type));
  const water   = dayLogs.filter(l => l.item_type === 'water');
  const food    = dayLogs.filter(l => l.item_type === 'food');

  const wkTotal = workout.length || TEMPLATE_WORKOUT;
  const waTotal = water.length   || TEMPLATE_WATER;
  const foTotal = food.length    || TEMPLATE_FOOD;

  const workoutPct = pct(workout.filter(l => l.completed).length, wkTotal);
  const waterPct   = pct(water.filter(l => l.completed).length,   waTotal);
  const foodPct    = pct(food.filter(l => l.completed).length,    foTotal);
  const score      = Math.round((workoutPct + waterPct + foodPct) / 3);

  return { score, workoutPct, waterPct, foodPct };
}

function buildInsight(workoutPct: number, waterPct: number, foodPct: number, composite: number): string {
  if (composite === 0) return 'Start logging today to build your Alignment Score';
  if (composite >= 90) return 'Perfect alignment — all three pillars are firing today';
  if (composite >= 75) return 'Strong day — you\'re aligned across the board';

  const areas = [
    { label: 'Workout', pct: workoutPct },
    { label: 'Water',   pct: waterPct   },
    { label: 'Food',    pct: foodPct    },
  ];
  const best  = [...areas].sort((a, b) => b.pct - a.pct)[0];
  const worst = [...areas].sort((a, b) => a.pct - b.pct)[0];

  if (worst.pct === best.pct) return 'Balanced effort across all areas — keep it steady';
  if (worst.pct < 30) return `${worst.label} needs attention — a small push will lift your score`;
  return `${best.label} is your strongest area today — keep that momentum going`;
}

// ── Derive day_number (1-6) for a given date, relative to weekStart ───────────
// day_number is stored as offset from week_start_date: day 1 = weekStart+0, day 2 = weekStart+1, etc.
// We cannot use getDay() directly because getWeekStart() uses local-midnight → UTC conversion
// which may shift the week boundary by one day in non-UTC timezones (e.g. IST).
function getDayNumber(weekStart: string, date: Date = new Date()): number | null {
  const [wsY, wsM, wsD] = weekStart.split('-').map(Number);
  const todayMidnight   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  for (let dn = 1; dn <= 6; dn++) {
    const candidate = new Date(wsY, wsM - 1, wsD + dn - 1);
    if (candidate.getTime() === todayMidnight.getTime()) return dn;
  }
  return null; // date falls outside the 6 tracked days (e.g. Sunday)
}

// ── Alignment score for any specific date ─────────────────────────────────────
export function useAlignmentForDate(dateStr: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['alignment', user?.id, 'date', dateStr],
    enabled: !!user?.id && !!dateStr,
    queryFn: async () => {
      const dateObj   = new Date(dateStr + 'T00:00:00');
      const weekStart = getWeekStart(dateObj);
      const dayNumber = getDayNumber(weekStart, dateObj);

      if (!dayNumber) {
        return { composite: 0, workoutPct: 0, waterPct: 0, foodPct: 0, insight: 'Rest day — no plan today', hasData: false };
      }

      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('item_type, completed')
        .eq('client_id', user!.id)
        .eq('week_start_date', weekStart)
        .eq('day_number', dayNumber);

      if (error) throw error;

      const logs = (data ?? []) as { item_type: string; completed: boolean }[];
      const { score, workoutPct, waterPct, foodPct } = computeDay(logs);
      const composite = score ?? 0;
      const insight   = buildInsight(workoutPct, waterPct, foodPct, composite);

      return { composite, workoutPct, waterPct, foodPct, insight, hasData: logs.length > 0 };
    },
  });
}

// ── Today's alignment ──────────────────────────────────────────────────────────
export function useAlignmentScore() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['alignment', user?.id, 'today'],
    enabled: !!user?.id,
    queryFn: async () => {
      const weekStart = getWeekStart(new Date());
      const dayNumber = getDayNumber(weekStart);

      if (!dayNumber) {
        return { composite: 0, workoutPct: 0, waterPct: 0, foodPct: 0, insight: 'Rest day — no plan today', hasData: false };
      }

      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('item_type, completed')
        .eq('client_id', user!.id)
        .eq('week_start_date', weekStart)
        .eq('day_number', dayNumber);

      if (error) throw error;

      const logs = (data ?? []) as { item_type: string; completed: boolean }[];
      const { score, workoutPct, waterPct, foodPct } = computeDay(logs);
      const composite = score ?? 0;
      const insight   = buildInsight(workoutPct, waterPct, foodPct, composite);

      return { composite, workoutPct, waterPct, foodPct, insight, hasData: logs.length > 0 };
    },
  });
}

// ── Weekly alignment (Mon–Sat of any week) ────────────────────────────────────
export function useWeeklyAlignment(weekStart?: string) {
  const { user } = useAuth();
  const resolvedWeekStart = weekStart ?? getWeekStart(new Date());

  return useQuery({
    queryKey: ['alignment', user?.id, 'week', resolvedWeekStart],
    enabled: !!user?.id,
    queryFn: async () => {
      const weekStart = resolvedWeekStart;

      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('day_number, item_type, completed')
        .eq('client_id', user!.id)
        .eq('week_start_date', weekStart);

      if (error) throw error;

      const logs = (data ?? []) as { day_number: number; item_type: string; completed: boolean }[];

      return Array.from({ length: 6 }, (_, i) => {
        const day     = i + 1;
        const dayLogs = logs.filter(l => l.day_number === day);
        return { day, ...computeDay(dayLogs) };
      }) as DayAlignment[];
    },
  });
}

// ── Per-day alignment history for the last N days ─────────────────────────────
export type DayScore = { date: string; score: number | null };

export function useAlignmentHistory(numDays: number = 84) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['alignment', user?.id, 'history', numDays],
    enabled:  !!user?.id,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('week_start_date, day_number, item_type, completed')
        .eq('client_id', user!.id)
        .not('day_number', 'is', null);

      if (error) throw error;

      // Map each log row to its actual calendar date
      const dateMap = new Map<string, { item_type: string; completed: boolean }[]>();
      for (const row of (data ?? []) as { week_start_date: string; day_number: number; item_type: string; completed: boolean }[]) {
        if (row.day_number < 1 || row.day_number > 6) continue;
        const [wsY, wsM, wsD] = row.week_start_date.split('-').map(Number);
        const d = new Date(wsY, wsM - 1, wsD + row.day_number - 1);
        if (d.getDay() === 0) continue; // Sundays are rest days
        const key = localDateStr(d);
        if (!dateMap.has(key)) dateMap.set(key, []);
        dateMap.get(key)!.push({ item_type: row.item_type, completed: row.completed });
      }

      // Build array from numDays ago to today
      const result: DayScore[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key  = localDateStr(d);
        const logs = dateMap.get(key);
        const { score } = logs ? computeDay(logs) : { score: null };
        result.push({ date: key, score: logs && logs.length > 0 ? (score ?? 0) : null });
      }
      return result;
    },
  });
}

// ── 4-week rolling average → tier ─────────────────────────────────────────────
export type Tier = 'foundation' | 'momentum' | 'locked_in' | 'unbreakable';

export const TIER_META: Record<Tier, { label: string; icon: string; color: string; min: number }> = {
  foundation:  { label: 'Foundation Builder', icon: '🧱', color: '#6B7280', min: 0  },
  momentum:    { label: 'Momentum',            icon: '⚡', color: '#E8A44A', min: 40 },
  locked_in:   { label: 'Locked In',           icon: '🔒', color: '#00C4B4', min: 65 },
  unbreakable: { label: 'Unbreakable',         icon: '💎', color: '#A78BFA', min: 85 },
};

export function scoreToTier(avg: number): Tier {
  if (avg >= 85) return 'unbreakable';
  if (avg >= 65) return 'locked_in';
  if (avg >= 40) return 'momentum';
  return 'foundation';
}
