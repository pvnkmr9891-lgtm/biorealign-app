// FBR — Future Body Reset · Beginner · Hybrid
// Age 6–12 · 12 weeks · 6 days/week · 30–45 min · Low-to-moderate intensity
// Pattern: Home (odd days 1,3,5) · Gym (even days 2,4,6)
// Source: "01 - FBR - 6-12 - Beginner -Hybrid.xlsx"

import type { PlanDay } from './fbr_beginner_home';

export const FBR_BEGINNER_HYBRID_DAYS: PlanDay[] = [
  {
    day_number: 1,
    title: 'Day 1 — Movement Foundations',
    subtitle: '🏠 Home · Animal walks · Strength basics',
    focus: 'full_body',
    estimated_mins: 35,
    color: '#10B981',
    environment: 'home',
    sections: [
      {
        title: 'Warm-Up',
        type: 'warmup',
        sort_order: 1,
        exercises: [
          { name: 'Animal Walk — Bear Crawl', sets: 1, reps: '10', rest_seconds: 30 },
          { name: 'Jumping Jacks', sets: 1, reps: '15', rest_seconds: 30 },
          { name: 'Arm Circles', instructions: 'Each side — Right then Left', sets: 1, reps: '10 each side', rest_seconds: 30 },
        ],
      },
      {
        title: 'Main Workout',
        type: 'main',
        sort_order: 2,
        exercises: [
          { name: 'Bodyweight Squat (chair-assisted)', sets: 2, reps: '8', rest_seconds: 30 },
          { name: 'Wall Push-Up', sets: 2, reps: '8', rest_seconds: 30 },
          { name: 'Animal Balance — Flamingo Stand', instructions: 'Hold on each side — Right then Left. Stand tall, focus on a fixed point.', sets: 2, is_timed: true, duration_seconds: 15, rest_seconds: 30 },
        ],
      },
      {
        title: 'Cool-Down',
        type: 'cooldown',
        sort_order: 3,
        exercises: [
          { name: 'Standing Forward Fold Stretch', rest_seconds: 0 },
        ],
      },
    ],
  },
  {
    day_number: 2,
    title: 'Day 2 — Machine Basics',
    subtitle: '🏋️ Gym · Cone drill · Seated row · Leg press',
    focus: 'full_body',
    estimated_mins: 35,
    color: '#6EE7B7',
    environment: 'gym',
    sections: [
      {
        title: 'Warm-Up',
        type: 'warmup',
        sort_order: 1,
        exercises: [
          { name: 'Cone Weave Run (slow)', sets: 1, is_timed: true, duration_seconds: 20, rest_seconds: 30 },
          { name: 'Hip Circles', instructions: 'Each side — Right then Left', sets: 1, reps: '10 each side', rest_seconds: 30 },
          { name: 'Toy Soldier March', sets: 1, reps: '10', rest_seconds: 30 },
        ],
      },
      {
        title: 'Main Workout',
        type: 'main',
        sort_order: 2,
        exercises: [
          { name: 'Seated Row Machine (very light load)', sets: 2, reps: '10', rest_seconds: 30 },
          { name: 'Leg Press Machine (very light load)', sets: 2, reps: '10', rest_seconds: 30 },
          { name: 'Stability Ball Sit (core hold)', sets: 2, is_timed: true, duration_seconds: 15, rest_seconds: 30 },
        ],
      },
      {
        title: 'Cool-Down',
        type: 'cooldown',
        sort_order: 3,
        exercises: [
          { name: "Child's Pose", rest_seconds: 0 },
        ],
      },
    ],
  },
  {
    day_number: 3,
    title: 'Day 3 — Balance & Lower Body',
    subtitle: '🏠 Home · Single-leg stability · Lower body strength',
    focus: 'lower_body',
    estimated_mins: 35,
    color: '#34D399',
    environment: 'home',
    sections: [
      {
        title: 'Warm-Up',
        type: 'warmup',
        sort_order: 1,
        exercises: [
          { name: 'Animal Walk — Bear Crawl', sets: 1, reps: '10', rest_seconds: 30 },
          { name: 'High Knees (marching)', sets: 1, reps: '15', rest_seconds: 30 },
          { name: 'Shoulder Rolls', instructions: 'Each side — forward and back', sets: 1, reps: '10 each side', rest_seconds: 30 },
        ],
      },
      {
        title: 'Main Workout',
        type: 'main',
        sort_order: 2,
        exercises: [
          { name: 'Sit-to-Stand from Low Chair', sets: 2, reps: '8', rest_seconds: 30 },
          { name: 'Animal Balance — Tree Pose', instructions: 'Hold on each side — Right then Left. Stand tall, arms out for balance.', sets: 2, is_timed: true, duration_seconds: 15, rest_seconds: 30 },
          { name: 'Standing Calf Raise', sets: 2, reps: '10', rest_seconds: 30 },
        ],
      },
      {
        title: 'Cool-Down',
        type: 'cooldown',
        sort_order: 3,
        exercises: [
          { name: 'Side Reach Stretch', rest_seconds: 0 },
        ],
      },
    ],
  },
  {
    day_number: 4,
    title: 'Day 4 — Pull & Press',
    subtitle: '🏋️ Gym · Cone drill · Assisted pull-up · Chest press',
    focus: 'upper_body',
    estimated_mins: 40,
    color: '#059669',
    environment: 'gym',
    sections: [
      {
        title: 'Warm-Up',
        type: 'warmup',
        sort_order: 1,
        exercises: [
          { name: 'Cone Weave Run (slow)', sets: 1, is_timed: true, duration_seconds: 20, rest_seconds: 30 },
          { name: 'Arm Circles', instructions: 'Each side — Right then Left', sets: 1, reps: '10 each side', rest_seconds: 30 },
          { name: 'High Knees (marching)', sets: 1, reps: '15', rest_seconds: 30 },
        ],
      },
      {
        title: 'Main Workout',
        type: 'main',
        sort_order: 2,
        exercises: [
          { name: 'Assisted Pull-Up Machine (counterweight, light)', sets: 2, reps: '6', rest_seconds: 30 },
          { name: 'Chest Press Machine (very light load)', sets: 2, reps: '10', rest_seconds: 30 },
          { name: 'Stability Ball Plank (knees down)', sets: 2, is_timed: true, duration_seconds: 10, rest_seconds: 30 },
        ],
      },
      {
        title: 'Cool-Down',
        type: 'cooldown',
        sort_order: 3,
        exercises: [
          { name: 'Butterfly Stretch', rest_seconds: 0 },
        ],
      },
    ],
  },
  {
    day_number: 5,
    title: 'Day 5 — Strength Repeat',
    subtitle: '🏠 Home · Reinforce Day 1 patterns',
    focus: 'full_body',
    estimated_mins: 35,
    color: '#10B981',
    environment: 'home',
    sections: [
      {
        title: 'Warm-Up',
        type: 'warmup',
        sort_order: 1,
        exercises: [
          { name: 'Animal Walk — Crab Walk', sets: 1, is_timed: true, duration_seconds: 15, rest_seconds: 30 },
          { name: 'Toy Soldier March', sets: 1, reps: '10', rest_seconds: 30 },
          { name: 'Arm Circles', instructions: 'Each side — Right then Left', sets: 1, reps: '10 each side', rest_seconds: 30 },
        ],
      },
      {
        title: 'Main Workout',
        type: 'main',
        sort_order: 2,
        exercises: [
          { name: 'Bodyweight Squat (chair-assisted)', sets: 2, reps: '8', rest_seconds: 30 },
          { name: 'Animal Balance — Flamingo Stand', instructions: 'Hold on each side — Right then Left', sets: 2, is_timed: true, duration_seconds: 15, rest_seconds: 30 },
          { name: 'Wall Push-Up', sets: 2, reps: '8', rest_seconds: 30 },
        ],
      },
      {
        title: 'Cool-Down',
        type: 'cooldown',
        sort_order: 3,
        exercises: [
          { name: 'Standing Forward Fold Stretch', rest_seconds: 0 },
        ],
      },
    ],
  },
  {
    day_number: 6,
    title: 'Day 6 — Full Body Finish',
    subtitle: '🏋️ Gym · Combination · Weekly closer',
    focus: 'full_body',
    estimated_mins: 40,
    color: '#047857',
    environment: 'gym',
    sections: [
      {
        title: 'Warm-Up',
        type: 'warmup',
        sort_order: 1,
        exercises: [
          { name: 'Cone Weave Run (slow)', sets: 1, is_timed: true, duration_seconds: 20, rest_seconds: 30 },
          { name: 'Hip Circles', instructions: 'Each side — Right then Left', sets: 1, reps: '10 each side', rest_seconds: 30 },
          { name: 'Jumping Jacks', sets: 1, reps: '15', rest_seconds: 30 },
        ],
      },
      {
        title: 'Main Workout',
        type: 'main',
        sort_order: 2,
        exercises: [
          { name: 'Mini Hurdle Hops (low hurdles)', sets: 2, reps: '8', rest_seconds: 30 },
          { name: 'Leg Press Machine (very light load)', sets: 2, reps: '10', rest_seconds: 30 },
          { name: 'Medicine Ball Overhead Hold (light ball)', sets: 2, is_timed: true, duration_seconds: 15, rest_seconds: 30 },
        ],
      },
      {
        title: 'Cool-Down',
        type: 'cooldown',
        sort_order: 3,
        exercises: [
          { name: 'Standing Forward Fold Stretch', rest_seconds: 0 },
        ],
      },
    ],
  },
];
