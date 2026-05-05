import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { ChipSelect } from '@/components/onboarding/ChipSelect';
import { SliderInput } from '@/components/onboarding/SliderInput';
import { BodyZoneSelector } from '@/components/onboarding/BodyZoneSelector';
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

function NumberInput({ value, onChange, placeholder, unit }: { value: number; onChange: (v: number) => void; placeholder: string; unit: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.surface, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 16, paddingVertical: 14 }}>
      <TextInput
        style={{ flex: 1, fontSize: 18, fontFamily: 'DMSans-Medium', color: BRAND.text }}
        keyboardType="numeric"
        value={value > 0 ? String(value) : ''}
        onChangeText={(v) => onChange(parseFloat(v) || 0)}
        placeholderTextColor={BRAND.textMuted}
        placeholder={placeholder}
      />
      <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>{unit}</Text>
    </View>
  );
}

const COMPLAINT_OPTIONS = [
  { label: 'Back pain', value: 'back_pain', emoji: '🫀' },
  { label: 'Neck pain', value: 'neck_pain', emoji: '🦴' },
  { label: 'Joint pain', value: 'joint_pain', emoji: '🦵' },
  { label: 'Fatigue', value: 'fatigue', emoji: '😴' },
  { label: 'Stiffness', value: 'stiffness', emoji: '🔒' },
  { label: 'Headaches', value: 'headaches', emoji: '🤕' },
  { label: 'Poor posture', value: 'posture', emoji: '🪑' },
  { label: 'Weak core', value: 'weak_core', emoji: '💪' },
  { label: 'Tight hips', value: 'tight_hips', emoji: '🔗' },
  { label: 'Shoulder issues', value: 'shoulders', emoji: '🏋️' },
  { label: 'Low energy', value: 'low_energy', emoji: '⚡' },
  { label: 'Weight issues', value: 'weight', emoji: '⚖️' },
  { label: 'None of the above', value: 'none', emoji: '✅' },
];

const CONDITION_OPTIONS = [
  { label: 'Scoliosis', value: 'scoliosis' },
  { label: 'Herniated disc', value: 'herniated_disc' },
  { label: 'Arthritis', value: 'arthritis' },
  { label: 'Osteoporosis', value: 'osteoporosis' },
  { label: 'Hypertension', value: 'hypertension' },
  { label: 'Diabetes', value: 'diabetes' },
  { label: 'Thyroid condition', value: 'thyroid' },
  { label: 'PCOS', value: 'pcos' },
  { label: 'Anxiety / Depression', value: 'mental_health' },
  { label: 'None', value: 'none' },
];

const BREATHING_OPTIONS = [
  { label: 'Shallow / chest breathing', value: 'shallow', emoji: '😮‍💨' },
  { label: 'Normal', value: 'normal', emoji: '😤' },
  { label: 'Deep / belly breathing', value: 'deep', emoji: '🧘' },
  { label: 'Often short of breath', value: 'short', emoji: '😰' },
];

