import { supabase } from '@/lib/supabase';
import { FBR_BEGINNER_HOME_DAYS } from '@/constants/workoutPlans/fbr_beginner_home';
import { FBR_BEGINNER_GYM_DAYS } from '@/constants/workoutPlans/fbr_beginner_gym';
import { FBR_BEGINNER_HYBRID_DAYS } from '@/constants/workoutPlans/fbr_beginner_hybrid';
import type { PlanDay } from '@/constants/workoutPlans/fbr_beginner_home';

export function isFBRBeginner(
  programId: string | null | undefined,
  intensity: string | null | undefined,
): boolean {
  return (
    (programId === 'total_transformation' || programId === 'FBR') &&
    intensity === 'beginner'
  );
}

function planDaysForTrainingType(trainingType: string | null | undefined): PlanDay[] {
  if (trainingType === 'gym') return FBR_BEGINNER_GYM_DAYS;
  if (trainingType === 'hybrid') return FBR_BEGINNER_HYBRID_DAYS;
  return FBR_BEGINNER_HOME_DAYS;
}

function formatExerciseLabel(ex: any): string {
  let label = ex.name;
  if (ex.sets && ex.reps) label += ` — ${ex.sets}×${ex.reps}`;
  else if (ex.sets && ex.duration_seconds) label += ` — ${ex.sets}×${ex.duration_seconds}s`;
  else if (ex.sets) label += ` — ${ex.sets} sets`;
  return label;
}

export function planDaysToLogRows(
  days: PlanDay[],
  userId: string,
  weekStart: string,
) {
  const rows: any[] = [];
  for (const day of days) {
    for (const section of day.sections) {
      const itemType = section.type === 'main' ? 'workout' : section.type;
      section.exercises.forEach((ex, idx) => {
        rows.push({
          client_id:       userId,
          week_start_date: weekStart,
          day_number:      day.day_number,
          item_type:       itemType,
          item_name:       formatExerciseLabel(ex),
          item_order:      idx + 1,
          completed:       false,
        });
      });
    }
  }
  return rows;
}

// Directly seeds manual_workout_logs for the current week — no intermediate plan tables
export async function assignFBRBeginnerPlan(
  userId: string,
  trainingType: string | null | undefined,
  weekStart: string,
): Promise<void> {
  // Remove existing warmup/workout/cooldown rows for this week
  await supabase
    .from('manual_workout_logs')
    .delete()
    .eq('client_id', userId)
    .eq('week_start_date', weekStart)
    .in('item_type', ['warmup', 'workout', 'cooldown']);

  const days = planDaysForTrainingType(trainingType);
  const rows = planDaysToLogRows(days, userId, weekStart);

  if (rows.length) {
    const { error } = await supabase.from('manual_workout_logs').insert(rows);
    if (error) throw error;
  }
}
