import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { ChipSelect } from '@/components/onboarding/ChipSelect';
import { SliderInput } from '@/components/onboarding/SliderInput';
import { useAssessmentStore } from '@/store/assessmentStore';

const BRAND = {
  teal: '#00C4B4',
  bg: '#0A0A0B',
  surface: '#141416',
  border: '#2A2A2E',
  text: '#F0EEE8',
  textMuted: '#6B6B70',
};

const Q = ({ children }: { children: string }) => (
  <Text style={{ fontSize: 17, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, lineHeight: 26, marginBottom: 16 }}>
    {children}
  </Text>
);

const S = ({ children }: { children: string }) => (
  <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: BRAND.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, marginTop: 28 }}>
    {children}
  </Text>
);

const LAST_EXERCISE = [
  { label: 'Currently active', value: 'current', emoji: '🔥' },
  { label: 'Last month', value: '1_month', emoji: '📅' },
  { label: '3–6 months ago', value: '3_6_months', emoji: '⏰' },
  { label: '6–12 months ago', value: '6_12_months', emoji: '📆' },
  { label: 'Over a year ago', value: 'over_year', emoji: '🗓️' },
  { label: 'Never exercised regularly', value: 'never', emoji: '🆕' },
];

const EXERCISE_TYPES = [
  { label: 'Weight training', value: 'weights', emoji: '🏋️' },
  { label: 'Running / cardio', value: 'running', emoji: '🏃' },
  { label: 'Yoga / stretching', value: 'yoga', emoji: '🧘' },
  { label: 'Swimming', value: 'swimming', emoji: '🏊' },
  { label: 'Sports', value: 'sports', emoji: '⚽' },
  { label: 'Cycling', value: 'cycling', emoji: '🚴' },
  { label: 'Pilates', value: 'pilates', emoji: '🎽' },
  { label: 'Home workouts', value: 'home', emoji: '🏠' },
  { label: 'Walking', value: 'walking', emoji: '🚶' },
  { label: 'Martial arts', value: 'martial', emoji: '🥋' },
];

const ENVIRONMENT = [
  { label: 'Home — no equipment', value: 'home_none', emoji: '🏠' },
  { label: 'Home — some equipment', value: 'home_equip', emoji: '🏋️' },
  { label: 'Commercial gym', value: 'gym', emoji: '🏢' },
  { label: 'Outdoor spaces', value: 'outdoor', emoji: '🌿' },
  { label: 'Flexible / varies', value: 'flexible', emoji: '🔄' },
];

const EQUIPMENT = [
  { label: 'Dumbbells', value: 'dumbbells' },
  { label: 'Resistance bands', value: 'bands' },
  { label: 'Barbell', value: 'barbell' },
  { label: 'Pull-up bar', value: 'pullup_bar' },
  { label: 'Kettlebells', value: 'kettlebells' },
  { label: 'Yoga mat', value: 'mat' },
  { label: 'Foam roller', value: 'foam_roller' },
  { label: 'Full gym access', value: 'full_gym' },
  { label: 'None', value: 'none' },
];

const POSTURE_ISSUES = [
  { label: 'Forward head', value: 'forward_head', emoji: '🫁' },
  { label: 'Rounded shoulders', value: 'rounded_shoulders', emoji: '🔄' },
  { label: 'Kyphosis (hunch)', value: 'kyphosis', emoji: '🪑' },
  { label: 'Anterior pelvic tilt', value: 'apt', emoji: '🔽' },
  { label: 'Flat back', value: 'flat_back', emoji: '📏' },
  { label: 'Scoliosis curve', value: 'scoliosis', emoji: '〰️' },
  { label: 'Knee valgus (knock knees)', value: 'valgus', emoji: '🦵' },
  { label: 'Not sure', value: 'unsure', emoji: '❓' },
];

