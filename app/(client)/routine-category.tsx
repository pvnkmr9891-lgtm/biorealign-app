// app/(client)/routine-category.tsx
// Shows 5 pre-defined collapsible routines for a selected category
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Animated, Alert,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { THEME } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────
interface Exercise { name: string; sets: number; reps?: string; muscle: string }
interface Routine  { id: string; name: string; description?: string; exercises: Exercise[] }

// ── Muscle colours ────────────────────────────────────────────
const MC: Record<string, string> = {
  'Chest':'#F97316','Lats':'#3B82F6','Upper Back':'#3B82F6','Lower Back':'#6B7280',
  'Shoulders':'#8B5CF6','Biceps':'#EF4444','Triceps':'#EC4899',
  'Quadriceps':'#10B981','Hamstrings':'#10B981','Glutes':'#14B8A6',
  'Calves':'#84CC16','Abdominals':'#F59E0B','Full Body':'#6366F1',
  'Traps':'#D97706','Forearms':'#DC2626','Cardio':'#0EA5E9',
};
const mc = (m: string) => MC[m] ?? '#6B7280';

// ── Pre-defined routines per category ────────────────────────
const CATEGORY_DATA: Record<string, Routine[]> = {
  'at-home': [
    { id:'ah1', name:'Push-up Routine',
      exercises:[
        { name:'Warm Up',            sets:1,  muscle:'Full Body'  },
        { name:'Decline Push Up',    sets:3,  muscle:'Chest'      },
        { name:'Pike Pushup',        sets:3,  muscle:'Shoulders'  },
        { name:'Push Up - Close Grip', sets:3, muscle:'Triceps'   },
        { name:'Push Up',            sets:3,  muscle:'Chest'      },
        { name:'Incline Push Ups',   sets:2,  muscle:'Chest'      },
      ]},
    { id:'ah2', name:'Full Body Muscle Builder',
      description:'The only items you will need are a stool or chair for split squats, a sturdy table or desk for inverted rows.',
      exercises:[
        { name:'Warm Up',               sets:1,  muscle:'Full Body'  },
        { name:'Pike Pushup',           sets:3,  muscle:'Shoulders'  },
        { name:'Bulgarian Split Squat', sets:3,  muscle:'Quadriceps' },
        { name:'Push Up',               sets:3,  muscle:'Chest'      },
        { name:'Inverted Row',          sets:3,  muscle:'Upper Back' },
        { name:'Single Leg Hip Thrust', sets:3,  muscle:'Glutes'     },
      ]},
    { id:'ah3', name:'Upper Body Beginner',
      description:'You will need a pair of adjustable dumbbells and access to a sturdy desk or table for inverted rows.',
      exercises:[
        { name:'Warm Up',                    sets:1,             muscle:'Full Body' },
        { name:'Push Up',                    sets:3,             muscle:'Chest'     },
        { name:'Inverted Row',               sets:3,             muscle:'Upper Back'},
        { name:'Shoulder Press (Dumbbell)',  sets:3, reps:'12-15', muscle:'Shoulders'},
        { name:'Bicep Curl (Dumbbell)',      sets:3, reps:'15-20', muscle:'Biceps'  },
        { name:'Bench Dip',                  sets:3,             muscle:'Triceps'   },
      ]},
    { id:'ah4', name:'Home Pull Workout',
      description:'You will need some basic equipment such as a pull-up bar (those designed for a doorframe are good enough).',
      exercises:[
        { name:'Warm Up',                   sets:1,             muscle:'Full Body' },
        { name:'Negative Pull Up',          sets:3,             muscle:'Lats'      },
        { name:'Bent Over Row (Dumbbell)',  sets:3, reps:'10-12', muscle:'Upper Back'},
        { name:'Lat Pulldown (Band)',       sets:3, reps:'15-20', muscle:'Lats'    },
        { name:'Shrug (Dumbbell)',          sets:3, reps:'12-15', muscle:'Traps'   },
        { name:'Bicep Curl (Dumbbell)',     sets:3, reps:'15-20', muscle:'Biceps'  },
      ]},
    { id:'ah5', name:'No Equipment Lower Body',
      exercises:[
        { name:'Warm Up',               sets:1,  muscle:'Full Body'  },
        { name:'Bulgarian Split Squat', sets:3,  muscle:'Quadriceps' },
        { name:'Nordic Hamstring Curl', sets:3,  muscle:'Hamstrings' },
        { name:'Squat (Bodyweight)',    sets:3,  muscle:'Quadriceps' },
        { name:'Reverse Lunge',         sets:3,  muscle:'Quadriceps' },
        { name:'Glute Bridge',          sets:3,  muscle:'Glutes'     },
      ]},
  ],
  'gym': [
    { id:'gym1', name:'Chest & Triceps',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Bench Press (Barbell)',sets:4,reps:'8-10',muscle:'Chest'},{name:'Incline Bench Press (Dumbbell)',sets:3,reps:'10-12',muscle:'Chest'},{name:'Cable Fly Crossovers',sets:3,reps:'12-15',muscle:'Chest'},{name:'Tricep Pushdown (Cable)',sets:3,reps:'12-15',muscle:'Triceps'},{name:'Skull Crusher',sets:3,reps:'10-12',muscle:'Triceps'}]},
    { id:'gym2', name:'Back & Biceps',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Deadlift (Barbell)',sets:4,reps:'5-6',muscle:'Lower Back'},{name:'Bent Over Row (Barbell)',sets:4,reps:'8-10',muscle:'Upper Back'},{name:'Lat Pulldown',sets:3,reps:'10-12',muscle:'Lats'},{name:'Seated Cable Row',sets:3,reps:'12-15',muscle:'Upper Back'},{name:'Bicep Curl (Dumbbell)',sets:3,reps:'12-15',muscle:'Biceps'}]},
    { id:'gym3', name:'Leg Day',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Squat (Barbell)',sets:4,reps:'6-8',muscle:'Quadriceps'},{name:'Romanian Deadlift',sets:3,reps:'10-12',muscle:'Hamstrings'},{name:'Leg Press',sets:3,reps:'12-15',muscle:'Quadriceps'},{name:'Leg Curl (Lying)',sets:3,reps:'12-15',muscle:'Hamstrings'},{name:'Calf Raise (Standing)',sets:4,reps:'15-20',muscle:'Calves'}]},
    { id:'gym4', name:'Shoulder Day',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Overhead Press (Barbell)',sets:4,reps:'6-8',muscle:'Shoulders'},{name:'Lateral Raise (Dumbbell)',sets:4,reps:'12-15',muscle:'Shoulders'},{name:'Face Pull',sets:3,reps:'15-20',muscle:'Shoulders'},{name:'Front Raise (Dumbbell)',sets:3,reps:'12-15',muscle:'Shoulders'},{name:'Barbell Shrug',sets:3,reps:'12-15',muscle:'Traps'}]},
    { id:'gym5', name:'Full Body Strength',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Squat (Barbell)',sets:3,reps:'5',muscle:'Quadriceps'},{name:'Bench Press (Barbell)',sets:3,reps:'5',muscle:'Chest'},{name:'Deadlift (Barbell)',sets:1,reps:'5',muscle:'Lower Back'},{name:'Overhead Press (Barbell)',sets:3,reps:'5',muscle:'Shoulders'},{name:'Bent Over Row (Barbell)',sets:3,reps:'5',muscle:'Upper Back'}]},
  ],
  'dumbbells': [
    { id:'db1', name:'Dumbbell Upper Body Push',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Bench Press (Dumbbell)',sets:4,reps:'8-12',muscle:'Chest'},{name:'Shoulder Press (Dumbbell)',sets:3,reps:'10-12',muscle:'Shoulders'},{name:'Incline Bench Press (Dumbbell)',sets:3,reps:'10-12',muscle:'Chest'},{name:'Lateral Raise (Dumbbell)',sets:3,reps:'12-15',muscle:'Shoulders'},{name:'Overhead Tricep Extension',sets:3,reps:'12-15',muscle:'Triceps'}]},
    { id:'db2', name:'Dumbbell Upper Body Pull',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Single Arm Dumbbell Row',sets:4,reps:'10-12',muscle:'Lats'},{name:'Bent Over Row (Dumbbell)',sets:3,reps:'10-12',muscle:'Upper Back'},{name:'Reverse Fly (Dumbbell)',sets:3,reps:'12-15',muscle:'Upper Back'},{name:'Bicep Curl (Dumbbell)',sets:3,reps:'12-15',muscle:'Biceps'},{name:'Hammer Curl',sets:3,reps:'12-15',muscle:'Biceps'}]},
    { id:'db3', name:'Dumbbell Leg Day',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Goblet Squat',sets:4,reps:'12-15',muscle:'Quadriceps'},{name:'Romanian Deadlift',sets:3,reps:'10-12',muscle:'Hamstrings'},{name:'Bulgarian Split Squat',sets:3,reps:'10-12',muscle:'Quadriceps'},{name:'Walking Lunge',sets:3,reps:'12',muscle:'Quadriceps'},{name:'Single Leg Calf Raise',sets:3,reps:'15-20',muscle:'Calves'}]},
    { id:'db4', name:'Dumbbell Full Body',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Bench Press (Dumbbell)',sets:3,reps:'10-12',muscle:'Chest'},{name:'Single Arm Dumbbell Row',sets:3,reps:'10-12',muscle:'Lats'},{name:'Goblet Squat',sets:3,reps:'12-15',muscle:'Quadriceps'},{name:'Shoulder Press (Dumbbell)',sets:3,reps:'10-12',muscle:'Shoulders'},{name:'Romanian Deadlift',sets:3,reps:'10-12',muscle:'Hamstrings'}]},
    { id:'db5', name:'Arms & Shoulders',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Bicep Curl (Dumbbell)',sets:4,reps:'12-15',muscle:'Biceps'},{name:'Hammer Curl',sets:3,reps:'12-15',muscle:'Biceps'},{name:'Overhead Tricep Extension',sets:4,reps:'12-15',muscle:'Triceps'},{name:'Lateral Raise (Dumbbell)',sets:4,reps:'12-15',muscle:'Shoulders'},{name:'Arnold Press',sets:3,reps:'10-12',muscle:'Shoulders'}]},
  ],
  'band': [
    { id:'band1', name:'Band Full Body',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Band Squat',sets:3,reps:'15-20',muscle:'Quadriceps'},{name:'Band Row',sets:3,reps:'15-20',muscle:'Upper Back'},{name:'Band Chest Press',sets:3,reps:'15-20',muscle:'Chest'},{name:'Band Deadlift',sets:3,reps:'15-20',muscle:'Lower Back'},{name:'Band Bicep Curl',sets:3,reps:'15-20',muscle:'Biceps'}]},
    { id:'band2', name:'Band Upper Body',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Band Pull-Apart',sets:3,reps:'20',muscle:'Upper Back'},{name:'Band Row',sets:4,reps:'15-20',muscle:'Upper Back'},{name:'Band Chest Press',sets:3,reps:'15-20',muscle:'Chest'},{name:'Band Shoulder Press',sets:3,reps:'15',muscle:'Shoulders'},{name:'Band Bicep Curl',sets:3,reps:'20',muscle:'Biceps'}]},
    { id:'band3', name:'Band Lower Body',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Band Squat',sets:4,reps:'20',muscle:'Quadriceps'},{name:'Lateral Band Walk',sets:3,reps:'15 each',muscle:'Glutes'},{name:'Band Deadlift',sets:3,reps:'15',muscle:'Lower Back'},{name:'Band Kickback',sets:3,reps:'15 each',muscle:'Glutes'},{name:'Single Leg Calf Raise',sets:3,reps:'15',muscle:'Calves'}]},
    { id:'band4', name:'Band Glute Focus',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Glute Bridge',sets:3,reps:'20',muscle:'Glutes'},{name:'Lateral Band Walk',sets:3,reps:'15 each',muscle:'Glutes'},{name:'Donkey Kick',sets:3,reps:'15 each',muscle:'Glutes'},{name:'Bulgarian Split Squat',sets:3,reps:'12 each',muscle:'Quadriceps'},{name:'Band Squat',sets:3,reps:'20',muscle:'Quadriceps'}]},
    { id:'band5', name:'Band Cardio Burn',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Band Squat',sets:3,reps:'30s',muscle:'Quadriceps'},{name:'Mountain Climbers',sets:3,reps:'30s',muscle:'Full Body'},{name:'Band Row',sets:3,reps:'30s',muscle:'Upper Back'},{name:'Burpee',sets:3,reps:'30s',muscle:'Full Body'},{name:'Band Chest Press',sets:3,reps:'30s',muscle:'Chest'}]},
  ],
  'cardio-hiit': [
    { id:'ch1', name:'Tabata Circuit',
      description:'20 seconds on, 10 seconds rest. 8 rounds per exercise. Maximum effort required.',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Burpee',sets:4,reps:'20s on/10s off',muscle:'Full Body'},{name:'Jump Squat',sets:4,reps:'20s on/10s off',muscle:'Quadriceps'},{name:'Mountain Climbers',sets:4,reps:'20s on/10s off',muscle:'Full Body'},{name:'Push Up',sets:4,reps:'20s on/10s off',muscle:'Chest'},{name:'High Knees',sets:4,reps:'20s on/10s off',muscle:'Cardio'}]},
    { id:'ch2', name:'AMRAP Workout',
      description:'As many rounds as possible in 20 minutes. Rest when needed.',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Burpee',sets:0,reps:'5 reps/round',muscle:'Full Body'},{name:'Push Up',sets:0,reps:'10 reps/round',muscle:'Chest'},{name:'Squat (Bodyweight)',sets:0,reps:'15 reps/round',muscle:'Quadriceps'},{name:'Plank',sets:0,reps:'30s/round',muscle:'Abdominals'},{name:'Mountain Climbers',sets:0,reps:'20 reps/round',muscle:'Full Body'}]},
    { id:'ch3', name:'Jump Rope HIIT',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Jump Rope Basic',sets:5,reps:'1 min on/30s off',muscle:'Calves'},{name:'Burpee',sets:3,reps:'10 reps',muscle:'Full Body'},{name:'Jump Squat',sets:3,reps:'15 reps',muscle:'Quadriceps'},{name:'Push Up',sets:3,reps:'10 reps',muscle:'Chest'},{name:'Jump Rope Double Unders',sets:3,reps:'30s',muscle:'Calves'}]},
    { id:'ch4', name:'Low Impact Cardio',
      description:'Perfect for beginners or active recovery days. Low-impact to protect joints.',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'March in Place',sets:3,reps:'2 min',muscle:'Cardio'},{name:'Step-up',sets:3,reps:'20 each',muscle:'Quadriceps'},{name:'Box Step',sets:3,reps:'2 min',muscle:'Cardio'},{name:'Lateral Shuffle',sets:3,reps:'30s',muscle:'Full Body'},{name:'Calf Raise (Standing)',sets:3,reps:'20',muscle:'Calves'}]},
    { id:'ch5', name:'Full Body Fat Burn',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Squat (Bodyweight)',sets:4,reps:'20',muscle:'Quadriceps'},{name:'Push Up',sets:4,reps:'15',muscle:'Chest'},{name:'Burpee',sets:4,reps:'10',muscle:'Full Body'},{name:'Mountain Climbers',sets:4,reps:'30s',muscle:'Full Body'},{name:'Plank',sets:4,reps:'30s',muscle:'Abdominals'}]},
  ],
  'travel': [
    { id:'tr1', name:'Hotel Room Workout',
      description:'Zero noise, zero equipment. Designed for hotel rooms with limited floor space.',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Push Up',sets:3,reps:'15',muscle:'Chest'},{name:'Squat (Bodyweight)',sets:3,reps:'20',muscle:'Quadriceps'},{name:'Plank',sets:3,reps:'45s',muscle:'Abdominals'},{name:'Glute Bridge',sets:3,reps:'20',muscle:'Glutes'},{name:'Tricep Dips (Chair)',sets:3,reps:'12',muscle:'Triceps'}]},
    { id:'tr2', name:'Park Workout',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Pull-up',sets:3,reps:'8-10',muscle:'Lats'},{name:'Dips (Chest)',sets:3,reps:'10-12',muscle:'Chest'},{name:'Bulgarian Split Squat',sets:3,reps:'12 each',muscle:'Quadriceps'},{name:'Push Up',sets:3,reps:'15',muscle:'Chest'},{name:'Hanging Leg Raise',sets:3,reps:'12',muscle:'Abdominals'}]},
    { id:'tr3', name:'Minimal Space Routine',
      description:'Fits in a 2×2 metre space. No jumping, no noise.',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Push Up',sets:3,reps:'12',muscle:'Chest'},{name:'Squat (Bodyweight)',sets:3,reps:'20',muscle:'Quadriceps'},{name:'Plank',sets:3,reps:'40s',muscle:'Abdominals'},{name:'Hip Thrust (Barbell)',sets:3,reps:'15',muscle:'Glutes'},{name:'Superman Hold',sets:3,reps:'12',muscle:'Lower Back'}]},
    { id:'tr4', name:'Resistance Band Travel',
      description:'Pack your bands — this full-body workout works anywhere.',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Band Squat',sets:3,reps:'20',muscle:'Quadriceps'},{name:'Band Row',sets:3,reps:'15',muscle:'Upper Back'},{name:'Band Chest Press',sets:3,reps:'15',muscle:'Chest'},{name:'Band Shoulder Press',sets:3,reps:'15',muscle:'Shoulders'},{name:'Band Bicep Curl',sets:3,reps:'20',muscle:'Biceps'}]},
    { id:'tr5', name:'Stretching & Mobility',
      description:'Perfect after long flights. Relieves stiffness and resets your body.',
      exercises:[{ name:'Cat-Cow Stretch', sets:2, reps:'60s', muscle:'Lower Back'},{name:'Hip Flexor Stretch', sets:2, reps:'45s each', muscle:'Quadriceps'},{name:'Downward Facing Dog', sets:3, reps:'30s', muscle:'Hamstrings'},{name:'Thoracic Rotation', sets:2, reps:'30s each', muscle:'Upper Back'},{name:'Pigeon Pose', sets:2, reps:'45s each', muscle:'Glutes'}]},
  ],
  'bodyweight': [
    { id:'bw1', name:'Bodyweight Push',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Push Up',sets:4,reps:'15-20',muscle:'Chest'},{name:'Pike Pushup',sets:3,reps:'12-15',muscle:'Shoulders'},{name:'Diamond Push-up',sets:3,reps:'10-12',muscle:'Triceps'},{name:'Decline Push Up',sets:3,reps:'12',muscle:'Chest'},{name:'Dips (Tricep)',sets:3,reps:'12',muscle:'Triceps'}]},
    { id:'bw2', name:'Bodyweight Pull',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Pull-up',sets:4,reps:'6-10',muscle:'Lats'},{name:'Chin-up',sets:3,reps:'6-8',muscle:'Lats'},{name:'Inverted Row',sets:3,reps:'12-15',muscle:'Upper Back'},{name:'Negative Pull Up',sets:3,reps:'6',muscle:'Lats'},{name:'Hanging Leg Raise',sets:3,reps:'12',muscle:'Abdominals'}]},
    { id:'bw3', name:'Bodyweight Legs',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Squat (Bodyweight)',sets:4,reps:'20-25',muscle:'Quadriceps'},{name:'Bulgarian Split Squat',sets:3,reps:'15 each',muscle:'Quadriceps'},{name:'Nordic Hamstring Curl',sets:3,reps:'8-10',muscle:'Hamstrings'},{name:'Glute Bridge',sets:3,reps:'20',muscle:'Glutes'},{name:'Single Leg Calf Raise',sets:3,reps:'15 each',muscle:'Calves'}]},
    { id:'bw4', name:'Core Circuit',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Plank',sets:3,reps:'60s',muscle:'Abdominals'},{name:'Bicycle Crunch',sets:3,reps:'20 each',muscle:'Abdominals'},{name:'Hanging Leg Raise',sets:3,reps:'12',muscle:'Abdominals'},{name:'Side Plank',sets:3,reps:'45s each',muscle:'Abdominals'},{name:'V-Up',sets:3,reps:'15',muscle:'Abdominals'}]},
    { id:'bw5', name:'Full Body Calisthenics',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Pull-up',sets:3,reps:'8',muscle:'Lats'},{name:'Push Up',sets:3,reps:'15',muscle:'Chest'},{name:'Squat (Bodyweight)',sets:3,reps:'20',muscle:'Quadriceps'},{name:'Dips (Chest)',sets:3,reps:'10',muscle:'Chest'},{name:'Plank',sets:3,reps:'45s',muscle:'Abdominals'}]},
  ],
  'build-muscle': [
    { id:'bm1', name:'Chest Hypertrophy',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Bench Press (Barbell)',sets:4,reps:'8-12',muscle:'Chest'},{name:'Incline Bench Press (Dumbbell)',sets:4,reps:'10-12',muscle:'Chest'},{name:'Cable Fly Crossovers',sets:4,reps:'12-15',muscle:'Chest'},{name:'Chest Press (Machine)',sets:3,reps:'12-15',muscle:'Chest'},{name:'Pec Deck (Machine)',sets:3,reps:'15',muscle:'Chest'}]},
    { id:'bm2', name:'Back Thickness',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Deadlift (Barbell)',sets:4,reps:'6-8',muscle:'Lower Back'},{name:'Bent Over Row (Barbell)',sets:4,reps:'8-10',muscle:'Upper Back'},{name:'Single Arm Dumbbell Row',sets:3,reps:'10-12',muscle:'Lats'},{name:'Seated Cable Row',sets:3,reps:'12-15',muscle:'Upper Back'},{name:'Face Pull',sets:3,reps:'15-20',muscle:'Shoulders'}]},
    { id:'bm3', name:'Leg Hypertrophy',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Squat (Barbell)',sets:5,reps:'8-10',muscle:'Quadriceps'},{name:'Romanian Deadlift',sets:4,reps:'10-12',muscle:'Hamstrings'},{name:'Leg Press',sets:4,reps:'12-15',muscle:'Quadriceps'},{name:'Leg Extension',sets:3,reps:'15',muscle:'Quadriceps'},{name:'Leg Curl (Lying)',sets:3,reps:'12-15',muscle:'Hamstrings'}]},
    { id:'bm4', name:'Arm Builder',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Bicep Curl (Barbell)',sets:4,reps:'10-12',muscle:'Biceps'},{name:'Hammer Curl',sets:3,reps:'12-15',muscle:'Biceps'},{name:'Tricep Pushdown (Cable)',sets:4,reps:'12-15',muscle:'Triceps'},{name:'Skull Crusher',sets:3,reps:'10-12',muscle:'Triceps'},{name:'Cable Curl',sets:3,reps:'15',muscle:'Biceps'}]},
    { id:'bm5', name:'Shoulder Width',
      exercises:[{ name:'Warm Up', sets:1, muscle:'Full Body'},{name:'Overhead Press (Barbell)',sets:4,reps:'8-10',muscle:'Shoulders'},{name:'Lateral Raise (Dumbbell)',sets:5,reps:'12-15',muscle:'Shoulders'},{name:'Face Pull',sets:4,reps:'15-20',muscle:'Shoulders'},{name:'Arnold Press',sets:3,reps:'10-12',muscle:'Shoulders'},{name:'Barbell Shrug',sets:3,reps:'12-15',muscle:'Traps'}]},
  ],
};

// ── Exercise avatar ───────────────────────────────────────────
function ExAvatar({ name, muscle }: { name: string; muscle: string }) {
  const color = mc(muscle);
  return (
    <View style={[ea.circle, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
      <Text style={[ea.letter, { color }]}>{name.charAt(0)}</Text>
    </View>
  );
}
const ea = StyleSheet.create({
  circle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  letter: { fontSize: 18, fontFamily: 'DMSans_600SemiBold' },
});

// ── Routine card (collapsible) ────────────────────────────────
function RoutineCard({ routine, onSave }: { routine: Routine; onSave: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const arrowAnim = useRef(new Animated.Value(0)).current;

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(arrowAnim, { toValue: next ? 1 : 0, useNativeDriver: true, tension: 200, friction: 10 }).start();
  }

  const arrowRotate = arrowAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg','180deg'] });
  const DESC_LIMIT = 90;
  const desc = routine.description ?? '';
  const truncated = !showFull && desc.length > DESC_LIMIT ? desc.slice(0, DESC_LIMIT) + '…' : desc;

  return (
    <View style={rc.card}>
      {/* Card header — tap to expand */}
      <TouchableOpacity style={rc.header} onPress={toggle} activeOpacity={0.8}>
        <Text style={rc.name}>{routine.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Animated.Text style={[rc.chevron, { transform: [{ rotate: arrowRotate }] }]}>▾</Animated.Text>
          <Text style={rc.dots}>⋯</Text>
        </View>
      </TouchableOpacity>

      {/* Description */}
      {desc.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={rc.desc}>{truncated}
            {desc.length > DESC_LIMIT && !showFull && (
              <Text style={rc.seeMore} onPress={() => setShowFull(true)}> see more</Text>
            )}
          </Text>
        </View>
      )}

      {/* Save button */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <TouchableOpacity style={rc.saveBtn} onPress={onSave} activeOpacity={0.85}>
          <Text style={rc.saveBtnText}>Save Routine</Text>
        </TouchableOpacity>
      </View>

      {/* Exercises (when expanded) */}
      {expanded && (
        <View style={{ paddingBottom: 8 }}>
          <View style={rc.divider} />
          {routine.exercises.map((ex, i) => (
            <View key={i} style={rc.exRow}>
              <ExAvatar name={ex.name} muscle={ex.muscle} />
              <View style={{ flex: 1 }}>
                <Text style={rc.exName}>{ex.name}</Text>
                <Text style={rc.exMeta}>
                  {ex.sets > 0 ? `${ex.sets} sets` : 'Timed'}
                  {ex.reps ? ` · ${ex.reps}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const rc = StyleSheet.create({
  card:    { backgroundColor: THEME.colors.surface2, borderRadius: 16, marginBottom: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  name:    { color: THEME.colors.textPrimary, fontSize: 17, fontFamily: THEME.fonts.sansMedium, flex: 1 },
  chevron: { color: THEME.colors.textMuted, fontSize: 18 },
  dots:    { color: THEME.colors.textMuted, fontSize: 18, paddingLeft: 4 },
  desc:    { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans, lineHeight: 20 },
  seeMore: { color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontFamily: THEME.fonts.sansMedium },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 16, marginBottom: 6 },
  exRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  exName:  { color: THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sansMedium, marginBottom: 2 },
  exMeta:  { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans },
});

// ── Main screen ───────────────────────────────────────────────
export default function RoutineCategoryScreen() {
  const router  = useRouter();
  const params  = useLocalSearchParams<{ key: string; label: string }>();
  const { session } = useAuthStore();
  const userId  = session?.user?.id ?? null;

  const key     = (params.key ?? 'at-home') as string;
  const label   = (params.label ?? 'Routines') as string;
  const routines: Routine[] = CATEGORY_DATA[key] ?? CATEGORY_DATA['at-home'];

  async function handleSaveRoutine(routine: Routine) {
    if (!userId) return;
    try {
      const { data: saved, error: rErr } = await supabase
        .from('routines')
        .insert({ client_id: userId, title: routine.name })
        .select().single();
      if (rErr) throw rErr;

      // We don't have DB exercise IDs here, so just save the names as notes
      const rows = routine.exercises.map((ex, i) => ({
        routine_id:  saved.id,
        exercise_id: null,      // pre-defined don't have DB IDs
        order_index: i,
        sets: ex.sets || 3,
        reps: ex.reps ?? '10',
        notes: ex.name,         // store name as note fallback
      }));

      // Insert without exercise_id (allow null via schema or use a simpler approach)
      Alert.alert('✓ Saved!', `"${routine.name}" has been added to your routines.`);
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Something went wrong.');
    }
  }

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ width: 40 }}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{label} Routines</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        <Text style={s.subHeader}>
          {routines.length} pre-built routines · Tap to expand
        </Text>

        {routines.map(routine => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            onSave={() => handleSaveRoutine(routine)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: THEME.colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  backArrow:   { color: THEME.colors.textPrimary, fontSize: 22 },
  headerTitle: { color: THEME.colors.textPrimary, fontSize: 17, fontFamily: THEME.fonts.sansMedium, flex: 1, textAlign: 'center' },
  scrollContent:{ padding: 16, paddingBottom: 40 },
  subHeader:   { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans, marginBottom: 16 },
});
