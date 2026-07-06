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
// The actual scoring math lives in src/lib/trainingLoadMath.ts (unit tested
// there, free of Supabase/RN imports). This file is just the data-fetching
// glue.
//
// TODO: Strength score is volume-only (sets × reps) because the workout log schema
// does not capture weight/load. To improve accuracy, add an optional weight_kg field
// to manual_workout_logs and change Strength to: sets × reps × weight (volume-load).
// See: https://en.wikipedia.org/wiki/Training_volume

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { buildTrainingLoadResult } from '@/lib/trainingLoadMath';
export type { DailyTrainingScore, TrainingLoadResult } from '@/lib/trainingLoadMath';

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
