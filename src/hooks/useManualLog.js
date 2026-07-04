// src/hooks/useManualLog.js
import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { PRP_PLAN } from '../constants/prpWorkoutPlan';
import { planDaysToLogRows } from './useAssignWorkoutPlan';
import { FBR_BEGINNER_HOME_DAYS } from '../constants/workoutPlans/fbr_beginner_home';
import { FBR_BEGINNER_GYM_DAYS } from '../constants/workoutPlans/fbr_beginner_gym';
import { FBR_BEGINNER_HYBRID_DAYS } from '../constants/workoutPlans/fbr_beginner_hybrid';
import { getFBRNutritionPlan, getFBRAgeGroup } from '../constants/nutritionPlans/index';
import { PROGRAMS_ENABLED } from '../constants/featureFlags';

// ── Default 6-day template ────────────────────────────────────────────
// Warmup starts blank in Lite mode — clients build their own warmup with
// the "+" add-exercise flow (see AddExerciseModal in workout-plan.tsx).
const WARMUP_ITEMS = [];

// Cooldown starts blank in Lite mode too — same as Warmup/Workout, clients
// build their own cooldown with the "+" add-exercise flow.
const COOLDOWN_ITEMS = [];

const WATER_ITEMS = [
  { name: 'Wake-up water',        order: 1  },
  { name: 'Morning water',        order: 2  },
  { name: 'Pre-breakfast water',  order: 3  },
  { name: 'Breakfast water',      order: 4  },
  { name: 'Mid-morning water',    order: 5  },
  { name: 'Pre-lunch water',      order: 6  },
  { name: 'Lunch water',          order: 7  },
  { name: 'Post-lunch water',     order: 8  },
  { name: 'Afternoon water',      order: 9  },
  { name: 'Pre-workout water',    order: 10 },
  { name: 'During workout water', order: 11 },
  { name: 'Post-workout water',   order: 12 },
  { name: 'Bedtime water',        order: 13 },
];

// Food starts blank in Lite mode too — same as Warmup/Workout/Cooldown.
// Clients build each of the 5 meal-time sections (Morning Drink, Breakfast,
// Lunch, Evening Snacks, Dinner) with the "+" add-food flow. Each row's
// meal_slot column carries which of the 5 sections it belongs to.
const FOOD_ITEMS = [];

// Workout starts blank in Lite mode too — same as Warmup, clients build
// their own session with the "+" add-exercise flow.
const WORKOUT_BY_DAY = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

export const DEFAULT_TEMPLATE = [1, 2, 3, 4, 5, 6].map((dayNum) => ({
  day_number: dayNum,
  sections: {
    warmup:   WARMUP_ITEMS,
    workout:  WORKOUT_BY_DAY[dayNum],
    cooldown: COOLDOWN_ITEMS,
    water:    WATER_ITEMS,
    food:     FOOD_ITEMS,
  },
}));

// ── Utils ─────────────────────────────────────────────────────────────
function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekStart(fromDate = new Date()) {
  const d   = new Date(fromDate);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  d.setHours(0, 0, 0, 0);
  return toLocalDateStr(d);
}

export function getDayDate(weekStart, dayNumber) {
  const [y, m, day] = weekStart.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() + (dayNumber - 1));
  return d;
}

export function isToday(weekStart, dayNumber) {
  const d = getDayDate(weekStart, dayNumber);
  const t = new Date();
  return d.getDate()     === t.getDate()     &&
         d.getMonth()    === t.getMonth()    &&
         d.getFullYear() === t.getFullYear();
}

export function isPast(weekStart, dayNumber) {
  const d = getDayDate(weekStart, dayNumber);
  d.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return d < t;
}

function buildDefaultRows(userId, weekStart) {
  const rows = [];
  DEFAULT_TEMPLATE.forEach(({ day_number, sections }) => {
    Object.entries(sections).forEach(([itemType, items]) => {
      items.forEach(({ name, order }) => {
        rows.push({
          client_id:       userId,
          week_start_date: weekStart,
          day_number,
          item_type:   itemType,
          item_name:   name,
          item_order:  order,
          completed:   false,
          completed_at: null,
        });
      });
    });
  });
  return rows;
}

