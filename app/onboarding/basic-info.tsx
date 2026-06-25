// app/onboarding/basic-info.tsx
// Lite-mode onboarding step: replaces the curated program assessment with a
// short demographic capture (name, DOB, gender, height, weight, goals,
// conditions). No program is selected or tagged — see PROGRAMS_ENABLED.
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { THEME } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

const GENDER_OPTIONS = [
  { label: 'Male',   value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other',  value: 'other' },
];

const GOAL_OPTIONS = [
  'Weight loss', 'Muscle gain', 'General fitness', 'Better posture',
  'Pain relief', 'Stress management', 'Improve sleep', 'Improve flexibility',
];

const CONDITION_OPTIONS = [
  'Diabetes', 'Hypertension', 'Thyroid disorder', 'PCOS / PCOD',
  'Heart condition', 'Asthma', 'Arthritis / Joint pain', 'None',
];

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
        backgroundColor: selected ? THEME.colors.tealMuted : 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: selected ? THEME.colors.teal : THEME.colors.border,
      }}
    >
      <Text style={{
        fontSize: 13, fontFamily: THEME.fonts.sansMedium,
        color: selected ? THEME.colors.teal : THEME.colors.textSecondary,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text style={{
      fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary,
      letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8,
    }}>
      {children}
    </Text>
  );
}

export default function BasicInfoScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    if (value === 'None') {
      setList(list.includes('None') ? [] : ['None']);
      return;
    }
    const withoutNone = list.filter(v => v !== 'None');
    setList(
      withoutNone.includes(value)
        ? withoutNone.filter(v => v !== value)
        : [...withoutNone, value]
    );
  }

  function isValidDob(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(value).getTime());
  }

  async function handleSubmit() {
    if (!fullName.trim()) {
      Alert.alert('Missing info', 'Please enter your name.');
      return;
    }
    if (dob && !isValidDob(dob)) {
      Alert.alert('Invalid date', 'Please enter your date of birth as YYYY-MM-DD.');
      return;
    }

    setSaving(true);
    const updates: Record<string, any> = {
      full_name: fullName.trim(),
      dob: dob || null,
      gender: gender ?? null,
      height_cm: heightCm ? Number(heightCm) : null,
      weight_kg: weightKg ? Number(weightKg) : null,
      health_goals: goals,
      conditions: conditions,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    };

    if (!user?.id) {
      setSaving(false);
      console.error('[BasicInfo] save failed: no authenticated user id');
      Alert.alert('Something went wrong', 'No active session — please log in again.');
      return;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    setSaving(false);

    if (error) {
      console.error('[BasicInfo] save failed:', error.message, error.details, error.hint, error.code);
      Alert.alert('Something went wrong', error.message || 'Unknown error — check console for details.');
      return;
    }

    useAuthStore.setState(state => ({
      profile: state.profile ? { ...state.profile, ...updates } : state.profile,
    }));
    router.replace('/(client)');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{
            fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal,
            letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14,
          }}>
            BioRealign
          </Text>
          <Text style={{
            fontSize: 30, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary,
            lineHeight: 38, marginBottom: 10,
          }}>
            Tell us about you
          </Text>
          <Text style={{
            fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted,
            lineHeight: 21, marginBottom: 32,
          }}>
            A few quick basics so we can set up your tracker. This takes less than a minute.
          </Text>

          <View style={{ gap: 22 }}>
            <View>
              <FieldLabel>Full name</FieldLabel>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="words"
                style={inputStyle}
              />
            </View>

            <View>
              <FieldLabel>Date of birth</FieldLabel>
              <TextInput
                value={dob}
                onChangeText={setDob}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="numbers-and-punctuation"
                style={inputStyle}
              />
            </View>

            <View>
              <FieldLabel>Gender</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GENDER_OPTIONS.map(g => (
                  <Chip key={g.value} label={g.label} selected={gender === g.value} onPress={() => setGender(g.value)} />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ flex: 1 }}>
                <FieldLabel>Height (cm)</FieldLabel>
                <TextInput
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="e.g. 170"
                  placeholderTextColor={THEME.colors.textMuted}
                  keyboardType="numeric"
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel>Weight (kg)</FieldLabel>
                <TextInput
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="e.g. 65"
                  placeholderTextColor={THEME.colors.textMuted}
                  keyboardType="numeric"
                  style={inputStyle}
                />
              </View>
            </View>

            <View>
              <FieldLabel>Health goals (optional)</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GOAL_OPTIONS.map(g => (
                  <Chip key={g} label={g} selected={goals.includes(g)} onPress={() => toggle(goals, setGoals, g)} />
                ))}
              </View>
            </View>

            <View>
              <FieldLabel>Medical conditions (optional)</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CONDITION_OPTIONS.map(c => (
                  <Chip key={c} label={c} selected={conditions.includes(c)} onPress={() => toggle(conditions, setConditions, c)} />
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.85}
            style={{
              backgroundColor: THEME.colors.teal, borderRadius: 16, paddingVertical: 16,
              alignItems: 'center', marginTop: 36,
              shadowColor: THEME.colors.teal, shadowOpacity: 0.3, shadowRadius: 14,
              shadowOffset: { width: 0, height: 4 }, elevation: 6,
            }}
          >
            {saving
              ? <ActivityIndicator color="#000" />
              : <Text style={{ color: '#000', fontSize: 16, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.3 }}>
                  Continue to dashboard →
                </Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const inputStyle = {
  backgroundColor: THEME.colors.surface2,
  color: THEME.colors.textPrimary,
  fontFamily: THEME.fonts.sans,
  fontSize: 15,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderWidth: 1,
  borderColor: THEME.colors.border,
};
