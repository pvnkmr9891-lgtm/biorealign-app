// app/onboarding/index.tsx
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStore } from '@/store/onboardingStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import {
  PROGRAM_ASSESSMENT_KEY,
  PROGRAM_COLORS,
  PROGRAM_LABELS,
  getPhasesForProgram,
} from '@/constants/assessmentQuestions';

const BRAND = {
  teal: '#00C4B4',
  amber: '#E8A44A',
  bg: '#0A0A0B',
  surface: '#141416',
  border: '#2A2A2E',
  text: '#F0EEE8',
  textMuted: '#6B6B70',
};

export default function OnboardingWelcome() {
  const router    = useRouter();
  const { profile } = useAuth();
  const { programId: onboardingProgramId } = useOnboardingStore();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const rawId = onboardingProgramId ?? profile?.workout_program_id ?? '3-PRP';
  const programKey = PROGRAM_ASSESSMENT_KEY[rawId] ?? 'PRP';
  const accentColor = PROGRAM_COLORS[programKey] ?? BRAND.teal;
  const programLabel = PROGRAM_LABELS[programKey] ?? 'Your Program';
  const phases = getPhasesForProgram(programKey);
  const totalMinutes = Math.round(phases.length * 1.5);

  async function handleSkip() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
    }
    useAuthStore.setState(state => ({
      profile: state.profile
        ? { ...state.profile, onboarding_completed: true }
        : state.profile,
    }));
    router.replace('/(client)');
  }

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: accentColor, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 40 }}>
          BioRealign — {programLabel}
        </Text>

        <Text style={{ fontSize: 36, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, lineHeight: 44, marginBottom: 16 }}>
          Welcome,{'\n'}
          <Text style={{ color: accentColor }}>{firstName}.</Text>
        </Text>

        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, lineHeight: 26, marginBottom: 40 }}>
          Before we build your personalised {programLabel} plan, we need to understand your body, lifestyle, and goals — deeply.
        </Text>

        <View style={{ height: 1, backgroundColor: BRAND.border, marginBottom: 32 }} />

        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>
          Assessment phases
        </Text>

        {phases.map((phase, i) => (
          <View key={phase.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: BRAND.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: BRAND.border }}>
            <Text style={{ fontSize: 22, marginRight: 16 }}>{phase.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted, letterSpacing: 0.5 }}>
                PHASE {i + 1}
              </Text>
              <Text style={{ fontSize: 15, fontFamily: 'DMSans-Regular', color: BRAND.text, marginTop: 2 }}>
                {phase.title}
              </Text>
            </View>
          </View>
        ))}

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${BRAND.amber}15`, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: `${BRAND.amber}30`, marginTop: 8, marginBottom: 40 }}>
          <Text style={{ fontSize: 18, marginRight: 12 }}>⏱</Text>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.amber, flex: 1, lineHeight: 20 }}>
            Takes about {totalMinutes}–{totalMinutes + 4} minutes. Your answers are saved as you go — tailored specifically for {programLabel}.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/onboarding/assessment')}
          activeOpacity={0.85}
          style={{ backgroundColor: BRAND.teal, borderRadius: 14, paddingVertical: 18, alignItems: 'center', shadowColor: BRAND.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6 }}
        >
          <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: '#0A0A0B', letterSpacing: 0.5 }}>
            Begin Assessment →
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.7}
          style={{ marginTop: 16, alignItems: 'center', paddingVertical: 8 }}
        >
          <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, textDecorationLine: 'underline' }}>
            Skip for now — go to dashboard
          </Text>
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', marginTop: 6, fontSize: 11, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, opacity: 0.6, paddingHorizontal: 24 }}>
          You can complete the assessment anytime from your profile
        </Text>
      </ScrollView>
    </View>
  );
}
