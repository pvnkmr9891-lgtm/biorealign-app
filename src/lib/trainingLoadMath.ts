// Pure Cardio/Strength/Mobility scoring logic, extracted from
// useTrainingLoad.ts for unit testing without pulling in Supabase/RN native
// modules at import time. See that file for the full domain-mapping
// explanation. Scores are self-relative: 50 = the client's own 30-day
// average on days that domain had activity.

import { toLocalDateStr } from './dateHelpers';

export interface DailyTrainingScore {
  date: string;
  strengthScore: number | null;
  cardioScore: number | null;
  mobilityScore: number | null;
}

export interface TrainingLoadResult {
  scores: DailyTrainingScore[];
  calibrating: boolean;
}

export interface WorkoutLogRow {
  week_start_date: string;
  day_number?: number | null;
  item_type: string;
  item_name?: string;
  sets?: number | null;
  reps?: number | null;
  hold_secs?: number | null;
  side?: string | null;
  completed?: boolean;
}

// 'right' | 'left' | 'rotation' all mean bilateral — exercise performed on
// both sides, so multiply reps by 2 for true total.
export function sideMultiplier(side: string | null | undefined): number {
  return !side || side === 'na' ? 1 : 2;
}

export function computeRawsForDay(dayLogs: WorkoutLogRow[]): {
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
    const sets = log.sets ?? 1;
    const reps = log.reps;
    const holdSecs = log.hold_secs;
    const side = log.side ?? 'na';
    const type = log.item_type;
    const name = log.item_name ?? '';

    if (type === 'workout') {
      if (reps != null && reps > 0) {
        strengthVolume += sets * reps * sideMultiplier(side);
      } else if (holdSecs != null && holdSecs > 0) {
        const totalSecs = sets * holdSecs;
        if (holdSecs < 60 && totalSecs < 90) {
          strengthVolume += sets * (holdSecs / 5);
        } else {
          cardioDuration += totalSecs;
        }
      }
    } else if (type === 'warmup' || type === 'cooldown') {
      if (holdSecs != null && holdSecs > 0) {
        mobilityDuration += sets * holdSecs;
      } else if (reps != null && reps > 0) {
        mobilityDuration += sets * reps * 3;
      }
      mobilityNames.add(name);
    }
  }

  const varietyBonus = mobilityDuration > 0
    ? 1 + Math.min(0.3, 0.05 * mobilityNames.size)
    : 1;

  return {
    strengthVolume,
    cardioDuration,
    mobilityEngagement: mobilityDuration * varietyBonus,
  };
}

// Derive actual calendar date from stored week_start_date + day_number.
// week_start_date is always a Monday; day_number is 1-based (1=Mon, 2=Tue, …)
//
// Uses local-date formatting (not .toISOString()) deliberately: converting a
// local-midnight Date to UTC before slicing the date string rolls the date
// back by one day in any positive-UTC-offset timezone — including IST,
// where every one of this app's users lives. That bug shipped here until
// the unit tests below caught it (2026-07-06).
export function logDate(row: WorkoutLogRow): string {
  const d = new Date(row.week_start_date + 'T00:00:00');
  d.setDate(d.getDate() + ((row.day_number ?? 1) - 1));
  return toLocalDateStr(d);
}

export function buildTrainingLoadResult(logs: WorkoutLogRow[], now: Date = new Date()): TrainingLoadResult {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayStr = toLocalDateStr(today);

  const d30 = new Date(today); d30.setDate(d30.getDate() - 29);
  const d90 = new Date(today); d90.setDate(d90.getDate() - 89);
  const cutoff30 = toLocalDateStr(d30);
  const cutoff90 = toLocalDateStr(d90);

  const byDate = new Map<string, WorkoutLogRow[]>();
  for (const log of logs) {
    const date = logDate(log);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(log);
  }

  const rawByDate = new Map<string, { s: number; c: number; m: number }>();
  for (const [date, dayLogs] of byDate.entries()) {
    const { strengthVolume, cardioDuration, mobilityEngagement } = computeRawsForDay(dayLogs);
    if (strengthVolume > 0 || cardioDuration > 0 || mobilityEngagement > 0) {
      rawByDate.set(date, { s: strengthVolume, c: cardioDuration, m: mobilityEngagement });
    }
  }

  const loggedDays30 = [...rawByDate.keys()].filter(d => d >= cutoff30 && d <= todayStr);
  const calibrating = loggedDays30.length < 5;

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
    if (raw === 0) return null;
    if (baseline === 0) return 50;
    return Math.min(100, Math.round((raw / baseline) * 50));
  }

  const scores: DailyTrainingScore[] = allSortedDates
    .filter(d => d >= cutoff90 && d <= todayStr)
    .map(d => {
      const raw = rawByDate.get(d)!;
      return {
        date: d,
        strengthScore: score(raw.s, baselineS),
        cardioScore: score(raw.c, baselineC),
        mobilityScore: score(raw.m, baselineM),
      };
    });

  return { scores, calibrating };
}
