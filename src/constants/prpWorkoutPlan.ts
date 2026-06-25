// PRP (Posture Recode Protocol) workout plan
// 3 environments x 3 intensities x 6 days

export type PrpExercise = {
  name:     string;
  beginner: string;
  medium:   string;
  hard:     string;
};

export type PrpDayPlan = {
  warmup:   PrpExercise[];
  workout:  PrpExercise[];
  cooldown: PrpExercise[];
};

// PRP_PLAN[environment][dayNumber (1-6)]
export const PRP_PLAN: Record<string, Record<number, PrpDayPlan>> = {
  home: {
    1: {
      warmup: [
        { name: "Shoulder rolls", beginner: "1 x 15 reps | each side | rest 30 secs", medium: "2 x 12 reps | each side | rest 30 secs", hard: "3 x 10 reps | each side | rest 30 secs" },
        { name: "Cat-cow", beginner: "1 x 15 reps | hold 2s | rest 30 secs", medium: "2 x 12 reps | hold 2s | rest 30 secs", hard: "3 x 10 reps | hold 2s | rest 30 secs" },
        { name: "Leg Raises", beginner: "1 x 15 reps | each side | hold 1s | rest 30 secs", medium: "2 x 12 reps | each side | hold 1s | rest 30 secs", hard: "3 x 10 reps | each side | hold 1s | rest 30 secs" },
      ],
      workout: [
        { name: "Wall push-up plus", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Glute bridge", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Dead bug", beginner: "2 x 10 reps | each side | rest 30 secs", medium: "3 x 15 reps | each side | rest 30 secs", hard: "5 x 20 reps | each side | rest 30 secs" },
      ],
      cooldown: [
        { name: "Doorway chest stretch", beginner: "", medium: "", hard: "" },
      ],
    },
    2: {
      warmup: [
        { name: "Child's pose", beginner: "1 x 15 reps | hold 2s | rest 30 secs", medium: "2 x 12 reps | hold 2s | rest 30 secs", hard: "3 x 10 reps | hold 2s | rest 30 secs" },
        { name: "Ankle circles", beginner: "1 x 15 reps | each side | hold 1s | rest 30 secs", medium: "2 x 12 reps | each side | hold 1s | rest 30 secs", hard: "3 x 10 reps | each side | hold 1s | rest 30 secs" },
        { name: "Neck circles", beginner: "1 x 15 reps | each side | rest 30 secs", medium: "2 x 12 reps | each side | rest 30 secs", hard: "3 x 10 reps | each side | rest 30 secs" },
      ],
      workout: [
        { name: "Band row", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Heel taps", beginner: "2 x 10 reps | each side | rest 30 secs", medium: "3 x 15 reps | each side | rest 30 secs", hard: "5 x 20 reps | each side | rest 30 secs" },
        { name: "Wall slide", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
      ],
      cooldown: [
        { name: "Child's pose", beginner: "", medium: "", hard: "" },
      ],
    },
    3: {
      warmup: [
        { name: "Shoulder rolls", beginner: "1 x 15 reps | each side | rest 30 secs", medium: "2 x 12 reps | each side | rest 30 secs", hard: "3 x 10 reps | each side | rest 30 secs" },
        { name: "Cat-cow", beginner: "1 x 15 reps | hold 2s | rest 30 secs", medium: "2 x 12 reps | hold 2s | rest 30 secs", hard: "3 x 10 reps | hold 2s | rest 30 secs" },
        { name: "Leg Raises", beginner: "1 x 15 reps | each side | hold 1s | rest 30 secs", medium: "2 x 12 reps | each side | hold 1s | rest 30 secs", hard: "3 x 10 reps | each side | hold 1s | rest 30 secs" },
      ],
      workout: [
        { name: "Chair sit-to-stand", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Glute bridge", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Split squat support hold", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
      ],
      cooldown: [
        { name: "Lat stretch", beginner: "", medium: "", hard: "" },
      ],
    },
    4: {
      warmup: [
        { name: "Child's pose", beginner: "1 x 15 reps | hold 2s | rest 30 secs", medium: "2 x 12 reps | hold 2s | rest 30 secs", hard: "3 x 10 reps | hold 2s | rest 30 secs" },
        { name: "Ankle circles", beginner: "1 x 15 reps | each side | hold 1s | rest 30 secs", medium: "2 x 12 reps | each side | hold 1s | rest 30 secs", hard: "3 x 10 reps | each side | hold 1s | rest 30 secs" },
        { name: "Neck circles", beginner: "1 x 15 reps | each side | rest 30 secs", medium: "2 x 12 reps | each side | rest 30 secs", hard: "3 x 10 reps | each side | rest 30 secs" },
      ],
      workout: [
        { name: "Yoga wheel thoracic opener", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Hip flexor stretch", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Hamstring stretch", beginner: "2 x 10 reps | each side | rest 30 secs", medium: "3 x 15 reps | each side | rest 30 secs", hard: "5 x 20 reps | each side | rest 30 secs" },
      ],
      cooldown: [
        { name: "Neck side stretch", beginner: "", medium: "", hard: "" },
      ],
    },
    5: {
      warmup: [
        { name: "Shoulder rolls", beginner: "1 x 15 reps | each side | rest 30 secs", medium: "2 x 12 reps | each side | rest 30 secs", hard: "3 x 10 reps | each side | rest 30 secs" },
        { name: "Cat-cow", beginner: "1 x 15 reps | hold 2s | rest 30 secs", medium: "2 x 12 reps | hold 2s | rest 30 secs", hard: "3 x 10 reps | hold 2s | rest 30 secs" },
        { name: "Leg Raises", beginner: "1 x 15 reps | each side | hold 1s | rest 30 secs", medium: "2 x 12 reps | each side | hold 1s | rest 30 secs", hard: "3 x 10 reps | each side | hold 1s | rest 30 secs" },
      ],
      workout: [
        { name: "Glute bridge", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Bird dog", beginner: "2 x 10 reps | each side | rest 30 secs", medium: "3 x 15 reps | each side | rest 30 secs", hard: "5 x 20 reps | each side | rest 30 secs" },
        { name: "Band pull-aparts", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
      ],
      cooldown: [
        { name: "Cat-cow", beginner: "", medium: "", hard: "" },
      ],
    },
    6: {
      warmup: [
        { name: "Child's pose", beginner: "1 x 15 reps | hold 2s | rest 30 secs", medium: "2 x 12 reps | hold 2s | rest 30 secs", hard: "3 x 10 reps | hold 2s | rest 30 secs" },
        { name: "Ankle circles", beginner: "1 x 15 reps | each side | hold 1s | rest 30 secs", medium: "2 x 12 reps | each side | hold 1s | rest 30 secs", hard: "3 x 10 reps | each side | hold 1s | rest 30 secs" },
        { name: "Neck circles", beginner: "1 x 15 reps | each side | rest 30 secs", medium: "2 x 12 reps | each side | rest 30 secs", hard: "3 x 10 reps | each side | rest 30 secs" },
      ],
      workout: [
        { name: "Back extension", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Seated cable face pull", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Assisted split squat", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
      ],
      cooldown: [
        { name: "Doorway chest stretch", beginner: "", medium: "", hard: "" },
      ],
    },
  },
  gym: {
    1: {
      warmup: [
        { name: "Thoracic foam roller extension", beginner: "1 x 10 reps | each side | rest 30", medium: "1 x 10 reps | each side | rest 30", hard: "1 x 10 reps | each side | rest 30" },
        { name: "Band pull apart", beginner: "1 x 15 reps | rest 30", medium: "1 x 15 reps | rest 30", hard: "1 x 15 reps | rest 30" },
        { name: "Shoulder CARs", beginner: "1 x 15 reps | each side | rest 20", medium: "1 x 15 reps | each side | rest 20", hard: "1 x 15 reps | each side | rest 20" },
      ],
      workout: [
        { name: "Seated cable row", beginner: "2 x 12 reps | rest 45", medium: "3 x 12 reps | rest 45", hard: "4 x 12 reps | rest 45" },
        { name: "Chest supported row", beginner: "2 x 12 reps | rest 45", medium: "3 x 12 reps | rest 45", hard: "4 x 12 reps | rest 45" },
        { name: "Face pull", beginner: "2 x 15 reps | rest 45", medium: "3 x 15 reps | rest 45", hard: "4 x 15 reps | rest 45" },
        { name: "Reverse pec deck", beginner: "2 x 12 reps | rest 45", medium: "3 x 12 reps | rest 45", hard: "4 x 12 reps | rest 45" },
        { name: "Farmer carry", beginner: "2 sets | rest 45", medium: "3 sets | rest 45", hard: "4 sets | rest 45" },
      ],
      cooldown: [
        { name: "Doorway chest stretch", beginner: "", medium: "", hard: "" },
      ],
    },
    2: {
      warmup: [
        { name: "Hip circles", beginner: "1 x 10 reps | each side | rest 20", medium: "1 x 10 reps | each side | rest 20", hard: "1 x 10 reps | each side | rest 20" },
        { name: "Glute bridge activation", beginner: "1 x 12 reps | rest 30", medium: "1 x 12 reps | rest 30", hard: "1 x 12 reps | rest 30" },
        { name: "Ankle dorsiflexion rocks", beginner: "1 x 15 reps | each side | rest 20", medium: "1 x 15 reps | each side | rest 20", hard: "1 x 15 reps | each side | rest 20" },
      ],
      workout: [
        { name: "Hip thrust", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Romanian deadlift", beginner: "2 x 10 reps | rest 60", medium: "3 x 10 reps | rest 60", hard: "4 x 10 reps | rest 60" },
        { name: "Leg press", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Cable pull through", beginner: "2 x 15 reps | rest 45", medium: "3 x 15 reps | rest 45", hard: "4 x 15 reps | rest 45" },
        { name: "Walking lunge", beginner: "2 x 12 reps | each side | rest 45", medium: "3 x 12 reps | each side | rest 45", hard: "4 x 12 reps | each side | rest 45" },
      ],
      cooldown: [
        { name: "Hip flexor stretch", beginner: "", medium: "", hard: "" },
      ],
    },
    3: {
      warmup: [
        { name: "Cat-cow", beginner: "1 x 15 reps | rest 20", medium: "1 x 15 reps | rest 20", hard: "1 x 15 reps | rest 20" },
        { name: "90/90 breathing drill", beginner: "1 x 12 reps | rest 30", medium: "1 x 12 reps | rest 30", hard: "1 x 12 reps | rest 30" },
        { name: "Dead bug prep", beginner: "1 x 12 reps | each side | rest 20", medium: "1 x 12 reps | each side | rest 20", hard: "1 x 12 reps | each side | rest 20" },
      ],
      workout: [
        { name: "Pallof press", beginner: "2 x 12 reps | each side | rest 45", medium: "3 x 12 reps | each side | rest 45", hard: "4 x 12 reps | each side | rest 45" },
        { name: "Cable wood chop", beginner: "2 x 12 reps | each side | rest 45", medium: "3 x 12 reps | each side | rest 45", hard: "4 x 12 reps | each side | rest 45" },
        { name: "Dead bug", beginner: "2 x 10 reps | each side | rest 45", medium: "3 x 10 reps | each side | rest 45", hard: "4 x 10 reps | each side | rest 45" },
        { name: "Hanging knee raise", beginner: "2 x 10 reps | rest 45", medium: "3 x 10 reps | rest 45", hard: "4 x 10 reps | rest 45" },
        { name: "Front plank", beginner: "2 sets | hold 20s | rest 45", medium: "3 sets | hold 20s | rest 45", hard: "4 sets | hold 20s | rest 45" },
      ],
      cooldown: [
        { name: "Child's pose", beginner: "", medium: "", hard: "" },
      ],
    },
    4: {
      warmup: [
        { name: "Band dislocations", beginner: "1 x 10 reps | rest 20", medium: "1 x 10 reps | rest 20", hard: "1 x 10 reps | rest 20" },
        { name: "Arm circles", beginner: "1 x 10 reps | each side | rest 20", medium: "1 x 10 reps | each side | rest 20", hard: "1 x 10 reps | each side | rest 20" },
        { name: "Thoracic extension on bench", beginner: "1 x 10 reps | rest 20", medium: "1 x 10 reps | rest 20", hard: "1 x 10 reps | rest 20" },
      ],
      workout: [
        { name: "Incline dumbbell press", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Landmine press", beginner: "2 x 10 reps | each side | rest 60", medium: "3 x 10 reps | each side | rest 60", hard: "4 x 10 reps | each side | rest 60" },
        { name: "Cable external rotation", beginner: "2 x 15 reps | each side | rest 45", medium: "3 x 15 reps | each side | rest 45", hard: "4 x 15 reps | each side | rest 45" },
        { name: "Scapular push-up", beginner: "2 x 12 reps | rest 45", medium: "3 x 12 reps | rest 45", hard: "4 x 12 reps | rest 45" },
        { name: "Reverse pec deck", beginner: "2 x 12 reps | rest 45", medium: "3 x 12 reps | rest 45", hard: "4 x 12 reps | rest 45" },
      ],
      cooldown: [
        { name: "Pec stretch", beginner: "", medium: "", hard: "" },
      ],
    },
    5: {
      warmup: [
        { name: "Hip hinge drill", beginner: "1 x 12 reps | rest 20", medium: "1 x 12 reps | rest 20", hard: "1 x 12 reps | rest 20" },
        { name: "Glute activation band walk", beginner: "1 x 12 reps | each side | rest 20", medium: "1 x 12 reps | each side | rest 20", hard: "1 x 12 reps | each side | rest 20" },
        { name: "Bird-dog", beginner: "1 x 15 reps | each side | rest 20", medium: "1 x 15 reps | each side | rest 20", hard: "1 x 15 reps | each side | rest 20" },
      ],
      workout: [
        { name: "Trap bar deadlift", beginner: "2 x 8 reps | rest 75", medium: "3 x 8 reps | rest 75", hard: "4 x 8 reps | rest 75" },
        { name: "Lat pulldown", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Back extension", beginner: "2 x 12 reps | rest 45", medium: "3 x 12 reps | rest 45", hard: "4 x 12 reps | rest 45" },
        { name: "Suitcase carry", beginner: "2 sets | each side | rest 45", medium: "3 sets | each side | rest 45", hard: "4 sets | each side | rest 45" },
        { name: "Cable row", beginner: "2 x 12 reps | rest 45", medium: "3 x 12 reps | rest 45", hard: "4 x 12 reps | rest 45" },
      ],
      cooldown: [
        { name: "Hamstring stretch", beginner: "", medium: "", hard: "" },
      ],
    },
    6: {
      warmup: [
        { name: "Dynamic mobility flow", beginner: "1 x 12 reps | rest 25", medium: "1 x 12 reps | rest 25", hard: "1 x 12 reps | rest 25" },
        { name: "Inchworm", beginner: "1 x 15 reps | rest 20", medium: "1 x 15 reps | rest 20", hard: "1 x 15 reps | rest 20" },
        { name: "Bodyweight squat", beginner: "1 x 15 reps | rest 20", medium: "1 x 15 reps | rest 20", hard: "1 x 15 reps | rest 20" },
      ],
      workout: [
        { name: "Goblet squat", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Cable row", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Dumbbell Romanian deadlift", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Farmer carry", beginner: "2 sets | rest 45", medium: "3 sets | rest 45", hard: "4 sets | rest 45" },
        { name: "Sled push", beginner: "2 sets | rest 60", medium: "3 sets | rest 60", hard: "4 sets | rest 60" },
      ],
      cooldown: [
        { name: "Doorway chest stretch", beginner: "", medium: "", hard: "" },
      ],
    },
  },
  hybrid: {
    1: {
      warmup: [
        { name: "Shoulder rolls", beginner: "1 x 15 reps | each side | rest 30 secs", medium: "2 x 12 reps | each side | rest 30 secs", hard: "3 x 10 reps | each side | rest 30 secs" },
        { name: "Cat-cow", beginner: "1 x 15 reps | hold 2s | rest 30 secs", medium: "2 x 12 reps | hold 2s | rest 30 secs", hard: "3 x 10 reps | hold 2s | rest 30 secs" },
        { name: "Leg Raises", beginner: "1 x 15 reps | each side | hold 1s | rest 30 secs", medium: "2 x 12 reps | each side | hold 1s | rest 30 secs", hard: "3 x 10 reps | each side | hold 1s | rest 30 secs" },
      ],
      workout: [
        { name: "Wall push-up plus", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Glute bridge", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Dead bug", beginner: "2 x 10 reps | each side | rest 30 secs", medium: "3 x 15 reps | each side | rest 30 secs", hard: "5 x 20 reps | each side | rest 30 secs" },
      ],
      cooldown: [
        { name: "Doorway chest stretch", beginner: "", medium: "", hard: "" },
      ],
    },
    2: {
      warmup: [
        { name: "Hip circles", beginner: "1 x 10 reps | each side | rest 20", medium: "1 x 10 reps | each side | rest 20", hard: "1 x 10 reps | each side | rest 20" },
        { name: "Glute bridge activation", beginner: "1 x 12 reps | rest 30", medium: "1 x 12 reps | rest 30", hard: "1 x 12 reps | rest 30" },
        { name: "Ankle dorsiflexion rocks", beginner: "1 x 15 reps | each side | rest 20", medium: "1 x 15 reps | each side | rest 20", hard: "1 x 15 reps | each side | rest 20" },
      ],
      workout: [
        { name: "Hip thrust", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Romanian deadlift", beginner: "2 x 10 reps | rest 60", medium: "3 x 10 reps | rest 60", hard: "4 x 10 reps | rest 60" },
        { name: "Leg press", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Cable pull through", beginner: "2 x 15 reps | rest 45", medium: "3 x 15 reps | rest 45", hard: "4 x 15 reps | rest 45" },
        { name: "Walking lunge", beginner: "2 x 12 reps | each side | rest 45", medium: "3 x 12 reps | each side | rest 45", hard: "4 x 12 reps | each side | rest 45" },
      ],
      cooldown: [
        { name: "Hip flexor stretch", beginner: "", medium: "", hard: "" },
      ],
    },
    3: {
      warmup: [
        { name: "Shoulder rolls", beginner: "1 x 15 reps | each side | rest 30 secs", medium: "2 x 12 reps | each side | rest 30 secs", hard: "3 x 10 reps | each side | rest 30 secs" },
        { name: "Cat-cow", beginner: "1 x 15 reps | hold 2s | rest 30 secs", medium: "2 x 12 reps | hold 2s | rest 30 secs", hard: "3 x 10 reps | hold 2s | rest 30 secs" },
        { name: "Leg Raises", beginner: "1 x 15 reps | each side | hold 1s | rest 30 secs", medium: "2 x 12 reps | each side | hold 1s | rest 30 secs", hard: "3 x 10 reps | each side | hold 1s | rest 30 secs" },
      ],
      workout: [
        { name: "Chair sit-to-stand", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Glute bridge", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Split squat support hold", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
      ],
      cooldown: [
        { name: "Lat stretch", beginner: "", medium: "", hard: "" },
      ],
    },
    4: {
      warmup: [
        { name: "Band dislocations", beginner: "1 x 10 reps | rest 20", medium: "1 x 10 reps | rest 20", hard: "1 x 10 reps | rest 20" },
        { name: "Arm circles", beginner: "1 x 10 reps | each side | rest 20", medium: "1 x 10 reps | each side | rest 20", hard: "1 x 10 reps | each side | rest 20" },
        { name: "Thoracic extension on bench", beginner: "1 x 10 reps | rest 20", medium: "1 x 10 reps | rest 20", hard: "1 x 10 reps | rest 20" },
      ],
      workout: [
        { name: "Incline dumbbell press", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Landmine press", beginner: "2 x 10 reps | each side | rest 60", medium: "3 x 10 reps | each side | rest 60", hard: "4 x 10 reps | each side | rest 60" },
        { name: "Cable external rotation", beginner: "2 x 15 reps | each side | rest 45", medium: "3 x 15 reps | each side | rest 45", hard: "4 x 15 reps | each side | rest 45" },
        { name: "Scapular push-up", beginner: "2 x 12 reps | rest 45", medium: "3 x 12 reps | rest 45", hard: "4 x 12 reps | rest 45" },
        { name: "Reverse pec deck", beginner: "2 x 12 reps | rest 45", medium: "3 x 12 reps | rest 45", hard: "4 x 12 reps | rest 45" },
      ],
      cooldown: [
        { name: "Pec stretch", beginner: "", medium: "", hard: "" },
      ],
    },
    5: {
      warmup: [
        { name: "Shoulder rolls", beginner: "1 x 15 reps | each side | rest 30 secs", medium: "2 x 12 reps | each side | rest 30 secs", hard: "3 x 10 reps | each side | rest 30 secs" },
        { name: "Cat-cow", beginner: "1 x 15 reps | hold 2s | rest 30 secs", medium: "2 x 12 reps | hold 2s | rest 30 secs", hard: "3 x 10 reps | hold 2s | rest 30 secs" },
        { name: "Leg Raises", beginner: "1 x 15 reps | each side | hold 1s | rest 30 secs", medium: "2 x 12 reps | each side | hold 1s | rest 30 secs", hard: "3 x 10 reps | each side | hold 1s | rest 30 secs" },
      ],
      workout: [
        { name: "Glute bridge", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
        { name: "Bird dog", beginner: "2 x 10 reps | each side | rest 30 secs", medium: "3 x 15 reps | each side | rest 30 secs", hard: "5 x 20 reps | each side | rest 30 secs" },
        { name: "Band pull-aparts", beginner: "2 x 10 reps | rest 30 secs", medium: "3 x 15 reps | rest 30 secs", hard: "5 x 20 reps | rest 30 secs" },
      ],
      cooldown: [
        { name: "Cat-cow", beginner: "", medium: "", hard: "" },
      ],
    },
    6: {
      warmup: [
        { name: "Dynamic mobility flow", beginner: "1 x 12 reps | rest 25", medium: "1 x 12 reps | rest 25", hard: "1 x 12 reps | rest 25" },
        { name: "Inchworm", beginner: "1 x 15 reps | rest 20", medium: "1 x 15 reps | rest 20", hard: "1 x 15 reps | rest 20" },
        { name: "Bodyweight squat", beginner: "1 x 15 reps | rest 20", medium: "1 x 15 reps | rest 20", hard: "1 x 15 reps | rest 20" },
      ],
      workout: [
        { name: "Goblet squat", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Cable row", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Dumbbell Romanian deadlift", beginner: "2 x 12 reps | rest 60", medium: "3 x 12 reps | rest 60", hard: "4 x 12 reps | rest 60" },
        { name: "Farmer carry", beginner: "2 sets | rest 45", medium: "3 sets | rest 45", hard: "4 sets | rest 45" },
        { name: "Sled push", beginner: "2 sets | rest 60", medium: "3 sets | rest 60", hard: "4 sets | rest 60" },
      ],
      cooldown: [
        { name: "Doorway chest stretch", beginner: "", medium: "", hard: "" },
      ],
    },
  },
};