const MOVEMENT_PAIN = [
  { label: 'Squatting', value: 'squat' },
  { label: 'Bending forward', value: 'bend' },
  { label: 'Overhead reach', value: 'overhead' },
  { label: 'Rotation / twisting', value: 'rotation' },
  { label: 'Running / walking', value: 'running' },
  { label: 'Sitting long periods', value: 'sitting' },
  { label: 'Climbing stairs', value: 'stairs' },
  { label: 'None', value: 'none' },
];

const FREQ_OPTIONS = [
  { label: '0 days', value: '0' },
  { label: '1–2 days', value: '2' },
  { label: '3 days', value: '3' },
  { label: '4 days', value: '4' },
  { label: '5+ days', value: '5' },
];

export default function Stage3() {
  const router = useRouter();
  const { stage3, setStage3 } = useAssessmentStore();

  const canProceed =
    stage3.last_exercise_period &&
    stage3.workout_environment;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BRAND.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 56, paddingHorizontal: 24, paddingBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>← Back</Text>
          </TouchableOpacity>
          <ProgressBar currentStage={3} />
          <Text style={{ fontSize: 28, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, marginTop: 16 }}>
            Movement & Fitness
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 6, lineHeight: 22 }}>
            Your exercise history and movement quality baseline.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>

          <S>Exercise history</S>
          <Q>When did you last exercise regularly?</Q>
          <ChipSelect options={LAST_EXERCISE} selected={stage3.last_exercise_period} onSelect={(v) => setStage3({ last_exercise_period: v as string })} />

          <S>Activity types</S>
          <Q>What types of exercise have you done before? (Select all that apply)</Q>
          <ChipSelect options={EXERCISE_TYPES} selected={stage3.exercise_history} onSelect={(v) => setStage3({ exercise_history: v as string[] })} multiple />

          <S>Weekly frequency</S>
          <Q>How many days per week do you currently exercise?</Q>
          <ChipSelect options={FREQ_OPTIONS} selected={String(stage3.weekly_frequency)} onSelect={(v) => setStage3({ weekly_frequency: parseInt(v as string) })} wrap={false} />

          <S>Workout environment</S>
          <Q>Where do you prefer to work out?</Q>
          <ChipSelect options={ENVIRONMENT} selected={stage3.workout_environment} onSelect={(v) => setStage3({ workout_environment: v as string })} />

          <S>Available equipment</S>
          <Q>What equipment do you have access to?</Q>
          <ChipSelect options={EQUIPMENT} selected={stage3.available_equipment} onSelect={(v) => setStage3({ available_equipment: v as string[] })} multiple />

          <S>Posture self-assessment</S>
          <Q>Do you notice any of these posture patterns in yourself?</Q>
          <ChipSelect options={POSTURE_ISSUES} selected={stage3.posture_issues} onSelect={(v) => setStage3({ posture_issues: v as string[] })} multiple />

          <S>Painful movements</S>
          <Q>Which movements cause you pain or discomfort?</Q>
          <ChipSelect options={MOVEMENT_PAIN} selected={stage3.pain_during_movement} onSelect={(v) => setStage3({ pain_during_movement: v as string[] })} multiple />

          <S>Flexibility</S>
          <Q>How flexible would you rate yourself?</Q>
          <SliderInput
            value={stage3.flexibility_score}
            onChange={(v) => setStage3({ flexibility_score: v })}
            leftLabel="Very stiff"
            rightLabel="Very flexible"
          />

          <View style={{ marginTop: 28 }}>
            <Q>How is your balance and stability?</Q>
            <SliderInput
              value={stage3.balance_score}
              onChange={(v) => setStage3({ balance_score: v })}
              leftLabel="Very unstable"
              rightLabel="Very stable"
            />
          </View>

        </View>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BRAND.bg, borderTopWidth: 1, borderTopColor: BRAND.border, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>Step 3 of 5</Text>
        <TouchableOpacity
          onPress={() => canProceed && router.push('/onboarding/stage-4')}
          activeOpacity={canProceed ? 0.85 : 1}
          style={{ backgroundColor: canProceed ? BRAND.teal : BRAND.border, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 }}
        >
          <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: canProceed ? '#0A0A0B' : BRAND.textMuted }}>
            Continue →
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