export default function Stage2() {
  const router = useRouter();
  const { stage2, setStage2 } = useAssessmentStore();

  const canProceed =
    stage2.height_cm > 0 &&
    stage2.weight_kg > 0 &&
    stage2.breathing_quality;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BRAND.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ paddingTop: 56, paddingHorizontal: 24, paddingBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>← Back</Text>
          </TouchableOpacity>
          <ProgressBar currentStage={2} />
          <Text style={{ fontSize: 28, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, marginTop: 16 }}>
            Body & Health
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 6, lineHeight: 22 }}>
            Your physical baseline — this shapes every part of your plan.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>

          {/* Height & Weight */}
          <SectionTitle>Body measurements</SectionTitle>
          <Question>What is your height and current weight?</Question>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: BRAND.textMuted, marginBottom: 8 }}>Height</Text>
              <NumberInput value={stage2.height_cm} onChange={(v) => setStage2({ height_cm: v })} placeholder="e.g. 172" unit="cm" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: BRAND.textMuted, marginBottom: 8 }}>Weight</Text>
              <NumberInput value={stage2.weight_kg} onChange={(v) => setStage2({ weight_kg: v })} placeholder="e.g. 70" unit="kg" />
            </View>
          </View>

          {/* Complaints */}
          <SectionTitle>Current complaints</SectionTitle>
          <Question>What physical issues are you currently experiencing?</Question>
          <ChipSelect
            options={COMPLAINT_OPTIONS}
            selected={stage2.complaints}
            onSelect={(v) => setStage2({ complaints: v as string[] })}
            multiple
          />

          {/* Pain map */}
          {stage2.complaints.length > 0 && !stage2.complaints.includes('none') && (
            <>
              <SectionTitle>Pain locations</SectionTitle>
              <Question>Where exactly do you feel pain or discomfort?</Question>
              <BodyZoneSelector
                selected={stage2.pain_locations}
                onChange={(zones) => setStage2({ pain_locations: zones })}
              />
            </>
          )}

          {/* Conditions */}
          <SectionTitle>Medical conditions</SectionTitle>
          <Question>Do you have any diagnosed medical conditions?</Question>
          <ChipSelect
            options={CONDITION_OPTIONS}
            selected={stage2.conditions}
            onSelect={(v) => setStage2({ conditions: v as string[] })}
            multiple
          />

          {/* Medications */}
          <SectionTitle>Medications</SectionTitle>
          <Question>Are you currently taking any medications or supplements?</Question>
          <View style={{ backgroundColor: BRAND.surface, borderRadius: 12, borderWidth: 1, borderColor: BRAND.border, paddingHorizontal: 16, paddingVertical: 14 }}>
            <TextInput
              style={{ fontSize: 15, fontFamily: 'DMSans-Regular', color: BRAND.text, minHeight: 60 }}
              value={stage2.medications}
              onChangeText={(v) => setStage2({ medications: v })}
              placeholder="List medications or supplements (or leave blank if none)"
              placeholderTextColor={BRAND.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Energy levels */}
          <SectionTitle>Energy patterns</SectionTitle>
          <Question>Rate your typical energy level — Morning</Question>
          <SliderInput
            value={stage2.energy_morning}
            onChange={(v) => setStage2({ energy_morning: v })}
            leftLabel="Exhausted"
            rightLabel="Energised"
          />

          <View style={{ marginTop: 24 }}>
  <Question>Afternoon energy</Question>
</View>
          <SliderInput
            value={stage2.energy_afternoon}
            onChange={(v) => setStage2({ energy_afternoon: v })}
            leftLabel="Exhausted"
            rightLabel="Energised"
          />

          <View style={{ marginTop: 24 }}>
  <Question>Evening energy</Question>
</View>
          <SliderInput
            value={stage2.energy_evening}
            onChange={(v) => setStage2({ energy_evening: v })}
            leftLabel="Exhausted"
            rightLabel="Energised"
          />

          {/* Breathing */}
          <SectionTitle>Breathing quality</SectionTitle>
          <Question>How would you describe your breathing?</Question>
          <ChipSelect
            options={BREATHING_OPTIONS}
            selected={stage2.breathing_quality}
            onSelect={(v) => setStage2({ breathing_quality: v as string })}
          />

        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BRAND.bg, borderTopWidth: 1, borderTopColor: BRAND.border, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted }}>Step 2 of 5</Text>
        <TouchableOpacity
          onPress={() => canProceed && router.push('/onboarding/stage-3')}
          activeOpacity={canProceed ? 0.85 : 1}
          style={{ backgroundColor: canProceed ? BRAND.teal : BRAND.border, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, shadowColor: canProceed ? BRAND.teal : 'transparent', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: canProceed ? 4 : 0 }}
        >
          <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: canProceed ? '#0A0A0B' : BRAND.textMuted }}>
            Continue →
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
