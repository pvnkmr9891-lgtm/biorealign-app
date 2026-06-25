// FBR — Future Body Reset · Beginner · Home
// Age 6–12 · 12 weeks · 6 days/week · 30–45 min · Low-to-moderate intensity
// Source: "01 - FBR - 6-12 - Beginner.xlsx" — Home environment rows

export interface PlanExercise {
  name: string;
  instructions?: string;
  sets?: number;
  reps?: string;
  is_timed?: boolean;
  duration_seconds?: number;
  rest_seconds: number;
  coach_tip?: string;
}

export interface PlanSection {
  title: string;
  type: 'warmup' | 'main' | 'cooldown';
  sort_order: number;
  exercises: PlanExercise[];
}

export interface PlanDay {
  day_number: number;
  title: string;
  subtitle: string;
  focus: string;
  estimated_mins: number;
  color: string;
  environment?: 'home' | 'gym' | null;
  sections: PlanSection[];
}

export const FBR_BEGINNER_HOME_DAYS: PlanDay[] = [
  {
    day_number: 1,
    title: 'Day 1 — Movement Foundations',
    subtitle: 'Animal walks · Strength basics',
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
    title: 'Day 2 — Core & Mobility',
    subtitle: 'Stability · Core activation',
    focus: 'core',
    estimated_mins: 35,
    color: '#6EE7B7',
    environment: 'home',
    sections: [
      {
        title: 'Warm-Up',
        type: 'warmup',
        sort_order: 1,
        exercises: [
          { name: 'Toy Soldier March', sets: 1, reps: '10', rest_seconds: 30 },
          { name: 'Hula Hoop Waist Twist', sets: 1, is_timed: true, duration_seconds: 20, rest_seconds: 30 },
          { name: 'Ankle Circles', instructions: 'Each side — Right then Left', sets: 1, reps: '10 each side', rest_seconds: 30 },
        ],
      },
      {
        title: 'Main Workout',
        type: 'main',
        sort_order: 2,
        exercises: [
          { name: 'Crab Walk', sets: 2, is_timed: true, duration_seconds: 15, rest_seconds: 30 },
          { name: 'Standing Knee Raises', instructions: 'Alternate Right and Left', sets: 2, reps: '10 each side', rest_seconds: 30 },
          { name: 'Superman Hold', sets: 2, is_timed: true, duration_seconds: 10, rest_seconds: 30 },
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
    subtitle: 'Single-leg stability · Lower body strength',
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
    title: 'Day 4 — Agility & Upper Body',
    subtitle: 'Lateral movement · Pushing & pulling',
    focus: 'upper_body',
    estimated_mins: 40,
    color: '#059669',
    environment: 'home',
    sections: [
      {
        title: 'Warm-Up',
        type: 'warmup',
        sort_order: 1,
        exercises: [
          { name: 'Jumping Jacks', sets: 1, reps: '15', rest_seconds: 30 },
          { name: 'Cat-Cow', instructions: 'Slow and controlled. Hold each end position for 2 seconds.', sets: 1, reps: '12', rest_seconds: 30 },
          { name: 'Neck Side Stretch', instructions: 'Hold each side for full duration — Right then Left', sets: 1, is_timed: true, duration_seconds: 15, rest_seconds: 30 },
        ],
      },
      {
        title: 'Main Workout',
        type: 'main',
        sort_order: 2,
        exercises: [
          { name: 'Skater Hops (lateral jumps)', instructions: 'Jump side to side, alternating Right and Left', sets: 2, reps: '8 each side', rest_seconds: 30 },
          { name: 'Plank Hold (knees down)', sets: 2, is_timed: true, duration_seconds: 10, rest_seconds: 30 },
          { name: 'Standing Band Row (light resistance band)', sets: 2, reps: '10', rest_seconds: 30 },
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
    subtitle: 'Reinforce Day 1 patterns',
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
    subtitle: 'Combination · Weekly closer',
    focus: 'full_body',
    estimated_mins: 40,
    color: '#047857',
    environment: 'home',
    sections: [
      {
        title: 'Warm-Up',
        type: 'warmup',
        sort_order: 1,
        exercises: [
          { name: 'High Knees (marching)', sets: 1, reps: '15', rest_seconds: 30 },
          { name: 'Hula Hoop Waist Twist', sets: 1, is_timed: true, duration_seconds: 20, rest_seconds: 30 },
          { name: 'Ankle Circles', instructions: 'Each side — Right then Left', sets: 1, reps: '10 each side', rest_seconds: 30 },
        ],
      },
      {
        title: 'Main Workout',
        type: 'main',
        sort_order: 2,
        exercises: [
          { name: 'Standing Knee Raises', instructions: 'Alternate Right and Left', sets: 2, reps: '10 each side', rest_seconds: 30 },
          { name: 'Superman Hold', sets: 2, is_timed: true, duration_seconds: 10, rest_seconds: 30 },
          { name: 'Skater Hops (lateral jumps)', instructions: 'Alternate Right and Left', sets: 2, reps: '8 each side', rest_seconds: 30 },
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
];
