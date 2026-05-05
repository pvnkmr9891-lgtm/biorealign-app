import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
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

const Q = ({ children }: { children: string }) => (
  <Text style={{ fontSize: 17, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, lineHeight: 26, marginBottom: 16 }}>{children}</Text>
);
const S = ({ children }: { children: string }) => (
  <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: BRAND.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, marginTop: 28 }}>{children}</Text>
);

function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={{ backgroundColor: BRAND.surface, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 16, paddingVertical: 14 }}>
      <TextInput
        style={{ fontSize: 15, fontFamily: 'DMSans-Regular', color: BRAND.text, minHeight: 80 }}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={BRAND.textMuted}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const PRIMARY_GOALS = [
  { label: 'Relieve chronic pain', value: 'pain_relief', emoji: '💊' },
  { label: 'Correct my posture', value: 'posture', emoji: '🧍' },
  { label: 'Lose body fat', value: 'fat_loss', emoji: '⚖️' },
  { label: 'Build muscle & strength', value: 'muscle', emoji: '💪' },
  { label: 'Improve energy & vitality', value: 'energy', emoji: '⚡' },
  { label: 'Enhance mobility & flexibility', value: 'mobility', emoji: '🤸' },
  { label: 'Athletic performance', value: 'performance', emoji: '🏆' },
  { label: 'Rehabilitation / recovery', value: 'rehab', emoji: '🩺' },
  { label: 'Overall wellness', value: 'wellness', emoji: '🌱' },
];

const SECONDARY_GOALS = [
  { label: 'Better sleep', value: 'sleep' },
  { label: 'Reduce stress', value: 'stress' },
  { label: 'Improve nutrition habits', value: 'nutrition' },
  { label: 'Fix breathing patterns', value: 'breathing' },
  { label: 'Build daily movement habits', value: 'habits' },
  { label: 'Improve confidence', value: 'confidence' },
  { label: 'Prevent future injuries', value: 'prevention' },
  { label: 'Manage a health condition', value: 'condition_mgmt' },
];

const TIMELINE_OPTIONS = [
  { label: '4–6 weeks', value: '6_weeks', emoji: '⚡' },
  { label: '8–12 weeks', value: '12_weeks', emoji: '📅' },
  { label: '6 months', value: '6_months', emoji: '🎯' },
  { label: '1 year+', value: '1_year', emoji: '🏔️' },
  { label: 'Ongoing lifestyle', value: 'ongoing', emoji: '♾️' },
];

const COMMITMENT = [
  { label: '15 min/day', value: '15', emoji: '🌱' },
  { label: '30 min/day', value: '30', emoji: '🔥' },
  { label: '45 min/day', value: '45', emoji: '💪' },
  { label: '1+ hour/day', value: '60', emoji: '⭐' },
];

const BLOCKERS = [
  { label: 'Lack of time', value: 'time', emoji: '⏰' },
  { label: 'No accountability', value: 'accountability', emoji: '👥' },
  { label: 'Not knowing what to do', value: 'knowledge', emoji: '🤔' },
  { label: 'Motivation drops', value: 'motivation', emoji: '📉' },
  { label: 'Injury or pain', value: 'injury', emoji: '🩹' },
  { label: 'Work / life demands', value: 'life', emoji: '🌀' },
  { label: 'Past bad experiences', value: 'past', emoji: '😔' },
  { label: 'Nothing — I am consistent', value: 'none', emoji: '✅' },
];

export default function Stage5() {
  const router = useRouter();
  const { stage5, setStage5 } = useAssessmentStore();

  const canProceed = stage5.primary_goal && stage5.timeline && stage5.commitment_level;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BRAND.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ paddingTop: 56, paddingHorizontal: 24, paddingBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>← Back</Text>
          </TouchableOpacity>
          <ProgressBar currentStage={5} />
          <Text style={{ fontSize: 28, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, marginTop: 16 }}>
            Goals & Mindset
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 6, lineHeight: 22 }}>
            The most important stage — tell us where you want to go.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>

          <S>Primary goal</S>
          <Q>What is your single most important transformation goal?</Q>
          <ChipSelect
            options={PRIMARY_GOALS}
            selected={stage5.primary_goal}
            onSelect={(v) => setStage5({ primary_goal: v as string })}
          />

          <S>Secondary goals</S>
          <Q>Any other outcomes you'd like your plan to support?</Q>
          <ChipSelect
            options={SECONDARY_GOALS}
            selected={stage5.secondary_goals}
            onSelect={(v) => setStage5({ secondary_goals: v as string[] })}
            multiple
          />

          <S>Timeline</S>
          <Q>What timeframe are you working towards?</Q>
          <ChipSelect
            options={TIMELINE_OPTIONS}
            selected={stage5.timeline}
            onSelect={(v) => setStage5({ timeline: v as string })}
          />

          <S>Daily commitment</S>
          <Q>How much time can you dedicate to your transformation daily?</Q>
          <ChipSelect
            options={COMMITMENT}
            selected={stage5.commitment_level}
            onSelect={(v) => setStage5({ commitment_level: v as string })}
            wrap={false}
          />

          <S>Past blockers</S>
          <Q>What has stopped you from achieving your goals before?</Q>
          <ChipSelect
            options={BLOCKERS}
            selected={stage5.past_blockers}
            onSelect={(v) => setStage5({ past_blockers: v as string[] })}
            multiple
          />

          <S>Your ideal outcome</S>
          <Q>In your own words — what does your ideal transformation look like in 6 months?</Q>
          <TextArea
            value={stage5.ideal_outcome}
            onChange={(v) => setStage5({ ideal_outcome: v })}
            placeholder="Describe how you want to feel, move, and live..."
          />

          <S>Note to your coach</S>
          <Q>Is there anything else your coach should know before building your plan?</Q>
          <TextArea
            value={stage5.coach_notes_from_client}
            onChange={(v) => setStage5({ coach_notes_from_client: v })}
            placeholder="Any specific concerns, preferences, or history your coach should be aware of..."
          />

          {/* Privacy notice */}
          <View style={{ flexDirection: 'row', backgroundColor: `${BRAND.teal}12`, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: `${BRAND.teal}25`, marginTop: 24 }}>
            <Text style={{ fontSize: 16, marginRight: 10 }}>🔒</Text>
            <Text style={{ flex: 1, fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, lineHeight: 20 }}>
              Your answers are private. Only you and your assigned coach can see this assessment.
            </Text>
          </View>

        </View>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BRAND.bg, borderTopWidth: 1, borderTopColor: BRAND.border, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>Step 5 of 5</Text>
        <TouchableOpacity
          onPress={() => canProceed && router.push('/onboarding/photos')}
          activeOpacity={canProceed ? 0.85 : 1}
          style={{ backgroundColor: canProceed ? BRAND.teal : BRAND.border, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, shadowColor: canProceed ? BRAND.teal : 'transparent', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: canProceed ? 4 : 0 }}
        >
          <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: canProceed ? '#0A0A0B' : BRAND.textMuted }}>
            Almost done →
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
