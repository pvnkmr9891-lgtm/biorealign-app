import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { ChipSelect } from '@/components/onboarding/ChipSelect';
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

const OCCUPATION_OPTIONS = [
  { label: 'Desk job (seated all day)', value: 'desk', emoji: '💻' },
  { label: 'Standing job', value: 'standing', emoji: '🧍' },
  { label: 'Physical / manual work', value: 'physical', emoji: '🔧' },
  { label: 'Mixed / varied', value: 'mixed', emoji: '🔄' },
  { label: 'Working from home', value: 'wfh', emoji: '🏠' },
  { label: 'Student', value: 'student', emoji: '📚' },
];

const ACTIVITY_OPTIONS = [
  { label: 'Mostly sedentary', value: 'low', emoji: '🛋️' },
  { label: 'Light activity', value: 'light', emoji: '🚶' },
  { label: 'Moderately active', value: 'moderate', emoji: '🚴' },
  { label: 'Very active', value: 'high', emoji: '🏃' },
];

const TIME_OPTIONS = [
  { label: '15 min', value: '15' },
  { label: '30 min', value: '30' },
  { label: '45 min', value: '45' },
  { label: '1 hour', value: '60' },
  { label: '1–2 hours', value: '90' },
];

const STRESSOR_OPTIONS = [
  { label: 'Work / career', value: 'work', emoji: '💼' },
  { label: 'Family', value: 'family', emoji: '👨‍👩‍👦' },
  { label: 'Finances', value: 'finances', emoji: '💰' },
  { label: 'Health concerns', value: 'health', emoji: '❤️' },
  { label: 'Relationships', value: 'relationships', emoji: '💑' },
  { label: 'Nothing major', value: 'none', emoji: '😊' },
];

const COACHING_OPTIONS = [
  { label: 'Never tried', value: 'never', emoji: '🆕' },
  { label: 'Online programs', value: 'online_programs', emoji: '📱' },
  { label: 'Personal trainer', value: 'pt', emoji: '🏋️' },
  { label: 'Physio / rehab', value: 'physio', emoji: '🩺' },
  { label: 'Nutritionist', value: 'nutritionist', emoji: '🥗' },
  { label: 'Multiple coaches', value: 'multiple', emoji: '⭐' },
];

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: BRAND.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, marginTop: 28 }}>
      {children}
    </Text>
  );
}

function Question({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 17, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, lineHeight: 26, marginBottom: 16 }}>
      {children}
    </Text>
  );
}

export default function Stage1() {
  const router = useRouter();
  const { stage1, setStage1 } = useAssessmentStore();
  const [workHours, setWorkHours] = useState(String(stage1.work_hours_daily || ''));

  const canProceed =
    stage1.occupation_type &&
    stage1.daily_activity_level &&
    stage1.available_minutes_per_day &&
    stage1.primary_stressor;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BRAND.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ paddingTop: 56, paddingHorizontal: 24, paddingBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginBottom: 24, alignSelf: 'flex-start' }}
          >
            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>← Back</Text>
          </TouchableOpacity>
          <ProgressBar currentStage={1} />
          <Text style={{ fontSize: 28, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, marginTop: 16 }}>
            Personal Foundation
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 6, lineHeight: 22 }}>
            Help us understand your lifestyle and daily context.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>

          {/* Occupation */}
          <SectionTitle>What best describes your occupation?</SectionTitle>
          <Question>What type of work do you do daily?</Question>
          <ChipSelect
            options={OCCUPATION_OPTIONS}
            selected={stage1.occupation_type}
            onSelect={(v) => setStage1({ occupation_type: v as string })}
          />

          {/* Work hours */}
          <SectionTitle>Work hours</SectionTitle>
          <Question>How many hours do you work on a typical day?</Question>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.surface, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 16, paddingVertical: 14 }}>
            <TextInput
              style={{ flex: 1, fontSize: 18, fontFamily: 'DMSans-Medium', color: BRAND.text }}
              keyboardType="numeric"
              value={workHours}
              onChangeText={(v) => {
                setWorkHours(v);
                setStage1({ work_hours_daily: parseInt(v) || 0 });
              }}
              placeholderTextColor={BRAND.textMuted}
              placeholder="e.g. 8"
              maxLength={2}
            />
            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>hours / day</Text>
          </View>

          {/* Activity level */}
          <SectionTitle>Daily activity</SectionTitle>
          <Question>Outside of exercise, how active is your daily life?</Question>
          <ChipSelect
            options={ACTIVITY_OPTIONS}
            selected={stage1.daily_activity_level}
            onSelect={(v) => setStage1({ daily_activity_level: v as string })}
          />

          {/* Available time */}
          <SectionTitle>Time availability</SectionTitle>
          <Question>How much time can you realistically commit to wellness each day?</Question>
          <ChipSelect
            options={TIME_OPTIONS}
            selected={String(stage1.available_minutes_per_day || '')}
            onSelect={(v) => setStage1({ available_minutes_per_day: parseInt(v as string) })}
          />

          {/* Primary stressor */}
          <SectionTitle>Stress context</SectionTitle>
          <Question>What is your biggest life stressor right now?</Question>
          <ChipSelect
            options={STRESSOR_OPTIONS}
            selected={stage1.primary_stressor}
            onSelect={(v) => setStage1({ primary_stressor: v as string })}
          />

          {/* Previous coaching */}
          <SectionTitle>Past experience</SectionTitle>
          <Question>Have you worked with any health professionals or coaches before?</Question>
          <ChipSelect
            options={COACHING_OPTIONS}
            selected={stage1.previous_coaching}
            onSelect={(v) => setStage1({ previous_coaching: v as string })}
          />

        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: BRAND.bg,
          borderTopWidth: 1,
          borderTopColor: BRAND.border,
          paddingHorizontal: 24,
          paddingVertical: 16,
          paddingBottom: 32,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>
          Step 1 of 5
        </Text>
        <TouchableOpacity
          onPress={() => canProceed && router.push('/onboarding/stage-2')}
          activeOpacity={canProceed ? 0.85 : 1}
          style={{
            backgroundColor: canProceed ? BRAND.teal : BRAND.border,
            borderRadius: 12,
            paddingHorizontal: 28,
            paddingVertical: 14,
            shadowColor: canProceed ? BRAND.teal : 'transparent',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: canProceed ? 4 : 0,
          }}
        >
          <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: canProceed ? '#0A0A0B' : BRAND.textMuted }}>
            Continue →
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
