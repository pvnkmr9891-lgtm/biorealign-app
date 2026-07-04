// src/hooks/useTrainingLoad.ts
// Daily Cardio / Strength / Mobility scores derived from logged workout data.
// This is a separate, automatic, everyday scoring system — NOT the coach-administered
// 8-domain fitness assessment. Keep them visually and conceptually separate.
//
// Section → Domain mapping (based on actual app section keys):
//   workout  + reps != null                       → Strength (volume = sets × reps × side_mult)
//   workout  + reps = null, hold_secs < 60 AND sets×hold < 90s  → Strength isometric (5s ≈ 1 rep)
//   workout  + reps = null, hold_secs >= 60 OR sets×hold >= 90s → Cardio (duration = sets × hold_secs)
//   warmup   + cooldown (all)                     → Mobility (duration + variety bonus)
//
// Scores are self-relative: 50 = your own typical session (30-day avg over workout days).
// Score = MIN(100, (today_raw / 30d_avg) × 50).
//
// TODO: Strength score is volume-only (sets × reps) because the workout log schema
// does not capture weight/load. To improve accuracy, add an optional weight_kg field
// to manual_workout_logs and change Strength to: sets × reps × weight (volume-load).
// See: https://en.wikipedia.org/wiki/Training_volume

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface DailyTrainingScore {
  date: string;            // yyyy-mm-dd
  strengthScore: number | null;  // 0-100, null = no strength work that day
  cardioScore:   number | null;
  mobilityScore: number | null;
}

export interface TrainingLoadResult {
  scores: DailyTrainingScore[];  // oldest → newest, up to 90 days
  calibrating: boolean;          // true if fewer than 5 logged workout days in past 30d
}

// ── Internals ────────────────────────────────────────────────────────────────

// 'right' | 'left' | 'rotation' all mean bilateral — exercise performed on both
// sides, so multiply reps by 2 for true total.
function sideMultiplier(side: string | null): number {
  return !side || side === 'na' ? 1 : 2;
}

function computeRawsForDay(dayLogs: any[]): {
  strengthVolume: number;
  cardioDuration: number;
  mobilityEngagement: number;
} {
  let strengthVolume = 0;
  let cardioDuration = 0;
  let mobilityDuration = 0;
  const mobilityNames = new Set<string>();

  for (const log of dayLogs) {
    if (!log.completed) continue;
    const sets     = log.sets      ?? 1;
    const reps     = log.reps;                   // null = timed exercise
    const holdSecs = log.hold_secs;
    const side     = log.side ?? 'na';
    const type     = log.item_type as string;    // 'warmup' | 'workout' | 'cooldown'
    const name     = log.item_name as string;

    if (type === 'workout') {
      if (reps != null && reps > 0) {
        // Reps-based → Strength volume
        strengthVolume += sets * reps * sideMultiplier(side);
      } else if (holdSecs != null && holdSecs > 0) {
        const totalSecs = sets * holdSecs;
        if (holdSecs < 60 && totalSecs < 90) {
          // Short isometric with low total volume (plank 20s×2=40s, wall sit) → Strength
          // 5 seconds ≈ 1 rep equivalent — keeps it on the same scale as reps-based
          strengthVolume += sets * (holdSecs / 5);
        } else {
          // Long per-set duration (walk/bike 600s) OR significant interval total
          // (e.g. 3×30s = 90s, step-touch/bike intervals) → Cardio
          cardioDuration += totalSecs;
        }
      }
    } else if (type === 'warmup' || type === 'cooldown') {
      // All warmup and cooldown exercises count toward Mobility
      if (holdSecs != null && holdSecs > 0) {
        mobilityDuration += sets * holdSecs;
      } else if (reps != null && reps > 0) {
        // Dynamic reps (ankle circles, arm swings): proxy 3s per rep
        mobilityDuration += sets * reps * 3;
      }
      mobilityNames.add(name);
    }
  }

  // Variety bonus: doing 5 different stretches is better than one long hold
  // Factor = 1 + min(0.3, 0.05 × distinct_count), capped at 1.3
  const varietyBonus = mobilityDuration > 0
    ? 1 + Math.min(0.3, 0.05 * mobilityNames.size)
    : 1;

  return {
    strengthVolume,
    cardioDuration,
    mobilityEngagement: mobilityDuration * varietyBonus,
  };
}

