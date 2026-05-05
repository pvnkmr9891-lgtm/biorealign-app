import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { ChipSelect } from '@/components/onboarding/ChipSelect';
import { SliderInput } from '@/components/onboarding/SliderInput';
import { useAssessmentStore } from '@/store/assessmentStore';

const BRAND = {
  teal: '#00C4B4',
  amber: '#E8A44A',
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

const DIET_TYPES = [
  { label: 'Omnivore', value: 'omnivore', emoji: '🍖' },
  { label: 'Vegetarian', value: 'vegetarian', emoji: '🥗' },
  { label: 'Vegan', value: 'vegan', emoji: '🌱' },
  { label: 'Keto / Low-carb', value: 'keto', emoji: '🥑' },
  { label: 'Intermittent fasting', value: 'if', emoji: '⏰' },
  { label: 'No specific diet', value: 'none', emoji: '🍽️' },
];

const ALLERGY_OPTIONS = [
  { label: 'Gluten', value: 'gluten' },
  { label: 'Dairy', value: 'dairy' },
  { label: 'Nuts', value: 'nuts' },
  { label: 'Eggs', value: 'eggs' },
  { label: 'Soy', value: 'soy' },
  { label: 'Shellfish', value: 'shellfish' },
  { label: 'None', value: 'none' },
];

const MEAL_FREQ = [
  { label: '1–2 meals', value: '2' },
  { label: '3 meals', value: '3' },
  { label: '4 meals', value: '4' },
  { label: '5+ meals / grazing', value: '5' },
];

const MEAL_TIMING = [
  { label: 'Regular meal times', value: 'regular', emoji: '🕐' },
  { label: 'Irregular / varies', value: 'irregular', emoji: '🔀' },
  { label: 'Skip breakfast', value: 'skip_breakfast', emoji: '🌅' },
  { label: 'Large dinner late', value: 'late_dinner', emoji: '🌙' },
  { label: 'Mindful & planned', value: 'planned', emoji: '📋' },
];

const ALCOHOL = [
  { label: 'Never', value: 'never' },
  { label: 'Rarely', value: 'rarely' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Several times / week', value: 'frequent' },
  { label: 'Daily', value: 'daily' },
];

const RECOVERY_TOOLS = [
  { label: 'Foam rolling', value: 'foam_rolling', emoji: '🔵' },
  { label: 'Cold shower / ice bath', value: 'cold_therapy', emoji: '🧊' },
  { label: 'Sauna', value: 'sauna', emoji: '🧖' },
  { label: 'Massage', value: 'massage', emoji: '💆' },
  { label: 'Meditation', value: 'meditation', emoji: '🧘' },
  { label: 'Stretching', value: 'stretching', emoji: '🤸' },
  { label: 'Sleep tracking', value: 'sleep_tracking', emoji: '📱' },
  { label: 'None', value: 'none', emoji: '❌' },
];

const WATER_OPTIONS = [
  { label: '< 4 glasses', value: '3' },
  { label: '4–6 glasses', value: '5' },
  { label: '7–8 glasses', value: '7' },
  { label: '8+ glasses', value: '9' },
];

const CAFFEINE_OPTIONS = [
  { label: 'None', value: '0' },
  { label: '1 cup', value: '1' },
  { label: '2 cups', value: '2' },
  { label: '3–4 cups', value: '3' },
  { label: '5+ cups', value: '5' },
];

const SLEEP_OPTIONS = [
  { label: '< 5 hrs', value: '4.5' },
  { label: '5–6 hrs', value: '5.5' },
  { label: '6–7 hrs', value: '6.5' },
  { label: '7–8 hrs', value: '7.5' },
  { label: '8+ hrs', value: '8.5' },
];

export default function Stage4() {
  const router = useRouter();
  const { stage4, setStage4 } = useAssessmentStore();

  const canProceed = stage4.diet_type && stage4.meal_timing;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BRAND.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 56, paddingHorizontal: 24, paddingBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>← Back</Text>
          </TouchableOpacity>
          <ProgressBar currentStage={4} />
          <Text style={{ fontSize: 28, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, marginTop: 16 }}>
            Nutrition & Recovery
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 6, lineHeight: 22 }}>
            How you fuel and restore your body every day.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>

          <S>Dietary preference</S>
          <Q>How would you describe your current way of eating?</Q>
          <ChipSelect options={DIET_TYPES} selected={stage4.diet_type} onSelect={(v) => setStage4({ diet_type: v as string })} />

          <S>Food allergies or intolerances</S>
          <Q>Do you have any food allergies or intolerances?</Q>
          <ChipSelect options={ALLERGY_OPTIONS} selected={stage4.food_allergies} onSelect={(v) => setStage4({ food_allergies: v as string[] })} multiple />

          <S>Meal frequency</S>
          <Q>How many meals do you typically eat per day?</Q>
          <ChipSelect options={MEAL_FREQ} selected={String(stage4.meals_per_day)} onSelect={(v) => setStage4({ meals_per_day: parseInt(v as string) })} wrap={false} />

          <S>Meal timing</S>
          <Q>How would you describe your eating pattern?</Q>
          <ChipSelect options={MEAL_TIMING} selected={stage4.meal_timing} onSelect={(v) => setStage4({ meal_timing: v as string })} />

          <S>Hydration</S>
          <Q>How much water do you drink daily?</Q>
          <ChipSelect options={WATER_OPTIONS} selected={String(stage4.hydration_glasses)} onSelect={(v) => setStage4({ hydration_glasses: parseInt(v as string) })} wrap={false} />

          <S>Caffeine</S>
          <Q>How many caffeinated drinks (coffee, tea, energy drinks) per day?</Q>
          <ChipSelect options={CAFFEINE_OPTIONS} selected={String(stage4.caffeine_cups)} onSelect={(v) => setStage4({ caffeine_cups: parseInt(v as string) })} wrap={false} />

          <S>Alcohol</S>
          <Q>How often do you consume alcohol?</Q>
          <ChipSelect options={ALCOHOL} selected={stage4.alcohol_frequency} onSelect={(v) => setStage4({ alcohol_frequency: v as string })} />

          <S>Sleep duration</S>
          <Q>How many hours of sleep do you typically get?</Q>
          <ChipSelect options={SLEEP_OPTIONS} selected={String(stage4.sleep_hours_avg)} onSelect={(v) => setStage4({ sleep_hours_avg: parseFloat(v as string) })} wrap={false} />

          <S>Sleep quality</S>
          <Q>How would you rate the quality of your sleep?</Q>
          <View style={{ marginTop: 8 }}>
            <SliderInput
              value={stage4.sleep_quality_avg}
              onChange={(v) => setStage4({ sleep_quality_avg: v })}
              leftLabel="Terrible"
              rightLabel="Excellent"
              color="amber"
            />
          </View>

          <S>Stress level</S>
          <Q>What is your average daily stress level?</Q>
          <View style={{ marginTop: 8 }}>
            <SliderInput
              value={stage4.stress_level}
              onChange={(v) => setStage4({ stress_level: v })}
              leftLabel="Calm"
              rightLabel="Overwhelmed"
              color="amber"
            />
          </View>

          <S>Recovery tools</S>
          <Q>Which recovery tools or practices do you currently use?</Q>
          <ChipSelect options={RECOVERY_TOOLS} selected={stage4.recovery_tools} onSelect={(v) => setStage4({ recovery_tools: v as string[] })} multiple />

        </View>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BRAND.bg, borderTopWidth: 1, borderTopColor: BRAND.border, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>Step 4 of 5</Text>
        <TouchableOpacity
          onPress={() => canProceed && router.push('/onboarding/stage-5')}
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