// Returns 0, 6, or 12 — the offset into the 18-day FBR nutrition rotation for a given week
function getFBRNutritionOffset(weekStart, programStartDate) {
  const ws = new Date(weekStart);
  ws.setHours(0, 0, 0, 0);
  const ps = new Date(programStartDate);
  const startMonday = new Date(ps);
  const dow = startMonday.getDay();
  startMonday.setDate(startMonday.getDate() + (dow === 0 ? -6 : 1 - dow));
  startMonday.setHours(0, 0, 0, 0);
  const weeksSince = Math.max(0, Math.round((ws - startMonday) / (7 * 24 * 60 * 60 * 1000)));
  return (weeksSince % 3) * 6;
}

export function groupLogs(logs = []) {
  const grouped = {};
  logs.forEach((log) => {
    if (!grouped[log.day_number]) grouped[log.day_number] = {};
    if (!grouped[log.day_number][log.item_type]) grouped[log.day_number][log.item_type] = [];
    grouped[log.day_number][log.item_type].push(log);
  });
  Object.values(grouped).forEach((day) => {
    Object.values(day).forEach((items) => {
      items.sort((a, b) => a.item_order - b.item_order);
    });
  });
  return grouped;
}

export function dayProgress(grouped, dayNumber) {
  const day = grouped[dayNumber] || {};
  let total = 0; let done = 0;
  Object.values(day).forEach((items) => {
    total += items.length;
    done  += items.filter((i) => i.completed).length;
  });
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

const logKey = (userId, weekStart) => ['manual_logs', userId, weekStart];

// ── Main hook ─────────────────────────────────────────────────────────
export function useManualLog(userId, profile, weekStartOverride) {
  const queryClient    = useQueryClient();
  const weekStart      = weekStartOverride ?? getWeekStart();
  const currentWeekStart = getWeekStart();
  const qKey           = logKey(userId, weekStart);
  const [isInitialising, setIsInitialising] = useState(false); // FIX 2

  // Fetch logs for this week
  const { data: logs = [], isLoading, isError } = useQuery({
    queryKey: qKey,
    enabled:  !!userId,
    staleTime: 1000 * 60 * 5,
    // A coach can add/remove exercises or meals directly from their portal
    // (a different device/session), which this client query has no other
    // way to learn about. Poll in the background so additions show up
    // without the client needing to leave and reopen the screen.
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manual_workout_logs')
        .select('*')
        .eq('client_id', userId)
        .eq('week_start_date', weekStart)
        .order('day_number')
        .order('item_order');
      if (error) throw error;
      return data ?? [];
    },
  });

  // FIX 1: useCallback is now imported at the top
  const initWeek = useCallback(async () => {
    if (!userId || !weekStart) return;
    console.log('[initWeek] profile:', JSON.stringify({
    workout_program_id:    profile?.workout_program_id,
    workout_training_type: profile?.workout_training_type,
    workout_intensity:     profile?.workout_intensity,
  }));
  console.log('[initWeek] shouldInit fired, userId:', userId);
    setIsInitialising(true);

    try {
      const isPRP = profile?.workout_program_id === '3-PRP'
                 || profile?.workout_program_id === 'posture_realignment';

      if (isPRP) {
        // ── PRP path: client-side seed from PRP_PLAN constants ───────
        const trainingType = profile?.workout_training_type ?? 'home';
        const intensity    = profile?.workout_intensity     ?? 'beginner';
        const envPlan      = PRP_PLAN[trainingType] ?? PRP_PLAN['home'];

        const prpRows = [];
        for (let dayNum = 1; dayNum <= 6; dayNum++) {
          const dayPlan = envPlan[dayNum];
          if (!dayPlan) continue;
          const sections = { warmup: dayPlan.warmup, workout: dayPlan.workout, cooldown: dayPlan.cooldown };
          Object.entries(sections).forEach(([sectionKey, exercises]) => {
            exercises.forEach((ex, idx) => {
              const detail = ex[intensity] || '';
              const itemName = detail ? `${ex.name} — ${detail}` : ex.name;
              prpRows.push({
                client_id:       userId,
                week_start_date: weekStart,
                day_number:      dayNum,
                item_type:       sectionKey,
                item_name:       itemName,
                item_order:      idx + 1,
                completed:       false,
              });
            });
          });
        }

        if (prpRows.length) {
          const { error } = await supabase.from('manual_workout_logs').insert(prpRows);
          if (error) console.error('PRP seed failed:', error.message);
        }

        // Water + food: day_number is NOT NULL on this table, so these can't
        // actually be shared via day_number=null — seed each of the 6 days.
        const waterRows = [];
        const foodRows = [];
        for (let dayNum = 1; dayNum <= 6; dayNum++) {
          WATER_ITEMS.forEach((item) => waterRows.push({
            client_id: userId, week_start_date: weekStart, day_number: dayNum,
            item_type: 'water', item_name: item.name, item_order: item.order, completed: false,
          }));
          FOOD_ITEMS.forEach((item) => foodRows.push({
            client_id: userId, week_start_date: weekStart, day_number: dayNum,
            item_type: 'food', item_name: item.name, item_order: item.order, completed: false,
          }));
        }

        if (waterRows.length) await supabase.from('manual_workout_logs').upsert(waterRows);
        if (foodRows.length)  await supabase.from('manual_workout_logs').upsert(foodRows);

      } else {
        const programId    = profile?.workout_program_id ?? '';
        const intensity    = profile?.workout_intensity ?? 'beginner';
        const trainingType = profile?.workout_training_type ?? 'home';
        const isFBR = PROGRAMS_ENABLED && (programId === 'total_transformation' || programId === 'FBR');

        if (isFBR) {
          // ── FBR path: seed workout from TypeScript plan constants ──
          let days = FBR_BEGINNER_HOME_DAYS;
          if (trainingType === 'gym') days = FBR_BEGINNER_GYM_DAYS;
          else if (trainingType === 'hybrid') days = FBR_BEGINNER_HYBRID_DAYS;
          const rows = planDaysToLogRows(days, userId, weekStart);
          if (rows.length) {
            const { error } = await supabase.from('manual_workout_logs').insert(rows);
            if (error) console.error('FBR seed failed:', error.message);
          }

          // ── FBR nutrition: day-specific rows using 18-day rotation ─
          const programStartDate = profile?.workout_start_date ?? profile?.onboarding_completed_at ?? weekStart;
          const nutritionOffset  = getFBRNutritionOffset(weekStart, programStartDate);
          const dietType    = profile?.diet_type ?? 'veg';
          const ageGroup    = getFBRAgeGroup(profile?.dob);
          const intensityKey = intensity === 'medium' ? 'medium' : intensity === 'hard' ? 'hard' : 'beginner';
          const nutritionPlan = getFBRNutritionPlan(dietType, ageGroup, intensityKey);
          const fbrFoodRows = [];
          for (let dayNum = 1; dayNum <= 6; dayNum++) {
            const nutritionDayIndex = (nutritionOffset + (dayNum - 1)) % 18;
            const dayPlan = nutritionPlan[nutritionDayIndex];
            if (!dayPlan) continue;
            dayPlan.meals.forEach((meal) => {
              fbrFoodRows.push({
                client_id: userId, week_start_date: weekStart, day_number: dayNum,
                item_type: 'food', item_name: meal.name, item_order: meal.order, completed: false,
              });
            });
          }
          if (fbrFoodRows.length) await supabase.from('manual_workout_logs').upsert(fbrFoodRows);
        } else {
          // ── Fallback: static 6-day template ────────────────────────
          const rows = buildDefaultRows(userId, weekStart);
          const { error } = await supabase.from('manual_workout_logs').insert(rows);
          if (error) console.error('Default seed failed:', error.message);
        }

        // Water: day_number is NOT NULL on this table, so it can't actually
        // be shared via day_number=null — seed each of the 6 days.
        const waterRows = [];
        for (let dayNum = 1; dayNum <= 6; dayNum++) {
          WATER_ITEMS.forEach((item) => waterRows.push({
            client_id: userId, week_start_date: weekStart, day_number: dayNum,
            item_type: 'water', item_name: item.name, item_order: item.order, completed: false,
          }));
        }
        if (waterRows.length) await supabase.from('manual_workout_logs').upsert(waterRows);

        // Food — only for non-FBR programs; FBR already seeded day-specific food above
        if (!isFBR) {
          const foodRows = [];
          for (let dayNum = 1; dayNum <= 6; dayNum++) {
            FOOD_ITEMS.forEach((item) => foodRows.push({
              client_id: userId, week_start_date: weekStart, day_number: dayNum,
              item_type: 'food', item_name: item.name, item_order: item.order, completed: false,
            }));
          }
          if (foodRows.length) await supabase.from('manual_workout_logs').upsert(foodRows);
        }
      }

      await queryClient.invalidateQueries({ queryKey: qKey });
    } finally {
      setIsInitialising(false);
    }
  }, [userId, weekStart, profile, queryClient, qKey]);

  // ── Batch save ────────────────────────────────────────────────────
  const { mutateAsync: batchSave, isPending: isSaving } = useMutation({
    mutationFn: async (updates) => {
      const promises = updates.map(({ id, completed, completed_at }) =>
        supabase
          .from('manual_workout_logs')
          .update({ completed, completed_at })
          .eq('id', id)
          .eq('client_id', userId)
      );
      const results = await Promise.all(promises);
      const failed  = results.find(r => r.error);
      if (failed) throw failed.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      queryClient.invalidateQueries({ queryKey: ['alignment', userId] });
      queryClient.invalidateQueries({ queryKey: ['client_streaks', userId] });
      queryClient.invalidateQueries({ queryKey: ['client', userId, 'week_activity'] });
      queryClient.invalidateQueries({ queryKey: ['client', userId, 'total_days_logged'] });
      queryClient.invalidateQueries({ queryKey: ['client', userId, 'week_stats'] });
    },
  });

  // Re-seeds only the food rows for the current week with a new diet_type.
  // Called when the user flips the veg/non-veg toggle.
  const reseedFood = useCallback(async (newDietType) => {
    if (!userId || !weekStart) return;
    const programId    = profile?.workout_program_id ?? '';
    const intensity    = profile?.workout_intensity ?? 'beginner';
    const isFBR = PROGRAMS_ENABLED && (programId === 'total_transformation' || programId === 'FBR');
    if (!isFBR) return;

    setIsInitialising(true);
    try {
      // Delete existing food rows for this week
      await supabase
        .from('manual_workout_logs')
        .delete()
        .eq('client_id', userId)
        .eq('week_start_date', weekStart)
        .eq('item_type', 'food');

      // Re-seed with new diet type
      const programStartDate = profile?.workout_start_date ?? profile?.onboarding_completed_at ?? weekStart;
      const nutritionOffset  = getFBRNutritionOffset(weekStart, programStartDate);
      const ageGroup    = getFBRAgeGroup(profile?.dob);
      const intensityKey = intensity === 'medium' ? 'medium' : intensity === 'hard' ? 'hard' : 'beginner';
      const nutritionPlan = getFBRNutritionPlan(newDietType, ageGroup, intensityKey);
      const foodRows = [];
      for (let dayNum = 1; dayNum <= 6; dayNum++) {
        const nutritionDayIndex = (nutritionOffset + (dayNum - 1)) % 18;
        const dayPlan = nutritionPlan[nutritionDayIndex];
        if (!dayPlan) continue;
        dayPlan.meals.forEach((meal) => {
          foodRows.push({
            client_id: userId, week_start_date: weekStart, day_number: dayNum,
            item_type: 'food', item_name: meal.name, item_order: meal.order, completed: false,
          });
        });
      }
      if (foodRows.length) await supabase.from('manual_workout_logs').insert(foodRows);
      await queryClient.invalidateQueries({ queryKey: qKey });
    } finally {
      setIsInitialising(false);
    }
  }, [userId, weekStart, profile, queryClient, qKey]);

  // Water is the only section still backed by a fixed template
  // (WATER_ITEMS). It's normally bulk-seeded by initWeek, but initWeek only
  // runs when the week has zero rows at all — so a week that already has
  // custom warmup/workout/food rows (added via "+") never gets its water
  // rows seeded. Without real rows, the UI falls back to per-day preview
  // placeholders, and Save was only persisting the ones you'd checked,
  // making the rest disappear. This ensures water gets its own real rows
  // independent of whatever else exists in the week.
  const needsWaterSeed = !isLoading && !isError && WATER_ITEMS.length > 0
    && !logs.some((l) => l.item_type === 'water');

  const { mutateAsync: ensureWaterSeeded } = useMutation({
    mutationFn: async () => {
      // day_number is NOT NULL on this table — water can't actually be
      // shared via day_number=null (that insert silently fails). Seed all
      // 13 items for each of the 6 days instead, same as the one seeding
      // path that has ever worked correctly.
      const waterRows = [];
      for (let dayNum = 1; dayNum <= 6; dayNum++) {
        WATER_ITEMS.forEach((item) => {
          waterRows.push({
            client_id: userId, week_start_date: weekStart, day_number: dayNum,
            item_type: 'water', item_name: item.name, item_order: item.order, completed: false,
          });
        });
      }
      if (waterRows.length) await supabase.from('manual_workout_logs').upsert(waterRows);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  // Add a single client-authored exercise/food item to a section/day
  // (immediate insert, not gated behind the batch Save button — mirrors
  // plan-add-exercise.tsx). mealSlot is only set for food items, to bucket
  // them into one of the 5 meal-time sections while keeping item_type
  // uniformly 'food' (alignment scoring filters on item_type='food').
  const { mutateAsync: addItem, isPending: isAdding } = useMutation({
    mutationFn: async ({
      dayNumber, itemType, itemName, itemOrder, mealSlot,
      sets, reps, side, holdSecs, restSecs,
      quantity, calories, proteinG, carbsG, fatG,
    }) => {
      const { error } = await supabase.from('manual_workout_logs').upsert({
        client_id:       userId,
        week_start_date: weekStart,
        day_number:      dayNumber,
        item_type:       itemType,
        item_name:       itemName,
        item_order:      itemOrder,
        completed:       false,
        meal_slot:       mealSlot ?? null,
        sets:            sets ?? null,
        reps:            reps ?? null,
        side:            side ?? null,
        hold_secs:       holdSecs ?? null,
        rest_secs:       restSecs ?? null,
        quantity:        quantity ?? null,
        calories:        calories ?? null,
        protein_g:       proteinG ?? null,
        carbs_g:         carbsG ?? null,
        fat_g:           fatG ?? null,
        is_custom:       true,
      }, {
        onConflict: 'client_id,week_start_date,day_number,item_type,item_name',
        ignoreDuplicates: true,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  // Remove a client-authored exercise.
  const { mutateAsync: removeItem, isPending: isRemoving } = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('manual_workout_logs')
        .delete()
        .eq('id', id)
        .eq('client_id', userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const shouldInit = !isLoading && !isError && logs.length === 0;

  return {
    logs,
    grouped:   groupLogs(logs),
    weekStart,
    isLoading: isLoading || isInitialising,
    isSaving,
    isAdding,
    isRemoving,
    shouldInit,
    initWeek,
    needsWaterSeed,
    ensureWaterSeeded,
    reseedFood,
    batchSave,
    addItem,
    removeItem,
    dayProgress,
  };
}