// Derive actual calendar date from stored week_start_date + day_number
// week_start_date is always a Monday; day_number is 1-based (1=Mon, 2=Tue, …)
function logDate(row: any): string {
  const d = new Date(row.week_start_date + 'T00:00:00');
  d.setDate(d.getDate() + ((row.day_number ?? 1) - 1));
  return d.toISOString().split('T')[0];
}

function buildTrainingLoadResult(logs: any[]): TrainingLoadResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const d30 = new Date(today); d30.setDate(d30.getDate() - 29);
  const d90 = new Date(today); d90.setDate(d90.getDate() - 89);
  const cutoff30 = d30.toISOString().split('T')[0];
  const cutoff90 = d90.toISOString().split('T')[0];

  // Group logs by actual calendar date
  const byDate = new Map<string, any[]>();
  for (const log of logs) {
    const date = logDate(log);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(log);
  }

  // Raw values per day
  const rawByDate = new Map<string, { s: number; c: number; m: number }>();
  for (const [date, dayLogs] of byDate.entries()) {
    const { strengthVolume, cardioDuration, mobilityEngagement } = computeRawsForDay(dayLogs);
    // Only register a day if it had any exercise at all
    if (strengthVolume > 0 || cardioDuration > 0 || mobilityEngagement > 0) {
      rawByDate.set(date, { s: strengthVolume, c: cardioDuration, m: mobilityEngagement });
    }
  }

  // Calibration check: fewer than 5 logged workout days in past 30 days
  const loggedDays30 = [...rawByDate.keys()].filter(d => d >= cutoff30 && d <= todayStr);
  const calibrating = loggedDays30.length < 5;

  // 30-day baselines — average only over days where that domain had activity
  // (don't let rest-from-cardio days drag the cardio baseline down)
  const allSortedDates = [...rawByDate.keys()].filter(d => d <= todayStr).sort();
  const dates30 = allSortedDates.filter(d => d >= cutoff30);

  function avg(vals: number[]): number {
    const nonZero = vals.filter(v => v > 0);
    return nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
  }

  const baselineS = avg(dates30.map(d => rawByDate.get(d)!.s));
  const baselineC = avg(dates30.map(d => rawByDate.get(d)!.c));
  const baselineM = avg(dates30.map(d => rawByDate.get(d)!.m));

  function score(raw: number, baseline: number): number | null {
    if (raw === 0) return null;      // no work in this domain today
    if (baseline === 0) return 50;   // very first session — set as 50 (the reference point)
    return Math.min(100, Math.round((raw / baseline) * 50));
  }

  const scores: DailyTrainingScore[] = allSortedDates
    .filter(d => d >= cutoff90 && d <= todayStr)
    .map(d => {
      const raw = rawByDate.get(d)!;
      return {
        date: d,
        strengthScore: score(raw.s, baselineS),
        cardioScore:   score(raw.c, baselineC),
        mobilityScore: score(raw.m, baselineM),
      };
    });

  return { scores, calibrating };
}

// ── Client self-scoped hook ───────────────────────────────────────────────────
export function useMyTrainingLoadScores() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['training_load', user?.id ?? '', 'my'],
    enabled: !!user?.id,
    queryFn: async () => {
      // Query 13 weeks back to safely cover 90 calendar days accounting for
      // the week_start_date vs actual date offset (day_number adds up to 5 days)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 97);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('week_start_date, day_number, item_type, item_name, sets, reps, hold_secs, side, completed')
        .eq('client_id', user!.id)
        .in('item_type', ['warmup', 'workout', 'cooldown'])
        .gte('week_start_date', cutoffStr);

      if (error) throw error;
      return buildTrainingLoadResult(data ?? []);
    },
  });
}

// ── Coach / admin hook — takes a clientId param ───────────────────────────────
export function useClientTrainingLoadScores(clientId: string) {
  return useQuery({
    queryKey: ['training_load', clientId, 'client'],
    enabled: !!clientId,
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 97);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('week_start_date, day_number, item_type, item_name, sets, reps, hold_secs, side, completed')
        .eq('client_id', clientId)
        .in('item_type', ['warmup', 'workout', 'cooldown'])
        .gte('week_start_date', cutoffStr);

      if (error) throw error;
      return buildTrainingLoadResult(data ?? []);
    },
  });
}
