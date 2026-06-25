// FBR — Future Body Reset · Beginner · Gym
// Age 6–12 · 12 weeks · 6 days/week · 30–45 min · Low-to-moderate intensity
// Source: "01 - FBR - 6-12 - Beginner -Gym.xlsx"

import type { PlanDay } from './fbr_beginner_home';

export const FBR_BEGINNER_GYM_DAYS: PlanDay[] = [
  {
    day_number: 1,
    title: 'Day 1 — Speed & Power Intro',
    subtitle: 'Agility ladder · Medicine ball · Battle rope',
    focus: 'full_body',
    estimated_mins: 35,
    color: '#10B981',
    environment: 'gym',
    sections: [
      {
        title: 'Warm-Up',
        type: 'warmup',
        sort_order: 1,
        exercises: [
          { name: 'Agility Ladder — Basic Run', sets: 1, is_timed: true, duration_seconds: 20, rest_seconds: 30 },
          { name: 'Jumping Jacks', sets: 1, reps: '15', rest_seconds: 30 },
          { name: 'Dynamic Arm Swings', instructions: 'Each side — Right then Left', sets: 1, reps: '10 each side', rest_seconds: 30 },
        ],
      },
      {
        title: 'Main Workout',
        type: 'main',
        sort_order: 2,
        exercises: [
          { name: 'Mini Medicine Ball Chest Pass (against wall)', sets: 2, reps: '10', rest_seconds: 30 },
          { name: 'Assisted Box Step-Up (low box)', instructions: 'Alternate Right and Left leg', sets: 2, reps: '8 each side', rest_seconds: 30 },
          { name: 'Battle Rope Light Waves (coach-supervised)', sets: 2, is_timed: true, duration_seconds: 15, rest_seconds: 30 },
        ],
      },
      {
        title: 'Cool-Down',
        type: 'cooldown',
        sort_order: 3,
        exercises: [
          { name: 'Standing Quad Stretch', rest_seconds: 0 },
        ],
      },
    ],
  },
  {
    day_number: 2,
    title: 'Day 2 — Machine Basics',
    subtitle: 'Cone drill · Seated row · Leg press',
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
    title: 'Day 3 — Hurdles & Lat Work',
    subtitle: 'Agility · Lat pulldown · Medicine ball hold',
    focus: 'upper_body',
    estimated_mins: 35,
    color: '#34D399',
    environment: 'gym',
    sections: [
      {
        title: 'Warm-Up',
        type: 'warmup',
        sort_order: 1,
        exercises: [
          { name: 'Agility Ladder — Basic Run', sets: 1, is_timed: true, duration_seconds: 20, rest_seconds: 30 },
          { name: 'Jumping Jacks', sets: 1, reps: '15', rest_seconds: 30 },
          { name: 'Neck Circles', instructions: 'Each side — Right then Left', sets: 1, reps: '10 each side', rest_seconds: 30 },
        ],
      },
      {
        title: 'Main Workout',
        type: 'main',
        sort_order: 2,
        exercises: [
          { name: 'Mini Hurdle Hops (low hurdles)', sets: 2, reps: '8', rest_seconds: 30 },
          { name: 'Lat Pulldown Machine (very light load)', sets: 2, reps: '10', rest_seconds: 30 },
          { name: 'Medicine Ball Overhead Hold (light ball)', sets: 2, is_timed: true, duration_seconds: 15, rest_seconds: 30 },
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
    subtitle: 'Cone drill · Assisted pull-up · Chest press',
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
    subtitle: 'Reinforce Day 1 patterns — gym style',
    focus: 'full_body',
    estimated_mins: 35,
    color: '#10B981',
    environment: 'gym',
    sections: [
      {
        title: 'Warm-Up',
        type: 'warmup',
        sort_order: 1,
        exercises: [
          { name: 'Agility Ladder — Basic Run', sets: 1, is_timed: true, duration_seconds: 20, rest_seconds: 30 },
          { name: 'Dynamic Arm Swings', instructions: 'Each side — Right then Left', sets: 1, reps: '10 each side', rest_seconds: 30 },
          { name: 'Toy Soldier March', sets: 1, reps: '10', rest_seconds: 30 },
        ],
      },
      {
        title: 'Main Workout',
        type: 'main',
        sort_order: 2,
        exercises: [
          { name: 'Mini Medicine Ball Chest Pass (against wall)', sets: 2, reps: '10', rest_seconds: 30 },
          { name: 'Assisted Box Step-Up (low box)', instructions: 'Alternate Right and Left leg', sets: 2, reps: '8 each side', rest_seconds: 30 },
          { name: 'Seated Row Machine (very light load)', sets: 2, reps: '10', rest_seconds: 30 },
        ],
      },
      {
        title: 'Cool-Down',
        type: 'cooldown',
        sort_order: 3,
        exercises: [
          { name: 'Standing Quad Stretch', rest_seconds: 0 },
        ],
      },
    ],
  },
  {
    day_number: 6,
    title: 'Day 6 — Full Body Finish',
    subtitle: 'Combination · Weekly closer — gym style',
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
